# Architecture

*This is intended as a high-level overview of the structure of Glint and its fundamental design. For background on the idea, see [this writeup][matklad].*

## Overview

Glint is fundamentally a tool for mapping Glimmer templates into a corresponding TypeScript AST with semantics appropriate for type checking those templates as though they were a normal TypeScript program.

<p align="center">
<img src="https://user-images.githubusercontent.com/2403023/194098185-49d9426e-7cd8-461f-8d30-de036138be8f.png" alt="Glint flow" style="width: 400px; max-width: 100%;">
</p>

The goal is *not* to represent templates as a direct or naïve equivalent of their runtime semantics. Instead, it aims to produce a TS AST which is both *accurate* and also *useful*.

- *accurate*: Glint should never produce an incorrect diagnostic or “fix”, and it should also correctly resolve symbols (components, helpers, etc.)

- *useful*: Glint should produce diagnostics which actually make sense, and which should be actionable; and it should provide appropriate autocomplete, go-to-def, and refactoring for all the constructs which are part of a template

Both of these constraints are obvious—what tool *doesn’t* aim to be both accurate and useful?—but “useful” is the reason for many of the specific design choices in Glint’s internals. In particular, Glint uses representations which allow *preservation of parametricity* and which support *error messages which match the user’s intuition*.

- *preservation of parametricity*: this bit of formal jargon just means that we need to keep around the types of parameters, i.e. component, helper, and modifier arguments—and in particular, we need to keep around *type parameters* (generics) in ways that avoid collapsing into whatever the default TS falls back to is, usually `unknown`.

- *error messages which match the user’s intuition*: when a user invokes a component or helper, we need to make sure the resulting error message is something that makes sense, so we need to capture enough information to handle things like (for just one of a number of possible examples) Glimmer’s notion of named and positional arguments—a concept which has no *direct* translation into TypeScript.

Ultimately this transformation from a template AST to a TypeScript AST produces a TypeScript module (an extension of the base TypeScript module when there is one) which embeds in the template’s position a set of function calls representing the kind of thing emitted by each operation in the template.

This synthesized module is never persisted to disk.[^debug] Instead, it is presented to the TS compiler, either via a programmatically constructed compiler instance for command line runs or via a language server instance for code editor operations. The results from the TS check are then mapped back to the original template provide diagnostics in the correct location, and sometimes further massaged or rewritten to make them make sense in terms of templates rather than the TS representation of templates.

[^debug]: It is possible to write to disk with a debug flag, but the statement holds for all normal operations.

## Code structure

Glint is composed of the following major components:


### Config

**Role:** a library which handles interpreting Glint configuration: Which modules should be part of the transform, and how should they be interpreted? A resolved config informs the rest of Glint what the active **environment(s)** is/are as a way of answering those questions.

**Invariants:** should know nothing about the rest of the pipeline; it only needs to understand how to parse a Glint configuration and hand it off to the rest of the pipeline.

**Home:** `packages/config`

**Package name:** `@glint/config`


### Template DSL

**Role:** a set of TypeScript type definitions which Glint uses as the TypeScript representation of the constituent elements of a template: content, elements, components, expressions, `...attributes`, modifiers, and templates themselves (with or without backing class contexts).

The DSL defines three broad things:

- What it means to *emit* some template content, i.e. what the semantics of emitting `<div {{modifier}}>` are as a kind of TS function application.

- How to *resolve* some template element: When we see `{{this.foo}}`, is that a value to "emit" directly, or is it actually a no-argument function invocation? What args are required, what modifiers allowed, and what blocks available when invoking a component `<Foo>`? etc.

- A host of type definitions. Some of these are internal and used to make *emit* and *resolve* work, while others are public types, usable by consumers for authoring their apps. These definitions includes the definitions for types authors can use for writing things like partially applied components.

Note: The fact that the synthesized module is *not* persisted to disk means that some things you might expect to be useful navigation tools within the repo, like the TypeScript *Find All References* command, will not find any references to these DSL definitions.

**Invariants:**

