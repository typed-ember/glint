import fs from 'fs';
import os from 'os';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import {
  GlintEnvironment,
  GlintExtensionPreprocess,
  GlintExtensionTransform,
} from '../src/environment';

describe('Environments', () => {
  describe('template tags config', () => {
    test('locating a single tag', () => {
      let env = new GlintEnvironment(['test-env'], {
        tags: {
          'my-cool-environment': { hbs: { typesModule: 'whatever' } },
        },
      });

      expect(
        env.moduleMayHaveEmbeddedTemplates('foo.ts', 'import foo from "my-cool-environment"\n')
      ).toBe(true);
    });

    test('locating one of several tags', () => {
      let env = new GlintEnvironment(['test-env'], {
        tags: {
          'my-cool-environment': { hbs: { typesModule: 'whatever' } },
          'another-env': { tagMe: { typesModule: 'over-here' } },
          'and-this-one': { hbs: { typesModule: '✨' } },
        },
      });

      expect(env.moduleMayHaveEmbeddedTemplates('foo.ts', 'import foo from "another-env"\n')).toBe(
        true
      );
    });

    test('checking a module with no tags in use', () => {
      let env = new GlintEnvironment(['test-env'], {
        tags: {
          'my-cool-environment': { hbs: { typesModule: 'whatever' } },
        },
      });

      expect(
        env.moduleMayHaveEmbeddedTemplates('foo.ts', 'import { hbs } from "another-env"\n')
      ).toBe(false);
    });

    test('getting specified template tag config', () => {
      let tags = {
        '@glimmerx/component': {
          hbs: {
            typesModule: '@glint/environment-glimmerx/-private/dsl',
          },
        },
      };

      let env = new GlintEnvironment(['test-env'], { tags });

      expect(env.getConfiguredTemplateTags()).toBe(tags);
    });
  });

  describe('standalone template config', () => {
    test('no standalone template support', () => {
      let env = new GlintEnvironment(['test-env'], {});

      expect(env.getTypesForStandaloneTemplate()).toBeUndefined();
      expect(env.getPossibleScriptPaths('hello.hbs')).toEqual([]);
      expect(env.getPossibleTemplatePaths('hello.ts')).toEqual([]);
    });

    test('reflecting specified configuration', () => {
      let env = new GlintEnvironment(['test-env'], {
        template: {
          typesModule: '@glint/test-env/types',
          getPossibleTemplatePaths: (script) => [
            { path: script.replace('.ts', '.hbs'), deferTo: ['another/script.ts'] },
          ],
          getPossibleScriptPaths: (template) => [
            template.replace('.hbs', '.ts'),
            template.replace('.hbs', '.js'),
          ],
        },
      });

      expect(env.getTypesForStandaloneTemplate()).toEqual('@glint/test-env/types');
      expect(env.getPossibleTemplatePaths('hello.ts')).toEqual([
        { path: 'hello.hbs', deferTo: ['another/script.ts'] },
      ]);

      expect(env.getPossibleScriptPaths('hello.hbs')).toEqual([
        { path: 'hello.ts', deferTo: [] },
        { path: 'hello.js', deferTo: [] },
      ]);
    });
  });

  describe('extensions config', () => {
    type Data = { contents: string };
    let preprocess: GlintExtensionPreprocess<Data> = () => ({ contents: 'hi' });
    let transform: GlintExtensionTransform<Data> = () => (node) => node;
    let env = new GlintEnvironment(['test'], {
      extensions: {
        '.ts': { kind: 'typed-script' },
        '.gts': { kind: 'typed-script', preprocess, transform },
        '.hbs': { kind: 'template' },
      },
    });

    test('listing configured extensions', () => {
      expect(env.getConfiguredFileExtensions()).toEqual(['.ts', '.gts', '.hbs']);
    });

    test('identifying scripts and templates', () => {
      expect(env.isTemplate('foo.hbs')).toBeTruthy();
      expect(env.isTemplate('foo.ts')).toBeFalsy();
      expect(env.isTypedScript('foo.ts')).toBeTruthy();
      expect(env.isTypedScript('foo.gts')).toBeTruthy();
      expect(env.isTypedScript('foo.js')).toBeFalsy();
      expect(env.isUntypedScript('foo.ts')).toBeFalsy();
      expect(env.isUntypedScript('foo.hbs')).toBeFalsy();
      expect(env.isScript('foo.ts')).toBeTruthy();
      expect(env.isScript('foo.gts')).toBeTruthy();
      expect(env.isScript('foo.js')).toBeFalsy();
      expect(env.isScript('foo.hbs')).toBeFalsy();
    });

    test('fetching config for an extension', () => {
      expect(env.getConfigForExtension('.js')).toBeUndefined();
      expect(env.getConfigForExtension('.hbs')).toEqual({ kind: 'template' });
      expect(env.getConfigForExtension('.gts')).toEqual({
        kind: 'typed-script',
        preprocess,
        transform,
      });
    });
  });

  describe('loading an environment', () => {
    const testDir = `${os.tmpdir()}/glint-env-test-${process.pid}`;

    beforeEach(() => {
      fs.mkdirSync(testDir);
      fs.writeFileSync(`${testDir}/package.json`, JSON.stringify({ name: 'test-pkg' }));
    });

    afterEach(() => {
      fs.rmdirSync(testDir, { recursive: true });
    });

    test('loading an environment via @glint/environment-* shorthand', () => {
      const envDir = `${testDir}/node_modules/@glint/environment-test-env`;

      fs.mkdirSync(envDir, { recursive: true });
      fs.writeFileSync(`${envDir}/env.js`, 'module.exports = () => ({ tags: { hello: {} } });');
      fs.writeFileSync(
        `${envDir}/package.json`,
        JSON.stringify({
          name: '@glint/environment-test-env',
          'glint-environment': 'env',
        })
      );

      let env = GlintEnvironment.load('test-env', { rootDir: testDir });

      expect(env.getConfiguredTemplateTags()).toEqual({ hello: {} });
    });

    test('loading an environment from some other package', () => {
      const envDir = `${testDir}/node_modules/some-other-environment`;

      fs.mkdirSync(envDir, { recursive: true });
      fs.writeFileSync(
        `${envDir}/third-party-env.js`,
        'module.exports = () => ({ tags: { hi: {} } });'
      );
      fs.writeFileSync(
        `${envDir}/package.json`,
        JSON.stringify({
          name: 'some-other-environment',
          'glint-environment': 'third-party-env',
        })
      );

      let env = GlintEnvironment.load('some-other-environment', { rootDir: testDir });

      expect(env.getConfiguredTemplateTags()).toEqual({ hi: {} });
    });

    test('loading an environment from an explicit path', () => {
      const envDir = `${testDir}/lib`;

      fs.mkdirSync(envDir, { recursive: true });
      fs.writeFileSync(
        `${envDir}/my-internal-env.js`,
        'module.exports = () => ({ tags: { internal: {} } });'
      );

      let env = GlintEnvironment.load('./lib/my-internal-env', { rootDir: testDir });

      expect(env.getConfiguredTemplateTags()).toEqual({ internal: {} });
    });

    function createEnvironment(config: string): string {
      let name = Math.random().toString(36).slice(2);
      let dir = `${testDir}/node_modules/@glint/environment-${name}`;

      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(`${dir}/env.js`, `module.exports = ${config}`);
      fs.writeFileSync(
        `${dir}/package.json`,
        JSON.stringify({
          name: `@glint/environment-${name}`,
          'glint-environment': 'env',
        })
      );

      return name;
    }

    describe('merging multiple environments', () => {
      test('loading compatible environments', () => {
        let envA = createEnvironment('() => ({ tags: { "foo-bar": { hbs: {} } } })');
        let envB = createEnvironment(
          '() => ({ tags: { "foo-bar": { tpl: {} }, "baz": { hbs: {} } }, template: { typesModule: "foo" } })'
        );

        let env = GlintEnvironment.load([envA, envB], { rootDir: testDir });

        expect(env.getTypesForStandaloneTemplate()).toEqual('foo');
        expect(env.getConfiguredTemplateTags()).toEqual({
          'foo-bar': { hbs: {}, tpl: {} },
          baz: { hbs: {} },
        });
      });

      test('loading conflicting standalone template config', () => {
        let envA = createEnvironment('() => ({ template: { typesModule: "foo" } })');
        let envB = createEnvironment('() => ({ template: { typesModule: "bar" } })');

        expect(() => GlintEnvironment.load([envA, envB], { rootDir: testDir })).toThrow(
          'Multiple configured Glint environments attempted to define behavior for standalone template files'
        );
      });

      test('loading conflicting tags config', () => {
        let envA = createEnvironment('() => ({ tags: { foo: { hbs: {} } } })');
        let envB = createEnvironment('() => ({ tags: { foo: { hbs: {} } } })');

        expect(() => GlintEnvironment.load([envA, envB], { rootDir: testDir })).toThrow(
          "Multiple configured Glint environments attempted to define behavior for the tag `hbs` in module 'foo'"
        );
      });
    });

    describe('environment user configuration', () => {
      test('single string', () => {
        let envName = createEnvironment('cfg => ({ tags: { foo: { hbs: cfg } } })');
        let env = GlintEnvironment.load(envName, { rootDir: testDir });

        expect(env.getConfiguredTemplateTags()).toEqual({ foo: { hbs: {} } });
      });

      test('string array', () => {
        let aName = createEnvironment('cfg => ({ tags: { foo: { hbs: cfg } } })');
        let bName = createEnvironment('cfg => ({ tags: { bar: { hbs: cfg } } })');
        let env = GlintEnvironment.load([aName, bName], { rootDir: testDir });

        expect(env.getConfiguredTemplateTags()).toEqual({ foo: { hbs: {} }, bar: { hbs: {} } });
      });

      test('object with no explicit config', () => {
        let envName = createEnvironment('cfg => ({ tags: { foo: { hbs: cfg } } })');
        let env = GlintEnvironment.load({ [envName]: {} }, { rootDir: testDir });

        expect(env.getConfiguredTemplateTags()).toEqual({ foo: { hbs: {} } });
      });

      test('object with explicit config', () => {
        let envName = createEnvironment('cfg => ({ tags: { foo: { hbs: cfg } } })');
        let env = GlintEnvironment.load({ [envName]: { custom: true } }, { rootDir: testDir });

        expect(env.getConfiguredTemplateTags()).toEqual({ foo: { hbs: { custom: true } } });
      });
    });
  });
});
