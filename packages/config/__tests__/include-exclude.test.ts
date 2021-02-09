import { GlintConfig } from '../src';

describe('include/exclude configuration', () => {
  const root = process.cwd();
  const environment = 'glimmerx';

  describe('defaults', () => {
    const config = new GlintConfig(root, { environment });

    test('includes all .ts files within the root', () => {
      expect(config.includesFile(`${root}/file.ts`)).toBe(true);
      expect(config.includesFile(`${root}/deeply/nested/file.ts`)).toBe(true);
    });

    test('includes all .hbs files within the root', () => {
      expect(config.includesFile(`${root}/file.hbs`)).toBe(true);
      expect(config.includesFile(`${root}/deeply/nested/file.hbs`)).toBe(true);
    });

    test('excludes files outside the root', () => {
      expect(config.includesFile(`${root}/../other.ts`)).toBe(false);
    });

    test('excludes non-.ts/.hbs files', () => {
      expect(config.includesFile(`${root}/other.txt`)).toBe(false);
    });

    test('excludes files in node_modules', () => {
      expect(config.includesFile(`${root}/node_modules/my-package/index.ts`)).toBe(false);
      expect(config.includesFile(`${root}/deeply/nested/node_modules/my-package/index.ts`)).toBe(
        false
      );
    });
  });

  describe('custom configuration', () => {
    test('include glob', () => {
      let config = new GlintConfig(root, { environment, include: 'src/**/*.txt' });
      expect(config.includesFile(`${root}/src/file.txt`)).toBe(true);
      expect(config.includesFile(`${root}/file.txt`)).toBe(false);
      expect(config.includesFile(`${root}/src/index.ts`)).toBe(false);
    });

    test('include array', () => {
      let config = new GlintConfig(root, { environment, include: ['**/*.txt', '**/*.ts'] });
      expect(config.includesFile(`${root}/hello/there.txt`)).toBe(true);
      expect(config.includesFile(`${root}/index.ts`)).toBe(true);
      expect(config.includesFile(`${root}/file.js`)).toBe(false);
    });

    test('exclude glob', () => {
      let config = new GlintConfig(root, { environment, exclude: 'dist/**/*.ts' });
      expect(config.includesFile(`${root}/dist/file.ts`)).toBe(false);
      expect(config.includesFile(`${root}/file.ts`)).toBe(true);
    });

    test('exclude array', () => {
      let config = new GlintConfig(root, {
        environment,
        exclude: ['dist/**/*.ts', 'vendor/**/*.ts'],
      });
      expect(config.includesFile(`${root}/dist/file.ts`)).toBe(false);
      expect(config.includesFile(`${root}/vendor/file.ts`)).toBe(false);
      expect(config.includesFile(`${root}/file.ts`)).toBe(true);
    });

    test('excludes override includes', () => {
      let config = new GlintConfig(root, {
        environment,
        include: 'src/**/*.ts',
        exclude: 'src/**/*.generated.ts',
      });

      expect(config.includesFile(`${root}/file.ts`)).toBe(false);
      expect(config.includesFile(`${root}/src/file.ts`)).toBe(true);
      expect(config.includesFile(`${root}/src/file.generated.ts`)).toBe(false);
    });
  });
});
