import os from 'os';
import ts from 'typescript/lib/tsserverlibrary';
import { stripIndent } from 'common-tags';
import { isAutoImportChange, rewriteAutoImportChange } from '../src/util/auto-import';

describe('auto-import utils', () => {
  describe('isAutoImportChange', () => {
    test('detects an import change', () => {
      expect(
        isAutoImportChange({
          newText: `import foo from 'bar';${os.EOL}`,
          span: { start: 0, length: 0 },
        })
      ).toBe(true);
    });

    test('skips non-import changes', () => {
      expect(
        isAutoImportChange({
          newText: 'console.log("hi");${os.EOL}',
          span: { start: 0, length: 0 },
        })
      ).toBe(false);
    });
  });

  describe('rewriteAutoImportChange', () => {
    function sourceFile(contents: TemplateStringsArray, ...rest: unknown[]): ts.SourceFile {
      return ts.createSourceFile('test.ts', stripIndent(contents, ...rest), ts.ScriptTarget.Latest);
    }

    describe('merging import clauses', () => {
      test('with no existing import', () => {
        let file = sourceFile`
        import Foo from './elsewhere';
      `;

        let change = {
          newText: `import Bar from 'bar-lib';${os.EOL}`,
          span: { start: 0, length: 0 },
        };

        expect(rewriteAutoImportChange(ts, change, file)).toBe(change);
      });

      test('with no existing import', () => {
        let file = sourceFile`
        import Foo from './elsewhere';
      `;

        let change = {
          newText: `import Bar from 'bar-lib';${os.EOL}`,
          span: { start: 0, length: 0 },
        };

        expect(rewriteAutoImportChange(ts, change, file)).toBe(change);
      });

      test('with an existing namespace import', () => {
        let file = sourceFile`
        import * as Lib from 'some-lib';
      `;

        let change = {
          newText: `import { asdf } from 'some-lib';${os.EOL}`,
          span: { start: 0, length: 0 },
        };

        expect(rewriteAutoImportChange(ts, change, file)).toBe(change);
      });

      test('merging a named import with existing named imports', () => {
        let file = sourceFile`
        import { foo, bar } from 'some-lib';

        console.log(foo, bar);
      `;

        let change = {
          newText: `import { baz } from 'some-lib';${os.EOL}`,
          span: { start: 0, length: 0 },
        };

        expect(rewriteAutoImportChange(ts, change, file)).toEqual({
          newText: `import { foo, bar, baz } from 'some-lib';`,
          span: { start: 0, length: 36 },
        });
      });

      test('merging a named import with an existing default import', () => {
        let file = sourceFile`
        import Lib from 'some-lib';

        console.log(Lib);
      `;

        let change = {
          newText: `import { baz } from 'some-lib';${os.EOL}`,
          span: { start: 0, length: 0 },
        };

        expect(rewriteAutoImportChange(ts, change, file)).toEqual({
          newText: `import Lib, { baz } from 'some-lib';`,
          span: { start: 0, length: 27 },
        });
      });

      test('merging a default import with existing named imports', () => {
        let file = sourceFile`
        import { foo, bar } from 'some-lib';

        console.log(foo, bar);
      `;

        let change = {
          newText: `import Lib from 'some-lib';${os.EOL}`,
          span: { start: 0, length: 0 },
        };

        expect(rewriteAutoImportChange(ts, change, file)).toEqual({
          newText: `import Lib, { foo, bar } from 'some-lib';`,
          span: { start: 0, length: 36 },
        });
      });
    });

    describe('formatting', () => {
      test('existing quote style is honored', () => {
        let file = sourceFile`
        import { foo, bar } from "some-lib";

        console.log(foo, bar);
      `;

        let change = {
          newText: `import Lib from 'some-lib';${os.EOL}`,
          span: { start: 0, length: 0 },
        };

        expect(rewriteAutoImportChange(ts, change, file)).toEqual({
          newText: `import Lib, { foo, bar } from "some-lib";`,
          span: { start: 0, length: 36 },
        });
      });
    });

    describe('type-only imports', () => {
      test('merging a value import into a type import', () => {
        let file = sourceFile`
          import type { foo, bar } from "some-lib";

          console.log(foo, bar);
        `;

        let change = {
          newText: `import Lib from 'some-lib';${os.EOL}`,
          span: { start: 0, length: 0 },
        };

        expect(rewriteAutoImportChange(ts, change, file)).toEqual({
          newText: `import Lib, { foo, bar } from "some-lib";`,
          span: { start: 0, length: 41 },
        });
      });

      test('merging a type import into a value import', () => {
        let file = sourceFile`
          import { foo, bar } from "some-lib";

          console.log(foo, bar);
        `;

        let change = {
          newText: `import type Lib from 'some-lib';${os.EOL}`,
          span: { start: 0, length: 0 },
        };

        expect(rewriteAutoImportChange(ts, change, file)).toEqual({
          newText: `import Lib, { foo, bar } from "some-lib";`,
          span: { start: 0, length: 36 },
        });
      });

      test('merging two type imports', () => {
        let file = sourceFile`
          import type { foo, bar } from "some-lib";

          console.log(foo, bar);
        `;

        let change = {
          newText: `import type Lib from 'some-lib';${os.EOL}`,
          span: { start: 0, length: 0 },
        };

        expect(rewriteAutoImportChange(ts, change, file)).toEqual({
          newText: `import type Lib, { foo, bar } from "some-lib";`,
          span: { start: 0, length: 41 },
        });
      });
    });
  });
});
