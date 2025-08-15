# `@glint` Directives

Glint has several directives that can be used in template comments to control
Glint's behavior. Additional comment text can follow directives to document
their purpose. These directives correspond to the similarly-named directives
in TypeScript.

`@glint` directives may _only_ be applied in template comments, not in
TypeScript outside of templates.

## `@glint-expect-error`

The `@glint-expect-error` directive operates similarly to `@glint-ignore` in
that it will not report type errors it encounters, but it will also produce an
error when an error is _not_ encountered. This is useful for tests where we
expect an invocation not to type-check (e.g. due to bad arguments) and want to
be alerted if it does.

Example:

```hbs
<MyComponent @stringArg='foo' />

{{! @glint-expect-error: let me know if this starts allowing numbers }}
<MyComponent @stringArg={{123}} />
```

## `@glint-ignore`

The `@glint-ignore` directive tells Glint to ignore the line that follows it.
Glint will not report any errors encountered on the next line. In general,
you should prefer `@glint-expect-error` unless it is not appropriate.

Example:

```hbs
<MyComponent @expectedArg='foo' />

{{! @glint-ignore: this doesn't typecheck in TS 4.6 due to a bug, but we still test against that version in CI }}
<MyComponent @unexpectedArg='bar' />
```

## `@glint-nocheck`

The `@glint-nocheck` directive will cause glint to not report errors for the
entire template. The template is still processed by Glint such that
auto-complete, type look-up, jump to definition, etc. are still functional,
but any type errors will be ignored. This can be useful as a step in a
migration process.

Example:

```hbs
{{! @glint-nocheck: this whole template needs work }}

<MyComponent @stringArg={{123}} />

<AnotherComponent @badArg='foo' />

{{two-arg-helper 'bar'}}
```

**Note**: the [`auto-glint-nocheck`] script in the `@glint/scripts` package
can automate the process of adding `@glint-nocheck` directives at the top
of every template with type errors in your project. This allows you to adopt
Glint in a project immediately for all new templates while incrementally
migrating your existing ones to make them typesafe over time.

[`auto-glint-nocheck`]: https://github.com/typed-ember/glint/tree/main/packages/scripts#auto-glint-nocheck
