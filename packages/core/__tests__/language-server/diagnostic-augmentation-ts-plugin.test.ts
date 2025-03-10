import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';

import {
  teardownSharedTestWorkspaceAfterEach,
  requestDiagnostics,
} from 'glint-monorepo-test-utils';

describe('Language Server: Diagnostic Augmentation', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test.skip('There is a content-tag parse error (for a class component)', async () => {
    let diagnostics = await requestDiagnostics(
      'index.gts',
      'glimmer-ts',
      stripIndent`
        import Component from '@glimmer/component';

        export interface AppSignature {
          Blocks: {
            expectsTwoParams: [a: string, b: number];
            expectsAtLeastOneParam: [a: string, ...rest: Array<string>];
          }
        }

        function expectsTwoArgs(a: string, b: number) {
          console.log(a, b);
        }

        export default class App extends Component<AppSignature> {
          <template>
            {{expectsTwoArgs "one"}}
        }
      `
    );

    expect(diagnostics).toMatchInlineSnapshot();
  });

  test('expected argument count', async () => {
    let diagnostics = await requestDiagnostics(
      'index.gts',
      'glimmer-ts',
      stripIndent`
        import Component from '@glimmer/component';

        export interface AppSignature {
          Blocks: {
            expectsTwoParams: [a: string, b: number];
            expectsAtLeastOneParam: [a: string, ...rest: Array<string>];
          }
        }

        function expectsTwoArgs(a: string, b: number) {
          console.log(a, b);
        }

        function expectsAtLeastOneArg(a: string, ...rest: Array<string>) {
          console.log(a, ...rest);
        }

        export default class App extends Component<AppSignature> {
          <template>
            {{expectsTwoArgs "one"}}
            {{expectsTwoArgs "one" 2 "three"}}
            {{expectsTwoArgs "one" 2 named=true}}
            {{expectsAtLeastOneArg}}

            {{yield "one" to="expectsTwoParams"}}
            {{yield "one" 2 "three" to="expectsTwoParams"}}
            {{yield to="expectsAtLeastOneParam"}}
          </template>
        }
      `
    );

    expect(diagnostics).toMatchInlineSnapshot();
  });

  test('emit for attributes and top-level content', async () => {
    let diagnostics = await requestDiagnostics(
      'index.gts',
      'glimmer-ts',
      stripIndent`
        import Component from '@glimmer/component';

        export interface AppSignature {}

        const someRandomPOJO = {};
        const obj = { someRandomPOJO };

        export default class App extends Component<AppSignature> {
          <template>
            <div onclick={{someRandomPOJO}}></div>
            {{someRandomPOJO}}
            <div>{{someRandomPOJO}}</div>
            {{#let}}{{someRandomPOJO}}{{/let}}

            <div onclick={{obj.someRandomPOJO}}></div>
            {{obj.someRandomPOJO}}
            <div>{{obj.someRandomPOJO}}</div>
            {{#let}}{{obj.someRandomPOJO}}{{/let}}
          </template>
        }
      `
    );

    expect(diagnostics).toMatchInlineSnapshot();
  });

  test.skip('unresolved globals', async () => {
    let diagnostics = await requestDiagnostics(
      'index.hbs',
      'handlebars',
      stripIndent`
        {{! failed global lookups (custom message about the registry) }}
        <Foo />
        <foo.ok />
        {{foo.bar}}
        {{concat foo}}

        {{#let this.locals as |locals|}}
          {{! failed non-global lookup (no custom message) }}
          {{locals.bad-thing}}
        {{/let}}
      `
    );

    expect(diagnostics).toMatchInlineSnapshot();
  });

  test.skip('failed `component` name lookup', async () => {
    let diagnostics = await requestDiagnostics(
      'index.hbs',
      'handlebars',
      stripIndent`
        {{#let 'baz' as |baz|}}
          {{#let
            (component 'foo') 
            (component this.componentName)
            (component baz)
            as |Foo Bar|
          }}
            {{! @glint-ignore: we don't care about errors here}}
            <Foo /><Bar /><Baz />
          {{/let}}
        {{/let}}
      `
    );

    expect(diagnostics).toMatchInlineSnapshot();
  });

  test.skip('direct invocation of `{{component}}`', async () => {
    let diagnostics = await requestDiagnostics(
      'index.hbs',
      'handlebars',
      stripIndent`
        {{! inline invocation }}
        {{component 'my-component'}}
        {{component 'my-component' message="hi"}}

        {{! block invocation }}
        {{#component 'my-component'}}{{/component}}
        {{#component 'my-component' message="hi"}}{{/component}}
      `
    );

    expect(diagnostics).toMatchInlineSnapshot();
  });

  test('bad `component`/`helper`/`modifier` arg type', async () => {
    let diagnostics = await requestDiagnostics(
      'index.gts',
      'glimmer-ts',
      stripIndent`
        import { ComponentLike, HelperLike, ModifierLike } from '@glint/template';

        declare const Comp: ComponentLike<{ Args: { foo: string } }>;
        declare const help: HelperLike<{ Args: { Named: { foo: string } } }>;
        declare const mod: ModifierLike<{ Args: { Named: { foo: string } } }>;

        <template>
          {{#let
            (component Comp foo=123)
            (helper help foo=123)
            (modifier mod foo=123)
          }}
          {{/let}}
        </template>
      `
    );

    expect(diagnostics).toMatchInlineSnapshot();
  });

  test('`noPropertyAccessFromIndexSignature` violation', async () => {
    let diagnostics = await requestDiagnostics(
      'index.gts',
      'glimmer-ts',
      stripIndent`
        declare const stringRecord: Record<string, string>;

        stringRecord.fooBar;

        <template>
          {{stringRecord.fooBar}}          
        </template>
      `
    );

    expect(diagnostics).toMatchInlineSnapshot();
  });
});
