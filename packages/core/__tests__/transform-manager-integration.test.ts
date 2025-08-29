import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { Project } from 'glint-monorepo-test-utils';

describe('TransformManager Integration: .gjs/.gts declaration files', () => {
  let project!: Project;

  beforeEach(async () => {
    project = await Project.createExact({
      glint: {
        environment: 'ember-template-imports',
      },
      compilerOptions: {
        allowJs: true,
        declaration: true,
        emitDeclarationOnly: true,
      },
    });
  });

  afterEach(async () => {
    await project.destroy();
  });

  test('can find .gts.d.ts when importing .gts component as .d.ts', async () => {
    // Create a .gts component
    project.write('my-component.gts', `
      import Component from '@glimmer/component';
      
      export interface MyComponentSignature {
        Args: { title: string };
      }
      
      export default class MyComponent extends Component<MyComponentSignature> {
        <template>
          <h1>{{@title}}</h1>
        </template>
      }
    `);

    // Manually create a .gts.d.ts file (simulating what would be generated)
    project.write('my-component.gts.d.ts', `
      import Component from '@glimmer/component';
      
      export interface MyComponentSignature {
        Args: { title: string };
      }
      
      export default class MyComponent extends Component<MyComponentSignature> {}
    `);

    // Create a file that tries to import the component using .d.ts extension
    project.write('app.gts', `
      import Component from '@glimmer/component';
      import MyComponent from './my-component.d.ts';
      
      export default class App extends Component {
        <template>
          <MyComponent @title="Hello World" />
        </template>
      }
    `);

    // Run typechecking - this should succeed without errors
    let result = project.check();
    expect(await result).toMatchObject({ exitCode: 0 });
  });

  test('can find .gjs.d.ts when importing .gjs component as .d.ts', async () => {
    // Create a .gjs component
    project.write('my-component.gjs', `
      import Component from '@glimmer/component';
      
      export default class MyComponent extends Component {
        static template = hbs\`<h1>{{@title}}</h1>\`;
      }
    `);

    // Manually create a .gjs.d.ts file (simulating what would be generated)
    project.write('my-component.gjs.d.ts', `
      import Component from '@glimmer/component';
      
      export interface MyComponentSignature {
        Args: { title: string };
      }
      
      export default class MyComponent extends Component<MyComponentSignature> {}
    `);

    // Create a file that tries to import the component using .d.ts extension
    project.write('app.gts', `
      import Component from '@glimmer/component';
      import MyComponent from './my-component.d.ts';
      
      export default class App extends Component {
        <template>
          <MyComponent @title="Hello World" />
        </template>
      }
    `);

    // Run typechecking - this should succeed without errors
    let result = project.check();
    expect(await result).toMatchObject({ exitCode: 0 });
  });

  test('falls back to normal behavior when no alternative .d.ts exists', async () => {
    // Create a .gts component
    project.write('my-component.gts', `
      import Component from '@glimmer/component';
      
      export default class MyComponent extends Component {
        <template>
          <h1>{{@title}}</h1>
        </template>
      }
    `);

    // Create a regular .d.ts file (not .gts.d.ts)
    project.write('my-component.d.ts', `
      import Component from '@glimmer/component';
      
      export interface MyComponentSignature {
        Args: { title: string };
      }
      
      export default class MyComponent extends Component<MyComponentSignature> {}
    `);

    // Create a file that imports using .d.ts extension
    project.write('app.gts', `
      import Component from '@glimmer/component';
      import MyComponent from './my-component.d.ts';
      
      export default class App extends Component {
        <template>
          <MyComponent @title="Hello World" />
        </template>
      }
    `);

    // This should still work, using the regular .d.ts file
    let result = project.check();
    expect(await result).toMatchObject({ exitCode: 0 });
  });

  test('prefers .gts.d.ts over .gjs.d.ts when both exist', async () => {
    // Create both .gts and .gjs components with the same base name
    project.write('my-component.gts', `
      import Component from '@glimmer/component';
      
      export default class MyComponent extends Component {
        <template>
          <h1>GTS: {{@title}}</h1>
        </template>
      }
    `);

    project.write('my-component.gjs', `
      import Component from '@glimmer/component';
      
      export default class MyComponent extends Component {
        static template = hbs\`<h1>GJS: {{@title}}</h1>\`;
      }
    `);

    // Create both declaration files with slightly different signatures
    project.write('my-component.gts.d.ts', `
      import Component from '@glimmer/component';
      
      export interface MyComponentSignature {
        Args: { title: string; gtsSpecific?: boolean };
      }
      
      export default class MyComponent extends Component<MyComponentSignature> {}
    `);

    project.write('my-component.gjs.d.ts', `
      import Component from '@glimmer/component';
      
      export interface MyComponentSignature {
        Args: { title: string; gjsSpecific?: boolean };
      }
      
      export default class MyComponent extends Component<MyComponentSignature> {}
    `);

    // Create a file that imports using .d.ts extension and uses the gts-specific prop
    project.write('app.gts', `
      import Component from '@glimmer/component';
      import MyComponent from './my-component.d.ts';
      
      export default class App extends Component {
        <template>
          <MyComponent @title="Hello" @gtsSpecific={{true}} />
        </template>
      }
    `);

    // This should succeed if .gts.d.ts is preferred (gtsSpecific prop should be recognized)
    let result = project.check();
    expect(await result).toMatchObject({ exitCode: 0 });
  });
});