- The core **template DSL** has no knowledge of semantics that are particular to a given environment (e.g. GlimmerX's functions-as-modifiers), nor of any built-in globals or keywords.[^dsl-invariants]
- Code emitted by the **transform** layer never directly references `@glint/template`. Rather, **environment** packages re-export the contents of `@glint/template` with tweaks or additions to the types that reflect their runtime behavior. This typically includes declaring the set of available `Globals` and defining appropriate semantics for `resolve`.

[^dsl-invariants]: It does have _definitions_ for a small number of keywords that are core to the VM, but it's still up to individual environments to expose them.

**Home:** `packages/template`

**Package name:** `@glint/template`


### Environments

**Role:** layers on top of the **template DSL** to define items available in global scope as well as per-environment definitions for what the API is for different kinds of items—basically, a type-level implementation of Glimmer/Ember’s runtime idea of “managers,” which allow a different surface API for the same underlying primitives of components, helpers, etc. A **config** specifies the **environment(s)** to use.

In addition, **environments** also influence elements of the **transform** layer's behavior, such as:

 - dictating what expressions are treated as templates
 - providing preprocessing for custom file types
 - determining how `.hbs` and `.js`/`.ts` files are related to one another

**Invariants:**

- Environments have one entrypoint for their configuration (specified by the `glint-environment` key in `package.json`), and one or more types-only entrypoints where they expose their specialized **template DSL** implementation(s).[^environments-dsl]
- An environment will typically depend on the bedrock **template DSL** as a basis for its own DSL implementation, and it might reference types from the **config** package in defining its configuration, but an environment should have no reason to ever execute code from other Glint packages.

[^environments-dsl]: I don't think any environments have multiple entrypoints today, but a hypothetical unified Ember environment in the near future would have separate DSLs for loose-mode and strict-mode templates.

**Home:** `packages/environment-*`[^env]

**Package name:** varies


### Transform

**Role:** a layer which rewrites a Glimmer template into a TypeScript module, in terms of the **template DSL**, using the **config**. This is therefore responsible for maintaining a mapping between the original source locations and the emitted locations, so that emitted diagnostics show up in the right spot in the original template. It is also the home of targeted diagnostic rewrites, which map otherwise-inscrutable TypeScript errors related to the DSL or other parts of the expansion into something useful to end users.

The result of this tranformation is the only place the DSL actually appears, which is why *Find All References* on a DSL type will generally produce no results in the codebase. The pipeline parses the Glimmer template into an AST, then emits TypeScript *as text*, merging as appropriate with any associated JS or TS.

**Invariants:** This entire layer is purely functional: it accepts the contents of a script and/or template, along with the appropriate **config**, and it returns the resulting TypeScript module and mapping information. It maintains no state and never interacts with the file system or any other part of the outside world.

**Home:** `packages/transform`

**Package name:** `@glint/transform`


### Core

**Role:** merges the **template**, **transform**, and current **environment** layers into an actual TypeScript module and invokes the TypeScript compiler. This is the home of the `glint` CLI, which runs the compiler in a batch mode, and a language server, which runs against a TypeScript server.

**Invariants:** Consumes `@glint/template` and `@glint/transform`, and is never consumed *by* them.

**Home:** `packages/core`

**Package name:** `@glint/core`


### VS Code Plugin

**Role:** an officially-maintained *client* for the **language server**.

**Home:** `packages/vscode`.

**Invariants:** Should only depend on `@glint/core`, and only indirectly: via the version supplied by the local code base.


### Visualized

This relationship looks roughly like this:

<p align="center">
<img src="https://user-images.githubusercontent.com/2403023/194120262-88db3c4c-3b85-4745-a5cc-2f9114042436.png" style="width: 600px; max-width: 100%;">
</p>

[matklad]: https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html

[^env]: Each environment is specific to a single context (“environment”) like Ember, GlimmerX, etc. Accordingly, they are likely to move *out* of the Glint monorepo in the long-term, but will remain part of the Glint ecosystem and working model.
