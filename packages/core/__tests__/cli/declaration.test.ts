import { stripIndent } from 'common-tags';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { Project } from '@glint/test-utils';

describe('CLI: emitting declarations', () => {
  let project!: Project;
  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('emit for a valid project with embedded templates', async () => {
    let code = stripIndent`
      import Component, { hbs } from '@glimmerx/component';

      export interface ApplicationArgs {
        version: string;
      }

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        public static template = hbs\`
          Welcome to app v{{@version}}.
          The current time is {{this.startupTime}}.
        \`;
      }
    `;

    project.write('index.ts', code);

    let emitResult = await project.check({ flags: ['--declaration'] });

    expect(emitResult.exitCode).toBe(0);

    expect(project.read('index.d.ts')).toMatchInlineSnapshot(`
      "import Component from '@glimmerx/component';
      export interface ApplicationArgs {
          version: string;
      }
      export default class Application extends Component<{
          Args: ApplicationArgs;
      }> {
          private startupTime;
          static template: abstract new () => unknown;
      }
      "
    `);
  });

  test('emit for a valid project with standalone template files', async () => {
    let classComponentScript = stripIndent`
      import Component from '@glimmer/component';

      export interface ClassComponentSignature {
        Args: { version: string };
      }

      export default class ClassComponent extends Component<ClassComponentSignature> {
        private startupTime = new Date().toISOString();
      }
    `;

    let classComponentTemplate = stripIndent`
      Welcome to app v{{@version}}.
      The current time is {{this.startupTime}}.
    `;

    let signaturelessTemplate = stripIndent`
      {{#let "Hello" as |message|}}
        {{message}}, world!
      {{/let}}
    `;

    let templateOnlyScript = stripIndent`
      import templateOnly from '@ember/component/template-only';

      export interface TemplateOnlySignature {
        Args: { message: string };
      }

      export default templateOnly<TemplateOnlySignature>();
    `;

    let templateOnlyTemplate = stripIndent`
      {{@message}}, world!
    `;

    project.setGlintConfig({ environment: 'ember-loose' });

    project.write('class-component.ts', classComponentScript);
    project.write('class-component.hbs', classComponentTemplate);

    project.write('signatureless-component.hbs', signaturelessTemplate);

    project.write('template-only.ts', templateOnlyScript);
    project.write('template-only.hbs', templateOnlyTemplate);

    let emitResult = await project.check({ flags: ['--declaration'] });

    expect(emitResult.exitCode).toBe(0);
    expect(project.readdir().filter((file) => file.endsWith('.d.ts'))).toEqual([
      'class-component.d.ts',
      'signatureless-component.d.ts',
      'template-only.d.ts',
    ]);

    expect(project.read('class-component.d.ts')).toMatchInlineSnapshot(`
      "import Component from '@glimmer/component';
      export interface ClassComponentSignature {
          Args: {
              version: string;
          };
      }
      export default class ClassComponent extends Component<ClassComponentSignature> {
          private startupTime;
      }
      "
    `);

    expect(project.read('signatureless-component.d.ts')).toMatchInlineSnapshot(`
      "export {};
      "
    `);

    expect(project.read('template-only.d.ts')).toMatchInlineSnapshot(`
      "export interface TemplateOnlySignature {
          Args: {
              message: string;
          };
      }
      declare const _default: import(\\"@ember/component/template-only\\").TemplateOnlyComponent<TemplateOnlySignature>;
      export default _default;
      "
    `);
  });
});
