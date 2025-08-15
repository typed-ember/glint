# Architecture

_This is intended as a high-level overview of the structure of Glint and its fundamental design. For background on the idea, see [this writeup][matklad]._

## Volar.js

As of Version 2, Glint runs atop the [Volar.js] language tooling framework, which is the same framework that drives the language tooling for Vue, angular-webstorm, MDX, and many others.

For a video introduction to how Volar.js works, please check out Johnson Chu's [ViteConf 2024 Presentation on Volar.js].

For background on how/why it was determined that Glint should be re-factored to work atop Volar.js, see Alex Matchneer's video Ember Europe presentation [The Bright Future of Ember Language Tooling](https://www.youtube.com/watch?v=6zy4nLHj83g&t=11s&ab_channel=EmberEurope).

As a brief background, in 2024, it was determined that refactoring Glint to work atop Volar.js would provide many benefits:

- By making use of Volar primitives such as `VirtualCode`s, Glint would automatically get a number of language tooling features for free that would otherwise require a custom Glint-specific implementation
  - For example, [this Glint V1 PR](https://github.com/typed-ember/glint/pull/677) to add support for auto-import completions to .gts files required a lot of time, research, and custom low-level LSP (Language Server Protocol) in order to be merged. With Volar, all you need to do is correctly express a .gts file as a `VirtualCode` and Volar's framework will provide auto-import, Go-To-Definition, and all sorts of other common desirable functionality out-of-the-box.

The rest of this document will gently introduce Volar primitives as they pertain to providing language tooling for Ember/Glimmer templates, but for a deeper understanding of Volar, please read the Volar documentation.

[Volar.js]: https://volarjs.dev/
[ViteConf 2024 Presentation on Volar.js]: https://www.youtube.com/watch?v=f7fTutifipI&ab_channel=ViteConf

## Goals + Scope of Glint

Glint is fundamentally a tool for mapping Ember/Glimmer templates into a corresponding TypeScript AST with semantics appropriate for type checking those templates as though they were a normal TypeScript program.

<p align="center">
<img src="https://user-images.githubusercontent.com/2403023/194098185-49d9426e-7cd8-461f-8d30-de036138be8f.png" alt="Glint flow" style="width: 400px; max-width: 100%;">
</p>

The goal is _not_ to represent templates as a direct or naïve equivalent of their runtime semantics. Instead, it aims to produce a TS AST which is both _accurate_ and also _useful_.

- _accurate_: Glint should never produce an incorrect diagnostic or "fix", and it should also correctly resolve symbols (components, helpers, etc.)

- _useful_: Glint should produce diagnostics which actually make sense, and which should be actionable; and it should provide appropriate autocomplete, go-to-def, and refactoring for all the constructs which are part of a template

Both of these constraints are obvious—what tool _doesn't_ aim to be both accurate and useful?—but "useful" is the reason for many of the specific design choices in Glint's internals. In particular, Glint uses representations which allow _preservation of parametricity_ and which support _error messages which match the user's intuition_.

- _preservation of parametricity_: this bit of formal jargon just means that we need to keep around the types of parameters, i.e. component, helper, and modifier arguments—and in particular, we need to keep around _type parameters_ (generics) in ways that avoid collapsing into whatever the default TS falls back to is, usually `unknown`.

- _error messages which match the user's intuition_: when a user invokes a component or helper, we need to make sure the resulting error message is something that makes sense, so we need to capture enough information to handle things like (for just one of a number of possible examples) Glimmer's notion of named and positional arguments—a concept which has no _direct_ translation into TypeScript.

## Core Primitive: Virtual Code

Volar provides a primitive called a `VirtualCode` which has one core responsibility: to parse a file or body of code of a particular language (such as a .gts file), which may include other embedded languages (e.g. a .gts file with one or more embedded `<template>` tags containing a Glimmer template), and provide a nested tree structure of `embeddedCodes` and maintain a source mapping structure between the root/source document (e.g. the .gts file) and all of the embedded codes.

Glint implements a VirtualCode to provide Language Tooling for modern Ember paradigms:

- [VirtualGtsCode](https://github.com/typed-ember/glint/blob/main/packages/core/src/volar/gts-virtual-code.ts)
  - Handles .gts and .gjs files
  - Parses them into a structure of
    - root code (untransformed .gts content)
      - embeddedCodes:
        - A singular Code containing the type-checkable TypeScript representation of the root .gts but with all `<template>` tags converted into TS
Any VirtualCode, whether implemented by Glint or Vue tooling, essentially takes a language that embeds other languages (.gts is TypeScript with embedded Glimmer, .vue has `<script>` + `<template>` + `<style>` tags, etc.) and produces a tree of embedded codes where the "leaves" of that tree are simpler, single-language codes (that don't include any other embedded languages). These single-language "leaves" can then be used as inputs for a variety of Language Services (see below), either ones already provided by Volar or custom ones implemented by Glint.

## Core Primitive: Language Service

Language Services operate on singular languages; for example, a Language Service could be used to implement code completions in HTML or provide formatting in CSS. Volar makes it possible and easy for Language Services to operate on the single-language "leaves" of your VirtualCode tree, and then, using the source maps that were built up as part of the VirtualCode implementation, reverse-source map those transformations, diagnostics, code hints, etc., back to the source file.

Volar.js maintains a number of [shared Language Plugins](https://github.com/volarjs/services/tree/master/packages) that can be consumed by many different language tooling systems (Vue, MDX, Astro, Glint, etc.). For example, while Glint uses a TS Plugin for diagnostics, there are some TS features that still require using the Volar TS LanguageService. For instance, to provide Symbols (which drive the Outline panel in VSCode, among other things), Glint uses a lightweight syntax-only TS Language Service provided by Volar.

## Glint V2 Moves Type-Checking Features out from Language Server and into TS Plugin

Glint's architectural has drawn inspiration from Vue tooling for a long time, and as such, Glint V1, Vetur (Vue's original language tooling), and Volar 1.0 were all built around the following architecture:

_(This architecture is deprecated!)_

- IDE is configured (via VSCode extension, or neovim scripts, etc) to perform the following when a .gts (or other supported file) is encountered:
  - Determine the "Project" that this file belongs to
    - The "Project" is determined by the presence of a `tsconfig.json` file
  - If a Project hasn't been initialized for this file, do so now by the following process:
    - Start up a Language Server process (e.g. via `bin/glint-language-server.js`)
      - This Language Server implements the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/)
    - The LS provides type-checking functionality for proprietary file types (like .gts) as follows:
      - Instantiate and configure a TypeScript LanguageService object provided by the TypeScript library
      - Transform the .gts file into a valid TS type-checkable in-memory file
      - Pass the transformed in-memory TS file to the TypeScript Language Service, which returns diagnostics using line/column/offsets of the transformed TS file
      - The LS will translate these line/column/offset positions via reverse source-mapping, and then sends the diagnostics to the IDE for visual display within the open file (via red squiggles, underlines, etc)
      - A similar process takes place for hovers, go-to-definition, and other functionality

The problem with this approach is that the Language Server essentially lives alongside the IDE's built-in TypeScript `tsserver` which only knows how to provide diagnostics for .ts, .js, .tsx, .jsx files, and the end user was required to choose between two non-ideal configurations:

- Takeover mode
  - Disable the default tsserver and TS Intellisense, and let Glint (or other LS) do all the TS work
  - Awkward to configure, other downsides (see doc below)
- Allow default tsserver to operate alongside Glint
  - Often this meant duplicate results in terms of Diagnostics, Go-to-Definition, and other features that end users have to sift through

For further reading on the downsides of this architecture and why the decision was made to shift the next generation of TS-based tooling to using a tsserver, read Johnson Chu's [writeup on Volar 2.0](https://gist.github.com/johnsoncodehk/62580d04cb86e576e0e8d6bf1cb44e73).

In short, Glint V2 follows along with Vue/Volar in the decision to shift type-checking and related functionality away from the Language Server and instead move it into a [TypeScript Server Plugin](https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin)

## TS Plugin Architecture

In contrast to the above Glint V1 (and old Volar / Vue / Vetur) architecture, the new Glint architecture is as follows:

- TS Plugin (`@glint/tsserver-plugin`)
  - Provides diagnostics, completions, Go-to-Definition, etc, for .gts and .gjs files
  - TS Plugin is initialized by and operates within the same `tsserver` instance created by the IDE
  - tsserver is configured to also operate upon `.gts` and `.gjs` files
    - NOTE: in VSCode, this "configuration" currently happens via a number of monkeypatches / hacks within the Glint VSCode extension; hopefully some day these will be upstreamed, but in the meantime we will just follow along with Vue.
    - See the VS Code Plugin section below for more details
  - When a .gts or .gjs file is opened in the IDE, IDE requests diagnostics and other info from `tsserver` just as it would for a vanilla .ts file.
  - Our TS Plugin overrides the `getServiceScript` hook to, instead of returning the content of the `.gts` file, return the content of the transformed/generated `.ts` used for typechecking
  - Via some [cleverness](https://github.com/volarjs/volar.js/discussions/188#discussioncomment-9569561), the diagnostic code positions are translated back to valid locations in the source .gts file and displayed properly within the IDE
  - The TS Plugin also augments and transforms the default/original set of diagnostics returned from `tsserver`'s processing of our transformed TS code
    - It does so via the same decoration/proxy pattern described [here](https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin#decorator-creation)
- Language Server (`bin/glint-language-server.js` within `@glint/core`)
  - Provides all other commands/functionality not related to type-checking
    - At the time of writing, there is practically ZERO functionality provided by the LS
    - We are keeping the LS around for the time being because:
      - it's very inexpensive to spin it up
      - it can be enhanced with future functionality unrelated to TS
      - we may merge Glint into Ember Language Server, which will be easier to do with a working Glint Language Server that is already properly architected according to the latest Volar patterns

In short, Glint V2 is composed of a super-charged TS Plugin and a nearly empty shell of a Language Server.

### VS Code Plugin

**Role:** an officially-maintained _client_ for the **language server**.

**Home:** `packages/vscode`.

**Invariants:** Should only depend on `@glint/core`, and only indirectly: via the version supplied by the local code base.

The officially-maintained VSCode Plugin provides a smooth, minimal-configuration experience for getting Glint diagnostics, go-to-def, etc, working in the VS Code IDE.

It is also crucially required for providing a seamless tooling experience now that Glint V2 works atop a TS Plugin, because:

- While TS Plugins can be manually declared / configured within tsconfig.json's `compilerOptions.plugins` array, this is insufficient for providing a streamlined VS Code experience for a number of reasons that I will try to summarize briefly:
  - Support for custom file extensions (e.g. `.gts` and `.vue`) requires monkeypatches/hacks of VS Code's default Intellisense plugin for TS
    - i.e. `vscode.typescript-language-features`
    - NOTE: this is the same extension that we used to encourage Glint V1 users to disable as part of "takeover" mode
    - Hacks include:
      - Monkey-patching [`fs.readFileSync`](https://github.com/typed-ember/glint/blob/1d0d581b1931db2514c0c8c0d96f88d933f67d8c/packages/vscode/src/extension.ts#L238) with a number of enhancements:
        - Add `.gts`/`.gjs` to the list of TS-compatible extensions (otherwise tsserver won't actually type-check our .gts files)
      - Restarting the VSCode extension first in case the VSCode Intellisense plugin has already activated by the time these hacks run, etc

Some of these are very ugly hacks, but keep in mind:

- Vue's Community is quite large and there is pressure for better support to originate from VSCode / VSCode's Intellisense plugin
- Because Glint V2 is intentionally structured to be as similar to Vue tooling as possible, it will be easy for us to follow along with their hacks

## Appendix: TypeScript Representation: Environment packages and the Template DSL

_NOTE: With the move to supporting only GTS files (Ember template imports), the concept of "environments" has been simplified. Glint now focuses solely on the template imports paradigm._

### Template DSL

**Role:** a set of TypeScript type definitions which Glint uses as the TypeScript representation of the constituent elements of a template: content, elements, components, expressions, `...attributes`, modifiers, and templates themselves (with or without backing class contexts).

The DSL defines three broad things:

- What it means to _emit_ some template content, i.e. what the semantics of emitting `<div {{modifier}}>` are as a kind of TS function application.

- How to _resolve_ some template element: When we see `{{this.foo}}`, is that a value to "emit" directly, or is it actually a no-argument function invocation? What args are required, what modifiers allowed, and what blocks available when invoking a component `<Foo>`? etc.

- A host of type definitions. Some of these are internal and used to make _emit_ and _resolve_ work, while others are public types, usable by consumers for authoring their apps. These definitions include the definitions for types authors can use for writing things like partially applied components.

Note: The fact that the synthesized module is _not_ persisted to disk means that some things you might expect to be useful navigation tools within the repo, like the TypeScript _Find All References_ command, will not find any references to these DSL definitions.

**Invariants:**

- The core **template DSL** has no knowledge of semantics that are particular to a given environment, nor of any built-in globals or keywords.[^dsl-invariants]
- Code emitted by the **transform** layer never directly references `@glint/template`. Rather, **environment** packages re-export the contents of `@glint/template` with tweaks or additions to the types that reflect their runtime behavior. This typically includes declaring the set of available `Globals` and defining appropriate semantics for `resolve`.

[^dsl-invariants]: It does have _definitions_ for a small number of keywords that are core to the VM, but it's still up to individual environments to expose them.

**Home:** `packages/template`

**Package name:** `@glint/template`

### Environments

**Role:** layers on top of the **template DSL** to define items available in global scope as well as definitions for what the API is for different kinds of items—basically, a type-level implementation of Glimmer/Ember's runtime idea of "managers," which allow a different surface API for the same underlying primitives of components, helpers, etc. A **config** specifies the **environment** to use.

The **environment** also influences elements of the **transform** layer's behavior, such as:

- dictating what expressions are treated as templates
- providing preprocessing for .gts and .gjs file types

**Invariants:**

- Environments have one entrypoint for their configuration (specified by the `"./glint-environment-definition"` export in `package.json`), and one or more types-only entrypoints where they expose their specialized **template DSL** implementation(s).[^environments-dsl]
- An environment will typically depend on the bedrock **template DSL** as a basis for its own DSL implementation, and it might reference types from the **config** package in defining its configuration, but an environment should have no reason to ever execute code from other Glint packages.

**Home:** `packages/environment-ember-template-imports`

**Package name:** varies

### Core

**Role:** merges the **template**, **transform**, and current **environment** layers into an actual TypeScript module and invokes the TypeScript compiler. This is the home of the `glint` CLI, which runs the compiler in a batch mode, and a language server, which runs against a TypeScript server.

**Invariants:** Emits code that consumes types from `@glint/template`, and is never consumed _by_ `@glint/template`.

**Home:** `packages/core`

**Package name:** `@glint/core`

#### Subcomponent: Config

**Role:** a library which handles interpreting Glint configuration: Which modules should be part of the transform, and how should they be interpreted? A resolved config informs the rest of Glint what the active **environment(s)** is/are as a way of answering those questions.

**Invariants:** should know nothing about the rest of the pipeline; it only needs to understand how to parse a Glint configuration and hand it off to the rest of the pipeline.

**Home:** `packages/core/src/config`

#### Subcomponent: Transform

**Role:** a layer which rewrites a Glimmer template into a TypeScript module, in terms of the **template DSL**, using the **config**. This is therefore responsible for maintaining a mapping between the original source locations and the emitted locations, so that emitted diagnostics show up in the right spot in the original template. It is also the home of targeted diagnostic rewrites, which map otherwise-inscrutable TypeScript errors related to the DSL or other parts of the expansion into something useful to end users.

The result of this transformation is the only place the DSL actually appears, which is why _Find All References_ on a DSL type will generally produce no results in the codebase. The pipeline parses the Glimmer template into an AST, then emits TypeScript _as text_, merging as appropriate with any associated JS or TS.

**Invariants:** This entire layer is purely functional: it accepts the contents of a script and/or template, along with the appropriate **config**, and it returns the resulting TypeScript module and mapping information. It maintains no state and never interacts with the file system or any other part of the outside world.

**Home:** `packages/core/src/transform`
