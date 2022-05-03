# @glint Directives

Glint has several directives that can be used in template comments to control
Glint's behavior. Additional comment text can follow directives to document
their purpose.

## @glint-ignore

The `@glint-ignore` directive tells Glint to ignore the line that follows it.
Glint will not report any errors encountered on the next line.

Example:

```hbs
<MyComponent @expectedArg="foo" />

{{! @glint-ignore: need to update signature to accept this arg }}
<MyComponent @unexpectedArg="bar" />
```

## @glint-expect-error

The `@glint-expect-error` directive operates similarly to `@glint-ignore` in
that it will not report type errors it encounters, but it will also produce an
error when an error is _not_ encountered. This is useful for tests where we
expect an invocation not to type-check (e.g. due to bad arguments) and want to
be alerted if it does.

Example:

```hbs
<MyComponent @stringArg="foo" />

{{! @glint-expect-error: let me know if this starts allowing numbers }}
<MyComponent @stringArg={{123}} />
```

## @glint-nocheck

The `@glint-noceck` directive will cause glint to not report errors for the
entire template. The template is still processed by Glint such that
auto-complete, type look-up, jump to definition, etc. are still functional,
but any type errors will be ignored.

Example:

```hbs
{{! @glint-nocheck: this whole teplate needs work }}

<MyComponent @stringArg={{123}} />

<AnotherComponent @badArg="foo" />

{{two-arg-helper "bar"}}
```
