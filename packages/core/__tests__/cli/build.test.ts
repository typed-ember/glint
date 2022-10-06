import { existsSync, statSync, symlinkSync } from 'fs';
import * as path from 'path';

import { stripIndent } from 'common-tags';
import stripAnsi from 'strip-ansi';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import Project from '../utils/project';

const INPUT_DIR = 'src';
const INPUT_SCRIPT = path.join(INPUT_DIR, 'index.ts');
const INPUT_TEMPLATE = path.join(INPUT_DIR, 'index.hbs');

const OUT_DIR = 'dist';
const INDEX_D_TS = path.join(OUT_DIR, 'index.d.ts');

const BASE_TS_CONFIG = {
  compilerOptions: {
    strict: true,
    target: 'es2019',
    module: 'es2015',
    moduleResolution: 'node',
    skipLibCheck: true,
    allowJs: true,
    checkJs: false,
    declaration: true,
    emitDeclarationOnly: true,
    outDir: OUT_DIR,
  },
  include: [INPUT_DIR],
  glint: { environment: 'ember-template-imports' },
};

describe('CLI: single-pass build mode typechecking', () => {
  describe('simple projects using `--build`', () => {
    let project!: Project;
    beforeEach(async () => {
      project = await Project.createExact(BASE_TS_CONFIG);
    });

    afterEach(async () => {
      await project.destroy();
    });

    test('passes a valid basic project', async () => {
      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';
        import { hbs } from 'ember-template-imports';
  
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

      project.write(INPUT_SCRIPT, code);

      let checkResult = await project.build({ reject: false });

      expect(checkResult.exitCode).toBe(0);
      expect(checkResult.stdout).toEqual('');
      expect(checkResult.stderr).toEqual('');
    });

    test('rejects a basic project with a template syntax error', async () => {
      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';
        import { hbs } from 'ember-template-imports';
  
        type ApplicationArgs = {
          version: string;
        };
  
        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();
  
          public static template = hbs\`
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
            <p>Unclosed tag.
          \`;
        }
      `;

      project.write(INPUT_SCRIPT, code);

      let checkResult = await project.build({ reject: false });

      expect(checkResult.exitCode).toBe(1);
      expect(checkResult.stdout).toEqual('');
      expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
        "src/index.ts:15:5 - error TS0: Unclosed element \`p\`: 

        |
        |  <p>
        |

        (error occurred in 'an unknown module' @ line 4 : column 4)

        15     <p>Unclosed tag.
               
        "
      `);
    });

    test('rejects a basic project with a template type error', async () => {
      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';
        import { hbs } from 'ember-template-imports';
  
        type ApplicationArgs = {
          version: string;
        };

        const truncate = (length: number, s: string): string =>
          s.slice(0, length);
  
        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();
  
          public static template = hbs\`
            Welcome to app v{{@version}}.
            The current time is {{truncate this.startupTime 12}}.
          \`;
        }
      `;

      project.write(INPUT_SCRIPT, code);

      let checkResult = await project.build({ reject: false });

      expect(checkResult.exitCode).toBe(1);
      expect(checkResult.stdout).toEqual('');
      expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
        "src/index.ts:17:36 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

        17     The current time is {{truncate this.startupTime 12}}.
                                              ~~~~~~~~~~~~~~~~
        "
      `);
    });
  });

  describe('composite projects', () => {
    // The basic structure here is designed to give minimal coverage over all
    // interesting combinations of project invalidation:
    //
    // - main -> a invalidated itself
    // - main -> a invalidated via c invalidated
    // - main -> b invalidated
    // - a invalidated itself
    // - a -> c invalidated
    // - b invalidated
    // - c invalidated
    //
    // The `root` is the workspace root, while the others are packages nested
    // within the workspace. There are other possible designs, but this is the
    // most common and the one we teach.
    let projects!: {
      root: Project;
      main: Project;
      children: {
        a: Project;
        b: Project;
        c: Project;
      };
    };

    beforeEach(async () => {
      projects = await setupCompositeProject();
    });

    afterEach(async () => {
      // Invariant: this will clean up properly as long as `destroy()` continues
      // to recursively remove all directories *and* all child projects are
      // rooted in the root project.
      await projects.root.destroy();
    });

    describe('passes valid projects', () => {
      beforeEach(async () => {
        let rootCode = stripIndent`
          import Component from '@glimmer/component';
          import { hbs } from 'ember-template-imports';
          import A from '@glint-test/a';
          import B from '@glint-test/b';

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

        let aCode = stripIndent`
          import C from '@glint-test/c';
          const A = 'hello ' + C;
          export default A;
        `;

        let bCode = stripIndent`
          const B = 'ahoy';
          export default B;
        `;

        let cCode = stripIndent`
          const C = 'world';
          export default C;
        `;

        projects.main.write(INPUT_SCRIPT, rootCode);
        projects.children.a.write(INPUT_SCRIPT, aCode);
        projects.children.b.write(INPUT_SCRIPT, bCode);
        projects.children.c.write(INPUT_SCRIPT, cCode);
      });

      test('passes a valid composite project', async () => {
        let checkResult = await projects.main.build({ reject: false });

        expect(checkResult.exitCode).toBe(0);
        expect(checkResult.stdout).toEqual('');
        // expect(checkResult.stderr).toEqual('');

        expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
        expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
        expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
      });

      test('passes a valid composite subproject with a reference', async () => {
        let checkResult = await projects.children.a.build({ reject: false });

        expect(checkResult.exitCode).toBe(0);
        expect(checkResult.stdout).toEqual('');
        expect(checkResult.stderr).toEqual('');

        expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
        expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
        expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
      });

      test('passes a valid composite subproject with no references', async () => {
        let checkResult = await projects.children.b.build({ reject: false });

        expect(checkResult.exitCode).toBe(0);
        expect(checkResult.stdout).toEqual('');
        expect(checkResult.stderr).toEqual('');

        expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
        expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
        expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
      });
    });

    describe('reports diagnostics', () => {
      describe('for the root', () => {
        beforeEach(async () => {
          let aCode = stripIndent`
            import C from '@glint-test/c';
            const A = 'hello ' + C;
            export default A;
          `;

          let bCode = stripIndent`
            const B = 'ahoy';
            export default B;
          `;

          let cCode = stripIndent`
            const C = 'world';
            export default C;
          `;

          projects.children.a.write(INPUT_SCRIPT, aCode);
          projects.children.b.write(INPUT_SCRIPT, bCode);
          projects.children.c.write(INPUT_SCRIPT, cCode);
        });

        test('for invalid TS', async () => {
          let rootCode = stripIndent`
            import Component from '@glimmer/component';
            import { hbs } from 'ember-template-imports';
            import A from '@glint-test/a';
            import B from '@glint-test/b';

            let x: string = 123;
    
            type ApplicationArgs = {
              version: string;
            };
    
            export default class Application extends Component<{ Args: ApplicationArgs }> {
              private startupTime = new Date().toISOString();
    
              public static template = hbs\`
                Welcome to app v{{@version}}.
                The current time is {{this.startupTime}}.
                {{A}}, {{B}}
              \`;
            }
          `;

          projects.main.write(INPUT_SCRIPT, rootCode);

          let checkResult = await projects.main.build({ reject: false });
          expect(checkResult.exitCode).toBe(2);
          expect(checkResult.stdout).toEqual('');
          expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
            "src/index.ts:6:5 - error TS2322: Type 'number' is not assignable to type 'string'.

            6 let x: string = 123;
                  ~
            "
          `);

          expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
          expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
          expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
        });

        test('for invalid template syntax', async () => {
          let rootCode = stripIndent`
            import Component from '@glimmer/component';
            import { hbs } from 'ember-template-imports';
            import A from '@glint-test/a';
            import B from '@glint-test/b';

            type ApplicationArgs = {
              version: string;
            };

            export default class Application extends Component<{ Args: ApplicationArgs }> {
              private startupTime = new Date().toISOString();
    
              public static template = hbs\`
                Welcome to app v{{@version}}.
                The current time is {{this.startupTime}}.
                <p>Unclosed!
              \`;
            }
          `;

          projects.main.write(INPUT_SCRIPT, rootCode);

          let checkResult = await projects.main.build({ reject: false });
          expect(checkResult.exitCode).toBe(2);
          expect(checkResult.stdout).toEqual('');
          expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
            "src/index.ts:16:5 - error TS0: Unclosed element \`p\`: 

            |
            |  <p>
            |

            (error occurred in 'an unknown module' @ line 4 : column 4)

            16     <p>Unclosed!
                   
            "
          `);

          expect(existsSync(projects.main.filePath(INDEX_D_TS))).toBe(false);
          expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
          expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
          expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
        });

        test('for a template type error', async () => {
          let rootCode = stripIndent`
            import Component from '@glimmer/component';
            import { hbs } from 'ember-template-imports';
            import A from '@glint-test/a';
            import B from '@glint-test/b';

            type ApplicationArgs = {
              version: string;
            };

            const double = (n: number): number => n * 2;
    
            export default class Application extends Component<{ Args: ApplicationArgs }> {
              private startupTime = new Date().toISOString();
    
              public static template = hbs\`
                Welcome to app v{{@version}}.
                The current time is {{this.startupTime}}.
                {{double A}}
              \`;
            }
          `;

          projects.main.write(INPUT_SCRIPT, rootCode);

          let checkResult = await projects.main.build({ reject: false });
          expect(checkResult.exitCode).toBe(2);
          expect(checkResult.stdout).toEqual('');
          expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
            "src/index.ts:18:14 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

            18     {{double A}}
                            ~
            "
          `);

          expect(existsSync(projects.main.filePath(INDEX_D_TS))).toBe(false);
          expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
          expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
          expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
        });
      });

      describe('for a project with references directly referenced by the root', () => {
        beforeEach(async () => {
          let rootCode = stripIndent`
            import Component from '@glimmer/component';
            import { hbs } from 'ember-template-imports';
            import A from '@glint-test/a';
            import B from '@glint-test/b';

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

          let bCode = stripIndent`
            const B = 'ahoy';
            export default B;
          `;

          let cCode = stripIndent`
            const C = 'world';
            export default C;
          `;

          projects.main.write(INPUT_SCRIPT, rootCode);
          projects.children.b.write(INPUT_SCRIPT, bCode);
          projects.children.c.write(INPUT_SCRIPT, cCode);
        });

        describe('for invalid TS', () => {
          beforeEach(async () => {
            let aCode = stripIndent`
              import C from '@glint-test/c';
              const A = 2 * C;
              export default A;
            `;

            projects.children.a.write(INPUT_SCRIPT, aCode);
          });

          test('build from the main project', async () => {
            let checkResult = await projects.main.build({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "../a/src/index.ts:2:15 - error TS2363: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.

              2 const A = 2 * C;
                              ~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });

          test('build from the subproject', async () => {
            let checkResult = await projects.children.a.build({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "src/index.ts:2:15 - error TS2363: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.

              2 const A = 2 * C;
                              ~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });
        });

        describe('for invalid template syntax', () => {
          beforeEach(async () => {
            let aCode = stripIndent`
              import C from '@glint-test/c';
              import { hbs } from 'ember-template-imports';

              const A = hbs\`{{C}\`;
              export default A;
            `;

            projects.children.a.write(INPUT_SCRIPT, aCode);
          });

          test('build from the main project', async () => {
            let checkResult = await projects.main.build({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "../a/src/index.ts:4:17 - error TS0: Parse error on line 1:
              {{C}
              ---^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', got 'INVALID'

              4 const A = hbs\`{{C}\`;
                                ~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });

          test('build from the subproject', async () => {
            let checkResult = await projects.children.a.build({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "src/index.ts:4:17 - error TS0: Parse error on line 1:
              {{C}
              ---^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', got 'INVALID'

              4 const A = hbs\`{{C}\`;
                                ~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });
        });

        describe('for a template type error', () => {
          beforeEach(async () => {
            let aCode = stripIndent`
              import C from '@glint-test/c';
              import { hbs } from 'ember-template-imports';

              const double = (n: number): number => n * 2;
              const A = hbs\`{{double C}}\`;
              export default A;
            `;

            projects.children.a.write(INPUT_SCRIPT, aCode);
          });

          test('build from the main project', async () => {
            let checkResult = await projects.main.build({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "../a/src/index.ts:5:24 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              5 const A = hbs\`{{double C}}\`;
                                       ~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });

          test('build from the subproject', async () => {
            let checkResult = await projects.children.a.build({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "src/index.ts:5:24 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              5 const A = hbs\`{{double C}}\`;
                                       ~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });
        });
      });

      describe('for a project without references directly referenced by the root', () => {
        beforeEach(async () => {
          let rootCode = stripIndent`
            import Component from '@glimmer/component';
            import { hbs } from 'ember-template-imports';
            import A from '@glint-test/a';
            import B from '@glint-test/b';

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

          let aCode = stripIndent`
            import C from '@glint-test/c';
            const A = 'hello ' + C;
            export default A;
          `;

          let cCode = stripIndent`
            const C = 'world';
            export default C;
          `;

          projects.main.write(INPUT_SCRIPT, rootCode);
          projects.children.a.write(INPUT_SCRIPT, aCode);
          projects.children.c.write(INPUT_SCRIPT, cCode);
        });

        describe('for invalid TS', () => {
          beforeEach(async () => {
            let bCode = stripIndent`
              const B: number = 'ahoy';
              export default B;
            `;

            projects.children.b.write(INPUT_SCRIPT, bCode);
          });

          test('build from the main project', async () => {
            let checkResult = await projects.main.build({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "../b/src/index.ts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.

              1 const B: number = 'ahoy';
                      ~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });

          test('build from the subproject', async () => {
            let checkResult = await projects.children.b.build({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "src/index.ts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.

              1 const B: number = 'ahoy';
                      ~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });
        });

        describe('for invalid template syntax', () => {
          beforeEach(async () => {
            let bCode = stripIndent`
              import { hbs } from 'ember-template-imports';
              const usage = hbs\`{{123}\`;
              const B = 'ahoy';
              export default B;
            `;

            projects.children.b.write(INPUT_SCRIPT, bCode);
          });

          test('build from the main project', async () => {
            let checkResult = await projects.main.build({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "../b/src/index.ts:2:21 - error TS0: Parse error on line 1:
              {{123}
              -----^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'

              2 const usage = hbs\`{{123}\`;
                                    ~~~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });

          test('build from the subproject', async () => {
            let checkResult = await projects.children.b.build({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "src/index.ts:2:21 - error TS0: Parse error on line 1:
              {{123}
              -----^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'

              2 const usage = hbs\`{{123}\`;
                                    ~~~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });
        });

        describe('for a template type error', () => {
          beforeEach(async () => {
            let bCode = stripIndent`
              import { hbs } from 'ember-template-imports';
              const double = (n: number) => n * 2;
              const Usage = hbs\`{{double "hello"}}\`;
              const B = 'ahoy';
              export default B;
            `;

            projects.children.b.write(INPUT_SCRIPT, bCode);
          });

          test('build from the main project', async () => {
            let checkResult = await projects.main.build({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "../b/src/index.ts:3:28 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              3 const Usage = hbs\`{{double \\"hello\\"}}\`;
                                           ~~~~~~~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });

          test('build from the subproject', async () => {
            let checkResult = await projects.children.b.build({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "src/index.ts:3:28 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              3 const Usage = hbs\`{{double \\"hello\\"}}\`;
                                           ~~~~~~~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });
        });
      });

      describe('for a project transitively referenced by the root', () => {
        beforeEach(() => {
          let rootCode = stripIndent`
            import Component from '@glimmer/component';
            import { hbs } from 'ember-template-imports';
            import A from '@glint-test/a';
            import B from '@glint-test/b';

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

          let aCode = stripIndent`
            import C from '@glint-test/c';
            const A = 'hello ' + C;
            export default A;
          `;

          let bCode = stripIndent`
            const B = 'ahoy';
            export default B;
          `;

          projects.main.write(INPUT_SCRIPT, rootCode);
          projects.children.a.write(INPUT_SCRIPT, aCode);
          projects.children.b.write(INPUT_SCRIPT, bCode);
        });

        describe('for invalid TS', () => {
          beforeEach(() => {
            let cCode = stripIndent`
              const C: number = 'world';
              export default C;
            `;
            projects.children.c.write(INPUT_SCRIPT, cCode);
          });

          test('built from the main project', async () => {
            let checkResult = await projects.main.build({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "../c/src/index.ts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.

              1 const C: number = 'world';
                      ~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });

          test('built from the intermediate project', async () => {
            let checkResult = await projects.children.a.build({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "../c/src/index.ts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.

              1 const C: number = 'world';
                      ~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });

          test('built from the transitively referenced project', async () => {
            let checkResult = await projects.children.c.build({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "src/index.ts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.

              1 const C: number = 'world';
                      ~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });
        });

        describe('for invalid template syntax', () => {
          beforeEach(() => {
            let cCode = stripIndent`
              import { hbs } from 'ember-template-imports';
              const Bad = hbs\`{{123}\`;
              const C = 'world';
              export default C;
            `;

            projects.children.c.write(INPUT_SCRIPT, cCode);
          });

          test('built from the main project', async () => {
            let checkResult = await projects.main.build({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "../c/src/index.ts:2:19 - error TS0: Parse error on line 1:
              {{123}
              -----^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'

              2 const Bad = hbs\`{{123}\`;
                                  ~~~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });

          test('built from the intermediate project', async () => {
            let checkResult = await projects.children.a.build({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "../c/src/index.ts:2:19 - error TS0: Parse error on line 1:
              {{123}
              -----^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'

              2 const Bad = hbs\`{{123}\`;
                                  ~~~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });

          test('built from the transitively referenced project', async () => {
            let checkResult = await projects.children.c.build({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "src/index.ts:2:19 - error TS0: Parse error on line 1:
              {{123}
              -----^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'

              2 const Bad = hbs\`{{123}\`;
                                  ~~~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });
        });

        describe('for a template type error', () => {
          beforeEach(() => {
            let cCode = stripIndent`
              import { hbs } from 'ember-template-imports';
              const double = (n: number) => n * 2;
              const useDouble = hbs\`{{double "hello"}}\`;
              const C = 'world';
              export default C;
            `;

            projects.children.c.write(INPUT_SCRIPT, cCode);
          });

          test('built from the main project', async () => {
            let checkResult = await projects.main.build({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "../c/src/index.ts:3:32 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              3 const useDouble = hbs\`{{double \\"hello\\"}}\`;
                                               ~~~~~~~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });

          test('built from the intermediate project', async () => {
            let checkResult = await projects.children.a.build({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "../c/src/index.ts:3:32 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              3 const useDouble = hbs\`{{double \\"hello\\"}}\`;
                                               ~~~~~~~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });

          test('built from the transitively referenced project', async () => {
            let checkResult = await projects.children.c.build({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(checkResult.stdout).toEqual('');
            expect(stripAnsi(checkResult.stderr)).toMatchInlineSnapshot(`
              "src/index.ts:3:32 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              3 const useDouble = hbs\`{{double \\"hello\\"}}\`;
                                               ~~~~~~~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });
        });
      });
    });

    describe('invalidation', () => {
      describe('for the root', () => {
        test.todo('when the root is invalidated');
        test.todo('when a direct reference is invalidated');

        test.todo('when a transitive reference is invalidated');
      });

      describe('for a composite subproject with a reference', () => {
        test.todo('when the subproject is invalidated');
        test.todo('when the other subproject referenced by the subproject is invalidated');
      });

      describe('for a composite subproject with no references', () => {
        test.todo('when the subproject is invalidated');
      });
    });
  });
});

describe('CLI: --build --clean', () => {
  test('for basic projects', async () => {
    let project = await Project.createExact(BASE_TS_CONFIG);

    let code = stripIndent`
      import '@glint/environment-ember-template-imports';
      import Component from '@glimmer/component';
      import { hbs } from 'ember-template-imports';

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

    project.write(INPUT_SCRIPT, code);

    let buildResult = await project.build();
    expect(buildResult.exitCode).toBe(0);
    expect(existsSync(project.filePath(INDEX_D_TS))).toBe(true);

    let buildCleanResult = await project.build({ flags: ['--clean'] });
    expect(buildCleanResult.exitCode).toBe(0);
    expect(existsSync(project.filePath(INDEX_D_TS))).toBe(false);
  });

  test('for composite projects', async () => {
    let projects = await setupCompositeProject();

    let rootCode = stripIndent`
      import Component from '@glimmer/component';
      import { hbs } from 'ember-template-imports';
      import A from '@glint-test/a';
      import B from '@glint-test/b';

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

    let aCode = stripIndent`
      import C from '@glint-test/c';
      const A = 'hello ' + C;
      export default A;
    `;

    let bCode = stripIndent`
      const B = 'ahoy';
      export default B;
    `;

    let cCode = stripIndent`
      const C = 'world';
      export default C;
    `;

    projects.main.write(INPUT_SCRIPT, rootCode);
    projects.children.a.write(INPUT_SCRIPT, aCode);
    projects.children.b.write(INPUT_SCRIPT, bCode);
    projects.children.c.write(INPUT_SCRIPT, cCode);

    let buildResult = await projects.main.build();
    expect(buildResult.exitCode).toBe(0);
    expect(buildResult.stdout).toEqual('');
    expect(buildResult.stderr).toEqual('');
    expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
    expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
    expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);

    let buildCleanResult = await projects.main.build({ flags: ['--clean'] });
    expect(buildCleanResult.exitCode).toBe(0);
    expect(buildCleanResult.stdout).toEqual('');
    expect(buildCleanResult.stderr).toEqual('');
    expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
    expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
    expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
  });
});

describe('CLI: --build --force', () => {
  test('for basic projects', async () => {
    let project = await Project.createExact(BASE_TS_CONFIG);

    let code = stripIndent`
      import '@glint/environment-ember-template-imports';
      import Component from '@glimmer/component';
      import { hbs } from 'ember-template-imports';

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

    project.write(INPUT_SCRIPT, code);

    let buildResult = await project.build();
    expect(buildResult.exitCode).toBe(0);
    let indexDTs = project.filePath(INDEX_D_TS);
    expect(existsSync(indexDTs)).toBe(true);
    let firstStat = statSync(indexDTs);

    let buildCleanResult = await project.build({ flags: ['--force'] });
    expect(buildCleanResult.exitCode).toBe(0);
    let exists = existsSync(indexDTs);
    expect(exists).toBe(true);

    let secondStat = statSync(indexDTs);
    expect(firstStat.ctime).not.toEqual(secondStat.ctime);
  });

  test('for composite projects', async () => {
    let projects = await setupCompositeProject();

    let rootCode = stripIndent`
      import Component from '@glimmer/component';
      import { hbs } from 'ember-template-imports';
      import A from '@glint-test/a';
      import B from '@glint-test/b';

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

    let aCode = stripIndent`
      import C from '@glint-test/c';
      const A = 'hello ' + C;
      export default A;
    `;

    let bCode = stripIndent`
      const B = 'ahoy';
      export default B;
    `;

    let cCode = stripIndent`
      const C = 'world';
      export default C;
    `;

    projects.main.write(INPUT_SCRIPT, rootCode);
    projects.children.a.write(INPUT_SCRIPT, aCode);
    projects.children.b.write(INPUT_SCRIPT, bCode);
    projects.children.c.write(INPUT_SCRIPT, cCode);

    let buildResult = await projects.main.build();
    expect(buildResult.exitCode).toBe(0);
    expect(buildResult.stdout).toEqual('');
    expect(buildResult.stderr).toEqual('');
    let firstRootStat = statSync(projects.main.filePath(INDEX_D_TS));
    let firstAStat = statSync(projects.children.a.filePath(INDEX_D_TS));
    let firstBStat = statSync(projects.children.b.filePath(INDEX_D_TS));
    let firstCStat = statSync(projects.children.c.filePath(INDEX_D_TS));

    let buildCleanResult = await projects.main.build({ flags: ['--force'] });
    expect(buildCleanResult.exitCode).toBe(0);
    expect(buildCleanResult.stdout).toEqual('');
    expect(buildCleanResult.stderr).toEqual('');

    expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
    expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
    expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);

    let secondRootStat = statSync(projects.main.filePath(INDEX_D_TS));
    let secondAStat = statSync(projects.children.a.filePath(INDEX_D_TS));
    let secondBStat = statSync(projects.children.b.filePath(INDEX_D_TS));
    let secondCStat = statSync(projects.children.c.filePath(INDEX_D_TS));

    expect(firstRootStat.ctime).not.toEqual(secondRootStat.ctime);
    expect(firstAStat.ctime).not.toEqual(secondAStat.ctime);
    expect(firstBStat.ctime).not.toEqual(secondBStat.ctime);
    expect(firstCStat.ctime).not.toEqual(secondCStat.ctime);
  });
});

describe('CLI: --build --dry', () => {
  describe('for basic strict-mode projects', () => {
    let project!: Project;
    beforeEach(async () => {
      project = await Project.createExact(BASE_TS_CONFIG);

      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';
        import { hbs } from 'ember-template-imports';
  
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

      project.write(INPUT_SCRIPT, code);
    });

    test('when no build has occurred', async () => {
      let buildResult = await project.build({ flags: ['--dry'] });
      expect(buildResult.exitCode).toBe(0);
      expect(stripAnsi(buildResult.stdout)).toMatch(
        `A non-dry build would build project '${project.filePath('tsconfig.json')}'`
      );
      expect(buildResult.stderr).toEqual('');
    });

    describe('when the project has been built', () => {
      beforeEach(async () => {
        await project.build();
      });

      test('when there are no changes', async () => {
        let buildResult = await project.build({ flags: ['--dry'] });
        expect(buildResult.exitCode).toBe(0);
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `Project '${project.filePath('tsconfig.json')}' is up to date`
        );
        expect(buildResult.stderr).toEqual('');
      });

      test('when there are changes', async () => {
        let code = stripIndent`
          import '@glint/environment-ember-template-imports';
          import Component from '@glimmer/component';
          import { hbs } from 'ember-template-imports';
    
          type ApplicationArgs = {
            appVersion: string;
          };
    
          export default class Application extends Component<{ Args: ApplicationArgs }> {
            private startupTime = new Date().toISOString();
    
            public static template = hbs\`
              Welcome to app v{{@appVersion}}.
              The current time is {{this.startupTime}}.
            \`;
          }
        `;

        project.write(INPUT_SCRIPT, code);

        let buildResult = await project.build({ flags: ['--dry'] });
        expect(buildResult.exitCode).toBe(0);
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `A non-dry build would build project '${project.filePath('tsconfig.json')}'`
        );
        expect(buildResult.stderr).toEqual('');
      });
    });
  });

  describe('for basic loose mode projects', () => {
    let project!: Project;
    beforeEach(async () => {
      project = await Project.createExact({
        ...BASE_TS_CONFIG,
        glint: { environment: 'ember-loose' },
      });

      let backingClass = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';
        import { hbs } from 'ember-template-imports';
  
        type ApplicationArgs = {
          version: string;
        };
  
        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();
        }
      `;

      let template = stripIndent`
        Welcome to app v{{@version}}.
        The current time is {{this.startupTime}}.
      `;

      project.write(INPUT_SCRIPT, backingClass);
      project.write(INPUT_TEMPLATE, template);
    });

    test('when no build has occurred', async () => {
      let buildResult = await project.build({ flags: ['--dry'] });
      expect(buildResult.exitCode).toBe(0);
      expect(stripAnsi(buildResult.stdout)).toMatch(
        `A non-dry build would build project '${project.filePath('tsconfig.json')}'`
      );
      expect(buildResult.stderr).toEqual('');
    });

    describe('when the project has been built', () => {
      beforeEach(async () => {
        await project.build();
      });

      test('when there are no changes', async () => {
        let buildResult = await project.build({ flags: ['--dry'] });
        expect(buildResult.exitCode).toBe(0);
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `Project '${project.filePath('tsconfig.json')}' is up to date`
        );
        expect(buildResult.stderr).toEqual('');
      });

      test('when there are changes to the `.ts` file', async () => {
        let backingClass = stripIndent`
          import '@glint/environment-ember-template-imports';
          import Component from '@glimmer/component';
          import { hbs } from 'ember-template-imports';
    
          type ApplicationArgs = {
            version: string;
            extraInfo: string[];
          };
    
          export default class Application extends Component<{ Args: ApplicationArgs }> {
            private startupTime = new Date().toISOString();
          }
        `;
        project.write(INPUT_SCRIPT, backingClass);

        let buildResult = await project.build({ flags: ['--dry'] });
        expect(buildResult.exitCode).toBe(0);
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `A non-dry build would build project '${project.filePath('tsconfig.json')}'`
        );
        expect(buildResult.stderr).toEqual('');
      });

      test('when there are changes to the `.hbs` file', async () => {
        let template = stripIndent`
          Welcome to app v{{@appVersion}}.
          The current time is {{this.startupTime}}.
        `;

        project.write(INPUT_SCRIPT, template);

        let buildResult = await project.build({ flags: ['--dry'] });
        expect(buildResult.exitCode).toBe(0);
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `A non-dry build would build project '${project.filePath('tsconfig.json')}'`
        );
        expect(buildResult.stderr).toEqual('');
      }, 2_000_000);
    });
  });

  describe('for composite projects', () => {
    let projects!: CompositeProject;
    beforeEach(async () => {
      projects = await setupCompositeProject();

      let rootCode = stripIndent`
        import Component from '@glimmer/component';
        import { hbs } from 'ember-template-imports';
        import A from '@glint-test/a';
        import B from '@glint-test/b';

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

      let aCode = stripIndent`
        import C from '@glint-test/c';
        const A = 'hello ' + C;
        export default A;
      `;

      let bCode = stripIndent`
        const B = 'ahoy';
        export default B;
      `;

      let cCode = stripIndent`
        const C = 'world';
        export default C;
      `;

      projects.main.write(INPUT_SCRIPT, rootCode);
      projects.children.a.write(INPUT_SCRIPT, aCode);
      projects.children.b.write(INPUT_SCRIPT, bCode);
      projects.children.c.write(INPUT_SCRIPT, cCode);
    });

    test('when no build has occurred', async () => {
      let buildResult = await projects.root.build({ flags: ['--dry'] });
      expect(buildResult.exitCode).toBe(0);
      expect(stripAnsi(buildResult.stdout)).toMatch(
        `A non-dry build would build project '${projects.main.filePath('tsconfig.json')}'`
      );
      expect(stripAnsi(buildResult.stdout)).toMatch(
        `A non-dry build would build project '${projects.children.a.filePath('tsconfig.json')}'`
      );
      expect(stripAnsi(buildResult.stdout)).toMatch(
        `A non-dry build would build project '${projects.children.b.filePath('tsconfig.json')}'`
      );
      expect(stripAnsi(buildResult.stdout)).toMatch(
        `A non-dry build would build project '${projects.children.c.filePath('tsconfig.json')}'`
      );
      expect(buildResult.stderr).toEqual('');
    });

    describe('when the project has been built', () => {
      beforeEach(async () => {
        await projects.root.build();
      });

      test('and there are no changes', async () => {
        let buildResult = await projects.root.build({ flags: ['--dry'] });
        expect(buildResult.exitCode).toBe(0);
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `Project '${projects.main.filePath('tsconfig.json')}' is up to date`
        );
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `Project '${projects.children.a.filePath('tsconfig.json')}' is up to date`
        );
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `Project '${projects.children.b.filePath('tsconfig.json')}' is up to date`
        );
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `Project '${projects.children.c.filePath('tsconfig.json')}' is up to date`
        );
        expect(buildResult.stderr).toEqual('');
      });

      describe('and there are changes', () => {
        test('in a project which has changed with direct references which have not changed', async () => {
          let rootCode = stripIndent`
            import Component from '@glimmer/component';
            import { hbs } from 'ember-template-imports';
            import A from '@glint-test/a';
            import B from '@glint-test/b';

            type ApplicationArgs = {
              appVersion: string;
            };

            export default class Application extends Component<{ Args: ApplicationArgs }> {
              private startupTime = new Date().toISOString();

              public static template = hbs\`
                Welcome to app v{{@appVersion}}.
                The current time is {{this.startupTime}}.
              \`;
            }
          `;
          projects.main.write(INPUT_SCRIPT, rootCode);

          let buildResult = await projects.root.build({ flags: ['--dry'] });
          expect(buildResult.exitCode).toBe(0);
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `A non-dry build would build project '${projects.main.filePath('tsconfig.json')}'`
          );
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `Project '${projects.children.a.filePath('tsconfig.json')}' is up to date`
          );
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `Project '${projects.children.b.filePath('tsconfig.json')}' is up to date`
          );
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `Project '${projects.children.c.filePath('tsconfig.json')}' is up to date`
          );
          expect(buildResult.stderr).toEqual('');
        });

        test('in a project which is transitively referenced by a project which has not changed', async () => {
          let aCode = stripIndent`
            import C from '@glint-test/c';
            const A = 'hello there, ' + C;
            export default A;
          `;
          projects.children.a.write(INPUT_SCRIPT, aCode);

          let buildResult = await projects.root.build({ flags: ['--dry'] });
          expect(buildResult.exitCode).toBe(0);
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `A non-dry build would build project '${projects.main.filePath('tsconfig.json')}'`
          );
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `A non-dry build would build project '${projects.children.a.filePath('tsconfig.json')}'`
          );
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `Project '${projects.children.b.filePath('tsconfig.json')}' is up to date`
          );
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `Project '${projects.children.c.filePath('tsconfig.json')}' is up to date`
          );
          expect(buildResult.stderr).toEqual('');
        });
      });
    });
  });
});

type CompositeProject = {
  root: Project;
  main: Project;
  children: {
    a: Project;
    b: Project;
    c: Project;
  };
};

async function setupCompositeProject(): Promise<CompositeProject> {
  // Here, we create a `root` project which extends from a shared tsconfig,
  // which we create immediately below, as well as a local-types directory
  // which sets up the environment.
  const SHARED_TSCONFIG = 'shared.tsconfig.json';
  let root = await Project.createExact(
    {
      extends: `./${SHARED_TSCONFIG}`,
      references: [{ path: './main' }],
      files: [],
    },
    {
      private: true,
      workspaces: ['./a', './b', './c'],
    }
  );

  root.write(SHARED_TSCONFIG, JSON.stringify(BASE_TS_CONFIG, null, 2));
  root.mkdir('local-types');
  root.write('local-types/index.d.ts', 'import "@glint/environment-ember-template-imports";');

  let main = await Project.createExact(
    {
      extends: `../${SHARED_TSCONFIG}`,
      compilerOptions: { composite: true, outDir: OUT_DIR, rootDir: INPUT_DIR },
      include: ['../local-types/**/*', `${INPUT_DIR}/**/*`],
      references: [{ path: '../a' }, { path: '../b' }],
      glint: { environment: 'ember-template-imports' },
    },
    {
      name: '@glint-test/main',
      version: '1.0.0',
      types: `./${INDEX_D_TS}`,
      dependencies: {
        '@glint-test/a': 'link:../a',
        '@glint-test/b': 'link:../b',
      },
    },
    root.filePath('main')
  );

  let a = await Project.createExact(
    {
      extends: `../${SHARED_TSCONFIG}`,
      compilerOptions: { composite: true, outDir: OUT_DIR, rootDir: INPUT_DIR },
      include: ['../local-types/**/*', `${INPUT_DIR}/**/*`],
      references: [{ path: '../c' }],
      glint: { environment: 'ember-template-imports' },
    },
    {
      name: '@glint-test/a',
      version: '1.0.0',
      types: `./${INDEX_D_TS}`,
      dependencies: {
        '@glint-test/c': 'link:../c',
      },
    },
    root.filePath('a')
  );

  let b = await Project.createExact(
    {
      extends: `../${SHARED_TSCONFIG}`,
      compilerOptions: { composite: true, outDir: OUT_DIR, rootDir: INPUT_DIR },
      include: ['../local-types/**/*', `${INPUT_DIR}/**/*`],
      glint: { environment: 'ember-template-imports' },
    },
    {
      name: '@glint-test/b',
      version: '1.0.0',
      types: `./${INDEX_D_TS}`,
    },
    root.filePath('b')
  );

  let c = await Project.createExact(
    {
      extends: `../${SHARED_TSCONFIG}`,
      compilerOptions: { composite: true, outDir: OUT_DIR, rootDir: INPUT_DIR },
      include: ['../local-types/**/*', `${INPUT_DIR}/**/*`],
      glint: { environment: 'ember-template-imports' },
    },
    {
      name: '@glint-test/c',
      version: '1.0.0',
      types: `./${INDEX_D_TS}`,
    },
    root.filePath('c')
  );

  main.mkdir('node_modules/@glint-test');
  symlinkSync(a.filePath('.'), main.filePath('node_modules/@glint-test/a'));
  symlinkSync(b.filePath('.'), main.filePath('node_modules/@glint-test/b'));

  a.mkdir('node_modules/@glint-test');
  symlinkSync(c.filePath('.'), a.filePath('node_modules/@glint-test/c'));

  return { root, main, children: { a, b, c } };
}
