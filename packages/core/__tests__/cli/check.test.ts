import { stripIndent } from 'common-tags';
import stripAnsi from 'strip-ansi';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import Project from '../utils/project';

describe('CLI: single-pass typechecking', () => {
  let project!: Project;
  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('passes a valid project', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        public static template = hbs\`
          Welcome to app v{{@version}}.
          The current time is {{this.startupTime}}.
        \`;
      }
    `;

    project.write('index.ts', code);

    let checkResult = await project.check();

    expect(checkResult.exitCode).toBe(0);
    expect(checkResult.stdout).toEqual('');
    expect(checkResult.stderr).toEqual('');
  });

  test('handles conditionals with yielding', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });

    let script = stripIndent`
      import Component from '@ember/component';

      export type MyComponentArgs = {
        foo?: () => {};
        bar?: string;
        baz?: { value?: string };
      };

      export default class MyComponent extends Component<{ Args: MyComponentArgs }> { }
    `;

    let template = stripIndent`
      {{#if @foo}}
        <button {{on "click" @foo}} type="button"></button>
      {{/if}}
      {{#if @bar}}
        <LinkTo @route="my-route">
          <OtherComponent @value={{@bar}} />
        </LinkTo>
      {{/if}}
      {{#if @baz.value}}
        <LinkTo @route="my-route">
          <OtherComponent @value={{@baz.value}} />
        </LinkTo>
      {{/if}}
    `;

    let otherScript = stripIndent`
      import Component from '@ember/component';

      export type OtherComponentArgs = {
        value: string;
      };

      export default class OtherComponent extends Component<{ Args: OtherComponentArgs }> { }


      declare module '@glint/environment-ember-loose/registry' {
        export default interface Registry {
          OtherComponent: typeof OtherComponent;
        }
      }
    `;

    project.write('my-component.ts', script);
    project.write('my-component.hbs', template);
    project.write('other-component.ts', otherScript);

    let checkResult = await project.check();

    expect(checkResult.exitCode).toBe(0);
    expect(checkResult.stdout).toEqual('');
    expect(checkResult.stderr).toEqual('');
  });

  test('reports diagnostics for a template syntax error', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        public static template = hbs\`
          Welcome to app v{{@version}.
          The current time is {{this.startupTime}}.
        \`;
      }
    `;

    project.write('index.ts', code);

    let checkResult = await project.check({ reject: false });

    expect(checkResult.exitCode).toBe(1);
    expect(checkResult.stdout).toEqual('');
    expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
      "index.ts:11:24 - error TS0: Parse error on line 2:
      ...e to app v{{@version}.    The current t
      -----------------------^
      Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', got 'INVALID'

      11     Welcome to app v{{@version}.
                                ~~~~~~~
      "
    `);
  });

  test('reports diagnostics for an inline template type error', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        public static template = hbs\`
          Welcome to app v{{@version}}.
          The current time is {{this.startupTimee}}.
        \`;
      }
    `;

    project.write('index.ts', code);

    let checkResult = await project.check({ reject: false });

    expect(checkResult.exitCode).toBe(1);
    expect(checkResult.stdout).toEqual('');
    expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
      "index.ts:12:32 - error TS2551: Property 'startupTimee' does not exist on type 'Application'. Did you mean 'startupTime'?

      12     The current time is {{this.startupTimee}}.
                                        ~~~~~~~~~~~~

        index.ts:8:11
          8   private startupTime = new Date().toISOString();
                      ~~~~~~~~~~~
          'startupTime' is declared here.
      "
    `);
  });

  test('reports diagnostics for a companion template type error', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });

    let script = stripIndent`
      import Component from '@ember/component';

      export type MyComponentArgs = {
        message: string;
      };

      export default class MyComponent extends Component<{ Args: MyComponentArgs }> {
        target = 'World!';
      }
    `;

    let template = stripIndent`
      {{@message}}, {{this.targett}}
    `;

    project.write('my-component.ts', script);
    project.write('my-component.hbs', template);

    let checkResult = await project.check({ reject: false });

    expect(checkResult.exitCode).toBe(1);
    expect(checkResult.stdout).toEqual('');
    expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
      "my-component.hbs:1:22 - error TS2551: Property 'targett' does not exist on type 'MyComponent'. Did you mean 'target'?

      1 {{@message}}, {{this.targett}}
                             ~~~~~~~

        my-component.ts:8:3
          8   target = 'World!';
              ~~~~~~
          'target' is declared here.
      "
    `);
  });

  test('reports diagnostics for a template-only type error', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });

    let template = stripIndent`
      {{this.someProperty}}
    `;

    project.write('my-component.hbs', template);

    let checkResult = await project.check({ reject: false });

    expect(checkResult.exitCode).toBe(1);
    expect(checkResult.stdout).toEqual('');
    expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
      "my-component.hbs:1:8 - error TS2339: Property 'someProperty' does not exist on type 'void'.

      1 {{this.someProperty}}
               ~~~~~~~~~~~~
      "
    `);
  });

  test('reports diagnostics from .gts extensions', async () => {
    project.setGlintConfig({ environment: 'ember-template-imports' });

    project.write(
      'my-component.gts',
      stripIndent`
        export let x: string = 123;
      `
    );

    let checkResult = await project.check({ reject: false });

    expect(checkResult.exitCode).toBe(1);
    expect(checkResult.stdout).toEqual('');
    expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
      "my-component.gts:1:12 - error TS2322: Type 'number' is not assignable to type 'string'.

      1 export let x: string = 123;
                   ~
      "
    `);
  });

  test('reports correct diagnostics given @glint-expect-error and @glint-ignore directives', async () => {
    project.setGlintConfig({ environment: 'ember-loose' });

    let script = stripIndent`
      import Component from '@ember/component';

      export default class MyComponent extends Component {}
    `;

    let template = stripIndent`
      {{! @glint-ignore }}
      {{@message}},

      {{! @glint-expect-error }}
      {{this.target}}

      {{! @glint-expect-error }}
      Hello.
    `;

    project.write('my-component.ts', script);
    project.write('my-component.hbs', template);

    let checkResult = await project.check({ reject: false });

    expect(checkResult.exitCode).toBe(1);
    expect(checkResult.stdout).toEqual('');
    expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
      "my-component.hbs:7:1 - error TS0: Unused '@glint-expect-error' directive.

      7 {{! @glint-expect-error }}
        ~~~~~~~~~~~~~~~~~~~~~~~~~~
      "
    `);
  });

  test('honors transform include/exclude configuration', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

      export default class Application extends Component {
        public static template = hbs\`
          {{ oh look a syntax error
        \`;
      }
    `;

    project.write('index.ts', code);
    project.setGlintConfig({ environment: 'glimmerx', transform: { exclude: ['index.ts'] } });

    let checkResult = await project.check();

    expect(checkResult.exitCode).toBe(0);
    expect(checkResult.stdout).toBe('');
    expect(checkResult.stderr).toBe('');
  });
});
