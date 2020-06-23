# glint ![CI](https://github.com/typed-ember/glint/workflows/CI/badge.svg)

This repo contains design thoughts on typing Ember templates, as well as a spike implementation of a possible approach, based on [GlimmerX](https://github.com/glimmerjs/glimmer-experimental).

It's an elaboration on the original design laid out in [this gist](https://gist.github.com/dfreeman/a5a910976e5dbed44d0649ba21aab23f).

- [Design Overview](#design-overview)
  - [Future Template Flavors](#future-template-flavors)
  - [Typechecking Templates](#typechecking-templates)
  - [Encoding Templates as TypeScript](#encoding-templates-as-typescript)
    - [Template Signatures](#template-signatures)
    - [Invoking a Component/Helper/Modifier](#invoking-a-componenthelpermodifier)
    - [Yielding to the Caller](#yielding-to-the-caller)
    - [Emitting Values](#emitting-values)
  - [Mapping Templates to TypeScript](#mapping-templates-to-typescript)
    - [The Mechanics of Translation](#the-mechanics-of-translation)
    - [Mapping Source Locations](#mapping-source-locations)
  - [CLI](#cli)
  - [Editor Support](#editor-support)
- [Caveats/To-Dos](#caveatsto-dos)
  - [Template Detection](#template-detection)
  - [Modeling Templates](#modeling-templates)
  - [Editor Support](#editor-support-1)

## Design Overview

The high-level idea here is to build a CLI/Language Server/library akin to [Vetur](https://github.com/vuejs/vetur) that can provide TS-aware checking of templates in the Ember ecosystem. It assumes the advancement of [template imports](https://github.com/emberjs/rfcs/pull/454) and [strict mode templates](https://github.com/emberjs/rfcs/pull/496).

### Future Template Flavors

First, an aside about the kind of environment this anticipates operating in. There are a couple of flavors of "how templates might look" floating around right now, either (or both, or neither) of which may eventually become the norm for Ember applications.

The first is the strawman "frontmatter" syntax mentioned in both RFCs linked above and (roughly) implemented in the [`ember-template-component-import` addon](https://github.com/knownasilya/ember-template-component-import).

```hbs
---
import { SomeComponent } from 'another-package';
---

<SomeComponent @arg={{this.message}} />
```

```ts
import Component from '@glimmer/component';

export default class MyComponent extends Component<{ target: string }> {
  private get message() {
    return `Hello, ${this.args.target}`;
  }
}
```

In this version of the world, templates remain in adjacent files to their backing components, but they gain the ability to introduce new identifiers into scope via ES-style imports in their frontmatter.

The second flavor is the SFC approach that [GlimmerX](https://github.com/glimmerjs/glimmer-experimental) is experimenting with.

```ts
import Component, { hbs } from '@glimmerx/component';
import { SomeComponent } from 'another-package';

export default class MyComponent extends Component<{ target: string }> {
  private get message() {
    return `Hello, ${this.args.target}`;
  }

  public static template = hbs`
    <SomeComponent @arg={{this.message}} />
  `;
}
```

In this flavor, templates and their backing components are defined in the same module, and templates consume JS identifiers introduced in their containing scope.

It's relatively straightforward to imagine a programmatic transformation from the first flavor into the second, and in fact that's already how [component/template colocation](https://github.com/emberjs/rfcs/pull/481) works today: the template definition is inlined into the component module at build time.

### Typechecking Templates

Fundamentally, we'd like templates to participate in TypeScript's type system. If a Glimmer component is passed an argument that isn't declared in its args, that should be a type error. If a private field on a component is referenced in its template, that field shouldn't be flagged as unused.

One way to do this without essentially reinventing the entire type system is to present templates to TypeScript _as_ TypeScript that encodes the rough semantics of the template in question. To do this, we can build a tool that sits in front of TS (`tsc` and/or `tsserver`) and presents it with that view of the world rather than one where templates are encoded in either strings or entirely separate files.

In other words, both of the example components above would be presented to TypeScript as:

```ts
import Component from '@glimmer/component';
import { SomeComponent } from 'another-package';
import { template, invokeBlock, resolve, ResolveContext } from '...';

export default class MyComponent extends Component<{ target: string }> {
  private get message() {
    return `Hello, ${this.args.target}`;
  }

  // More details about what this actually means below
  public static template = template(function* (𝚪: ResolveContext<MyComponent>) {
    yield invokeBlock(resolve(SomeComponent)({ arg: 𝚪.this.message }), {});
  });
}
```

The `@glint/template` package contains a library of types and function declarations designed to represent the approximate semantics of strict-mode templates within TypeScript's type system.

### Encoding Templates as TypeScript

There are three primary things a developer can do in a Glimmer template:

- emit a piece of static content (`<marquee>hello</marquee>`)
- emit a piece of dynamic content (`{{this.message}}`)
- invoke some other template entity (`<SomeComponent />`, `{{helper foo=123}}`)

The first is uninteresting to us for these purposes, since it's inert relative to the rest of the template and any backing TypeScript.

The second is interesting, but turns out largely to be a degenerate case of the third in the model used here, so we'll revisit it later.

The third is the bread and butter of working in a Glimmer template: helpers, modifiers and components are our units of compositionality, and they act as a bridge between the declarative, hyper-specialized DSL of the template and the imperative general-purpose programming language that backs it.

#### Template Signatures

Any "callable" value in a template, whether it's a component, helper, modifier, or a built-in primitive that doesn't fit cleanly into any one category (like `{{each}}`), is defined by its _template signature_.

At a high level, a signature looks like this:

```ts
type MySignature = (
  args: NamedArgs,
  ...positional: PositionalArgs
) => (blocks: BlockCallbacks) => CompletionType;
```

The shape of the signature for a particular entity dictates how it can be invoked: what types of args it accepts, whether it can receive blocks (and if so, what type of parameters they receive), and whether it returns a value, acts as a modifier, etc.

For instance, the `concat` helper's signature looks like:

```ts
type ConcatHelper = (args: {}, ...items: string[]) => ReturnsValue<string>;
```

And `each` looks like:

```ts
type EachHelper = <T>(
  args: { key?: string },
  items: T[]
) => AcceptsBlocks<{
  default(item: T, index: number): BlockResult;
  inverse?(): BlockResult;
}>;
```

The [`signature.d.ts` module](packages/template/-private/signature.d.ts) contains more detailed information and some utility types like `ReturnsValue` and `AcceptsBlocks` for defining template signatures.

#### Invoking a Component/Helper/Modifier

There are three steps to invoking an entity in a template:

- Determining its template signature
- Providing any named and positional args
- Invoking either inline, with blocks, or as a modifier

Suppose we have a simple component like this:

```ts
class MyComponent extends Component<{ target: string }> {
  public static template = hbs`
    {{yield (concat 'Hello, ' @target)}}
  `;
}
```

And we want to invoke it like this:

```hbs
<MyComponent @target="World" as |message|>
  {{message}}
</MyComponent>
```

The `resolve` function is responsible for taking a value (like a `Component` subclass or helper) and turning it into a function representing its signature.

```ts
const resolvedMyComponent = resolve(MyComponent);
// (args: { target: string }) => AcceptsBlocks<{ default?(arg: string): BlockResult }>
```

Once the signature is resolved, any passed named and/or positional arguments are bound by calling the signature. This fixes the values of any type parameters that might exist in the signature.

```ts
const boundMyComponent = resolvedMyComponent({ target: 'World' });
```

Finally, the resulting value is invoked according to the form it appears in in the template (in this case, with a block):

```ts
invokeBlock(boundMyComponent, {
  *default(message) {
    // ...
  },
});
```

Typically these three steps are combined into a single expression:

```ts
invokeBlock(resolve(MyComponent)({ target: 'World' }), {
  *default(message) {
    // ...
  },
});
```

#### Yielding to the Caller

One key piece of the execution model for templates is the way components may yield values to their caller, even out of blocks they themselves may have passed arbitrarily deep to their children. For instance, this component yields a string (repeatedly) to its caller:

```hbs
{{#let (array 'one' 'two' 'three') as |values|}}
  {{#each values as |value|}}
    {{yield value}}
  {{/each}}
{{/let}}
```

This is the reason template bodies and blocks are modeled as generators: they provide a natural way to capture the semantics of `{{yield}}` statements. The template above would be represented like this in TypeScript:

```ts
template(function* () {
  yield invokeBlock(resolve(BuiltIns['let'])({}, ['one', 'two', 'three']), {
    *default(values) {
      yield invokeBlock(resolve(BuiltIns['each'])({}, values), {
        *default(value) {
          yield toBlock('default', value);
        },
      });
    },
  });
});
```

The `toBlock` function returns a type capturing both the name and parameter types of the block being yielded to, and multiple yields will result in a union of such types. The `template` function then ultimately transforms that union into a "blocks hash" object type that's used in the resulting signature to determine what blocks a component with that template will accept.

The template above would therefore have this signature:

```ts
template(/* ... */): (args: unknown) => AcceptsBlocks<{ default?(arg: string): BlockResult }>
```

The type of args it expects is `unknown` because it doesn't make use of any args, though in actual usage it would be a type based on the arguments and `this` context provided by the containing class declaration.

#### Emitting Values

One ambiguity that's been glossed over so far is that of a top-level mustache statement with no arguments, e.g. `{{foo.bar}}`. This expression is syntactically ambiguous depending on the type of value it refers to: if it's a helper or component, it's an invocation of that value with no arguments. Otherwise, it's just meant to emit the given value.

To account for this, rather than using `resolve` when such a statement is seen, the `resolveOrReturn` function is used. If the value it receives doesn't have an associated template signature, it's treated as though it's a zero-arg helper that returns the appropriate type instead. This ensures that both of the following "top-level" uses will work regardless of whether the value is invokable:

```hbs
Hello, {{foo.bar}}!
```

```hbs
<MyComponent @value={{foo.bar}} />
```

### Mapping Templates to TypeScript

The `@glint/transform` package is responsible for translating a TypeScript module containing one or more embedded templates into an equivalent one with the templates defined using `@glint/template`. Its primary export is `rewriteModule`, which accepts a filename and the text of a TS module and returns both the transformed source as well as a mapping between locations in the original and transformed source.

#### The Mechanics of Translation

While doing AST to AST translation and then generating code from the result is appealingly symmetric, we want to be able to exactly map locations between the original and transformed code, and generating code from an AST would leave us without precise knowledge of where a generated node will end up.

Instead, we traverse the `@glimmer/syntax` AST for each input template and collect a buffer of strings we want to emit, building up a hierarchical mapping between locations in the original template and sequences of strings in the output.

The ultimate output of this process is a [`TransformedModule`](packages/transform/src/transformed-module.ts), which captures both the original and transformed source and a collection of `ReplacedSpan`s, which represent locations in the original source that were replaced with `@glint/template` code. Each replaced span in turn has a fine-grained source-to-source mapping tree for translating between locations in the original and transformed code.

#### Mapping Source Locations

Source-to-source location mappings are represented by a hierarchy of [`MappingTree`](packages/transform/src/mapping-tree.ts) objects. The tree-like nature of these mappings follows from the structure of the code the represent.

For instance, given an expression like `{{foo.bar}}` in a template, a corresponding expression in TypeScript might be `foo?.bar`. The individual identifiers `foo` and `bar` map directly to one another both directions, and if TypeScript reports an error with one of those, we should trivially map it to the corresponding characters in the original template.

The higher level expressions map to one another too, though. If TypeScript reports an error with the full `foo?.bar` expression, we should accordingly map that to `{{foo.bar}}` in the template.

Suppose we have the following TypeScript file:

```ts
import Component, { hbs } from '@glimmerx/component';

export default class MyComponent extends Component<{ message: string }> {
  public static template = hbs`
    The caller says, "{{@message}}".
  `;
}
```

This might map to transformed code that looks roughly like:

```ts
import Component, { hbs } from '@glimmer/component';

export default class MyComponent extends Component<{ message: string }> {
  public static template = (() => {
    let χ!: typeof import('@glint/template');
    return χ.template(function* (𝚪: import('@glint/template').ResolveContext<MyComponent>) {
      χ.invokeInline(χ.resolveOrReturn(𝚪.args.message));
    });
  })();
}
```

The `TransformedModule` for this file would have a single `ReplacedSpan` corresponding to the `hbs`-tagged string in the original source and containing the code for the IIFE in the transformed source. Its `MappingTree` would contain mappings from e.g. `@message` to `𝚪.args.message`, enabling the `TransformedModule` to answer questions about how locations within each version of the file correspond to one another within that span.

### CLI

The CLI package (`@glint/cli`) is a fairly lightweight layer that uses the [TypeScript compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API), providing a custom compiler host that intercepts reads from the filesystem to present modules to the compiler after running their source through `@glint/transform`. Similarly, diagnostics emitted by the compiler are mapped back to their corresponding location in the original source before being shown.

The CLI supports a subset of `tsc`'s functionality, currently limited to one-off and watched builds, as well as optionally emitting `.d.ts` files including template type information.

### Editor Support

The `@glint/tsserver-plugin` package provides a [Language Service Plugin](https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin) that can be added to project's `tsconfig.json` to provide editor feedback. In addition to highlighting type errors, it contains support for autocomplete, jump-to-definition and symbol renaming, and has been shown to (at least minimally) work with VS Code, Atom and Vim (via [Coc](https://github.com/neoclide/coc.nvim)). It _partially_ works in JetBrains IDEs (further details in Caveats/To-Dos below).

Integrating with editor entails some additional challenges compared to the CLI, as we can't present the editor with a different version of the source files—the editor itself is the source of truth! To handle this, the `@glint/tsserver-plugin` package maintains parallel _transformed source files_ for each TS module in the project, and resolves any imports that point to the original modules to the transformed ones instead.

For source modules with no embedded templates, these intermediary modules are essentially `export * from 'the-original'`. For source modules that _do_ have embedded templates, they instead contain the version of the file processed using `@glint/transform` to represent the template contents as TypeScript.

When the language service receives a request fo diagnostics (or definitions, references, etc) for a file with an embedded template, that request is rewritten to be made against the corresponding point in the transformed file. Similarly, results from any language service requests that reference the contents of a transformed file are updated to point to the corresponding spot in the original.

## Caveats/To-Dos

This section contains notes on things still to be explored and known limitations of the current design.

### Template Detection

While `@glint/template` contains resolution rules for working with Ember and Glimmer.js, template detection is currently hard-coded to look for the `hbs` import from `@glimmerx/component`. (And in fact, we don't even bother processing a file if it doesnt contain the string `@glimmerx/component` somewhere in its text).

Ultimately we likely need some configurable way (`.glintrc` or similar, maybe) to inform the tooling packages in this repo what tagged strings should be processed as templates.

### Modeling Templates

- It would be nice to validate modifiers are applied to a specific type of element if they require it, but that seems likely to blow out complexity (and require capturing information about `...attributes` are applied for components, which we currently have no need to model at all)

- Function types abound: in particular, templates and helpers are represented as functions, which may give users the impression those values are actually callable. Unfortunately, in order to avoid losing type parameters on the associated signatures for those entities, we can't produce any kind of type _but_ a function. I've played a bit with possible ways to make those function types less of an attractive nuisance (e.g. a required initial symbol argument), but every approach I've tried has made inference fall over in one place or another.

- `fn` is _mostly_ typeable, type parameters are lost if they're not fixed by the given inputs. I.e. if `f = <T>(v: T) => v`, then `{{fn f}}` will degrade to `(v: unknown) => unknown`. However, `{{fn f 'hello'}}` will correctly have type `() => string`.

- `component` is similarly hard to type when the input class has type params, but a bit worse because of the whole functions-in-functions nature of template signature.

  At present, values yielded to blocks whose types are dependent on a type param always degrade that param to `unknown` (or whatever the type constraint on the param is). This seems unavoidable given the way TypeScript's current "we implicitly preserve generics for you in a small number of specific cases" approach to HKT.

  It also doesn't handle pre-binding positional params, because yuck.

### Editor Support

- The current approach for implementing editor support (via a `tsserver` plugin) involves a bit more patching of TS internals than plugins are typically expected to do. The list of sins includes:

  - Patching `resolveModuleNames` on the language service host to resolve imports to our internal transformed modules instead of directly to their real-world counterparts (though [`typescript-deno-plugin`](https://github.com/justjavac/typescript-deno-plugin) does the same to make Deno's remote imports resolve)
  - Patching `ts.sys.{readFile,watchFile,fileExists}` to account for our use of transformed modules. These are hooks that the outside environment can provide to the compiler (which is exactly what we do in `@glint/cli`), but it's not exactly normal for a plugin to do that from within.
  - Patching `ts.createSourceFile` and `ts.updateSourceFile` to ensure that files are always considered to reference their transformed counterparts, so that they're included in typechecking even if that file is otherwise never imported
  - Patching `ts.server.ScriptInfo`'s `registerFileUpdate` and `editContent` methods to ensure that changes to source files (either on disk or to their in-memory contents in the editor) are also reflected in their transformed counterparts

- JetBrains IDEs don't fully rely on `tsserver` for their analysis of TS files, so the plugin's usefulness is limited. Type errors _do_ appear to be surfaced, but other diagnostics (such as whether or not a private field is used) seem to be ignored, and the editor seems unwilling to trigger completions, quickinfo, etc within a string. Tobias might have more insight here.
