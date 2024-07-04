import { existsSync, statSync } from 'fs';

import { stripIndent } from 'common-tags';
import stripAnsi = require('strip-ansi');
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  Project,
  BASE_TS_CONFIG,
  CompositeProject,
  INDEX_D_TS,
  INPUT_SCRIPT,
  INPUT_SFC,
  INPUT_TEMPLATE,
  setupCompositeProject,
} from 'glint-monorepo-test-utils';

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

        type ApplicationArgs = {
          version: string;
        };

        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();

          <template>
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
          </template>
        }
      `;

      project.write(INPUT_SFC, code);

      let checkResult = await project.buildDeclaration({ reject: false });

      expect(checkResult.exitCode).toBe(0);
      expect(checkResult.stdout).toEqual('');

      // This tests that the `--emitDeclarationOnly` flag within project.buildDeclaration is working.
      expect(existsSync(project.filePath('dist/index.gts.js'))).toBe(false);
    });

    test.skip('rejects a basic project with a template syntax error', async () => {
      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';

        type ApplicationArgs = {
          version: string;
        };

        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();

          <template>
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
            <p>Unclosed tag.
          </template>
        }
      `;

      project.write(INPUT_SFC, code);

      let checkResult = await project.buildDeclaration({ reject: false });

      expect(checkResult.exitCode).toBe(1);
      expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
        "src/index.gts:14:5 - error TS0: Unclosed element \`p\`: 

        |
        |  <p>
        |

        (error occurred in 'an unknown module' @ line 4 : column 4)

        14     <p>Unclosed tag.
               
        "
      `);
    });

    test('rejects a basic project with a template type error', async () => {
      let code = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';

        type ApplicationArgs = {
          version: string;
        };

        const truncate = (length: number, s: string): string =>
          s.slice(0, length);

        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();

          <template>
            Welcome to app v{{@version}}.
            The current time is {{truncate this.startupTime 12}}.
          </template>
        }
      `;

      project.write(INPUT_SFC, code);

      let checkResult = await project.buildDeclaration({ reject: false });

      expect(checkResult.exitCode).toBe(1);
      expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
        "src/index.gts:16:36 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

        16     The current time is {{truncate this.startupTime 12}}.
                                              ~~~~~~~~~~~~~~~~


        Found 1 error.
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
          import A from '@glint-test/a';
          import B from '@glint-test/b';

          type ApplicationArgs = {
            version: string;
          };

          export default class Application extends Component<{ Args: ApplicationArgs }> {
            private startupTime = new Date().toISOString();

            <template>
              Welcome to app v{{@version}}.
              The current time is {{this.startupTime}}.
            </template>
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

        projects.main.write(INPUT_SFC, rootCode);
        projects.children.a.write(INPUT_SFC, aCode);
        projects.children.b.write(INPUT_SFC, bCode);
        projects.children.c.write(INPUT_SFC, cCode);
      });

      test('passes a valid composite project', async () => {
        let result = await projects.main.buildDeclaration({ reject: false });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');

        expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
        expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
        expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
      });

      test('passes a valid composite subproject with a reference', async () => {
        let result = await projects.children.a.buildDeclaration({ reject: false });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');

        expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
        expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
        expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
      });

      test('passes a valid composite subproject with no references', async () => {
        let result = await projects.children.b.buildDeclaration({ reject: false });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');

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

          projects.children.a.write(INPUT_SFC, aCode);
          projects.children.b.write(INPUT_SFC, bCode);
          projects.children.c.write(INPUT_SFC, cCode);
        });

        test('for invalid TS', async () => {
          let rootCode = stripIndent`
            import Component from '@glimmer/component';
            import A from '@glint-test/a';
            import B from '@glint-test/b';

            let x: string = 123;

            type ApplicationArgs = {
              version: string;
            };

            export default class Application extends Component<{ Args: ApplicationArgs }> {
              private startupTime = new Date().toISOString();

              <template>
                Welcome to app v{{@version}}.
                The current time is {{this.startupTime}}.
                {{A}}, {{B}}
              </template>
            }
          `;

          projects.main.write(INPUT_SFC, rootCode);

          let checkResult = await projects.main.buildDeclaration({ reject: false });
          expect(checkResult.exitCode).toBe(2);
          expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
            "src/index.gts:5:5 - error TS2322: Type 'number' is not assignable to type 'string'.

            5 let x: string = 123;
                  ~


            Found 1 error.
            "
          `);

          expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
          expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
          expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
        });

        test.skip('for invalid template syntax', async () => {
          let rootCode = stripIndent`
            import Component from '@glimmer/component';
            import A from '@glint-test/a';
            import B from '@glint-test/b';

            type ApplicationArgs = {
              version: string;
            };

            export default class Application extends Component<{ Args: ApplicationArgs }> {
              private startupTime = new Date().toISOString();

              <template>
                Welcome to app v{{@version}}.
                The current time is {{this.startupTime}}.
                <p>Unclosed!
              </template>
            }
          `;

          projects.main.write(INPUT_SFC, rootCode);

          let checkResult = await projects.main.buildDeclaration({ reject: false });
          expect(checkResult.exitCode).toBe(2);
          expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
            "src/index.gts:15:5 - error TS0: Unclosed element \`p\`: 

            |
            |  <p>
            |

            (error occurred in 'an unknown module' @ line 4 : column 4)

            15     <p>Unclosed!
                   
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
            import A from '@glint-test/a';
            import B from '@glint-test/b';

            type ApplicationArgs = {
              version: string;
            };

            const double = (n: number): number => n * 2;

            export default class Application extends Component<{ Args: ApplicationArgs }> {
              private startupTime = new Date().toISOString();

              <template>
                Welcome to app v{{@version}}.
                The current time is {{this.startupTime}}.
                {{double A}}
              </template>
            }
          `;

          projects.main.write(INPUT_SFC, rootCode);

          let checkResult = await projects.main.buildDeclaration({ reject: false });
          expect(checkResult.exitCode).toBe(2);
          expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
            "src/index.gts:17:14 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

            17     {{double A}}
                            ~


            Found 1 error.
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
            import A from '@glint-test/a';
            import B from '@glint-test/b';

            type ApplicationArgs = {
              version: string;
            };

            export default class Application extends Component<{ Args: ApplicationArgs }> {
              private startupTime = new Date().toISOString();

              <template>
                Welcome to app v{{@version}}.
                The current time is {{this.startupTime}}.
              </template>
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

          projects.main.write(INPUT_SFC, rootCode);
          projects.children.b.write(INPUT_SFC, bCode);
          projects.children.c.write(INPUT_SFC, cCode);
        });

        describe('for invalid TS', () => {
          beforeEach(async () => {
            let aCode = stripIndent`
              import C from '@glint-test/c';
              const A = 2 * C;
              export default A;
            `;

            projects.children.a.write(INPUT_SFC, aCode);
          });

          test('build from the main project', async () => {
            let checkResult = await projects.main.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "../a/src/index.gts:2:15 - error TS2363: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.

              2 const A = 2 * C;
                              ~


              Found 1 error.
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });

          test('build from the subproject', async () => {
            let checkResult = await projects.children.a.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "src/index.gts:2:15 - error TS2363: The right-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.

              2 const A = 2 * C;
                              ~


              Found 1 error.
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });
        });

        describe.skip('for invalid template syntax', () => {
          beforeEach(async () => {
            let aCode = stripIndent`
              import C from '@glint-test/c';

              const A = <template>{{C}</template>;
              export default A;
            `;

            projects.children.a.write(INPUT_SFC, aCode);
          });

          test('build from the main project', async () => {
            let checkResult = await projects.main.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "../a/src/index.gts:3:23 - error TS0: Parse error on line 1:
              {{C}
              ---^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', got 'INVALID'

              3 const A = <template>{{C}</template>;
                                      ~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });

          test('build from the subproject', async () => {
            let checkResult = await projects.children.a.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "src/index.gts:3:23 - error TS0: Parse error on line 1:
              {{C}
              ---^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', 'SEP', got 'INVALID'

              3 const A = <template>{{C}</template>;
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

              const double = (n: number): number => n * 2;
              const A = <template>{{double C}}</template>;
              export default A;
            `;

            projects.children.a.write(INPUT_SFC, aCode);
          });

          test('build from the main project', async () => {
            let checkResult = await projects.main.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "../a/src/index.gts:4:30 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              4 const A = <template>{{double C}}</template>;
                                             ~


              Found 1 error.
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });

          test('build from the subproject', async () => {
            let checkResult = await projects.children.a.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "src/index.gts:4:30 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              4 const A = <template>{{double C}}</template>;
                                             ~


              Found 1 error.
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });
        });

        describe.skip('for a type error covered by `@glint-nocheck`', () => {
          beforeEach(async () => {
            let aCode = stripIndent`
              import C from '@glint-test/c';

              const double = (n: number): number => n * 2;
              const A = <template>
                {{! @glint-nocheck }}
                {{double C}}
              </template>;

              export default A;
            `;

            projects.children.a.write(INPUT_SFC, aCode);
          });

          test('build from the main project', async () => {
            let checkResult = await projects.main.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(0);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`""`);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });

          test('build from the subproject', async () => {
            let checkResult = await projects.children.a.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(0);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`""`);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });
        });
      });

      describe('for a project without references directly referenced by the root', () => {
        beforeEach(async () => {
          let rootCode = stripIndent`
            import Component from '@glimmer/component';
            import A from '@glint-test/a';
            import B from '@glint-test/b';

            type ApplicationArgs = {
              version: string;
            };

            export default class Application extends Component<{ Args: ApplicationArgs }> {
              private startupTime = new Date().toISOString();

              <template>
                Welcome to app v{{@version}}.
                The current time is {{this.startupTime}}.
              </template>
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

          projects.main.write(INPUT_SFC, rootCode);
          projects.children.a.write(INPUT_SFC, aCode);
          projects.children.c.write(INPUT_SFC, cCode);
        });

        describe('for invalid TS', () => {
          beforeEach(async () => {
            let bCode = stripIndent`
              const B: number = 'ahoy';
              export default B;
            `;

            projects.children.b.write(INPUT_SFC, bCode);
          });

          test('build from the main project', async () => {
            let checkResult = await projects.main.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "../b/src/index.gts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.

              1 const B: number = 'ahoy';
                      ~


              Found 1 error.
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });

          test('build from the subproject', async () => {
            let checkResult = await projects.children.b.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "src/index.gts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.

              1 const B: number = 'ahoy';
                      ~


              Found 1 error.
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });
        });

        describe.skip('for invalid template syntax', () => {
          beforeEach(async () => {
            let bCode = stripIndent`
              const usage = <template>{{123}</template>;
              const B = 'ahoy';
              export default B;
            `;

            projects.children.b.write(INPUT_SFC, bCode);
          });

          test('build from the main project', async () => {
            let checkResult = await projects.main.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "../b/src/index.gts:1:27 - error TS0: Parse error on line 1:
              {{123}
              -----^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'

              1 const usage = <template>{{123}</template>;
                                          ~~~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });

          test('build from the subproject', async () => {
            let checkResult = await projects.children.b.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "src/index.gts:1:27 - error TS0: Parse error on line 1:
              {{123}
              -----^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'

              1 const usage = <template>{{123}</template>;
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
              const double = (n: number) => n * 2;
              const Usage = <template>{{double "hello"}}</template>;
              const B = 'ahoy';
              export default B;
            `;

            projects.children.b.write(INPUT_SFC, bCode);
          });

          test('build from the main project', async () => {
            let checkResult = await projects.main.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "../b/src/index.gts:2:34 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              2 const Usage = <template>{{double "hello"}}</template>;
                                                 ~~~~~~~


              Found 1 error.
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);
          });

          test('build from the subproject', async () => {
            let checkResult = await projects.children.b.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "src/index.gts:2:34 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              2 const Usage = <template>{{double "hello"}}</template>;
                                                 ~~~~~~~


              Found 1 error.
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
            import A from '@glint-test/a';
            import B from '@glint-test/b';

            type ApplicationArgs = {
              version: string;
            };

            export default class Application extends Component<{ Args: ApplicationArgs }> {
              private startupTime = new Date().toISOString();

              <template>
                Welcome to app v{{@version}}.
                The current time is {{this.startupTime}}.
              </template>
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

          projects.main.write(INPUT_SFC, rootCode);
          projects.children.a.write(INPUT_SFC, aCode);
          projects.children.b.write(INPUT_SFC, bCode);
        });

        describe('for invalid TS', () => {
          beforeEach(() => {
            let cCode = stripIndent`
              const C: number = 'world';
              export default C;
            `;
            projects.children.c.write(INPUT_SFC, cCode);
          });

          test('built from the main project', async () => {
            let checkResult = await projects.main.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "../c/src/index.gts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.

              1 const C: number = 'world';
                      ~


              Found 1 error.
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });

          test('built from the intermediate project', async () => {
            let checkResult = await projects.children.a.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "../c/src/index.gts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.

              1 const C: number = 'world';
                      ~


              Found 1 error.
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });

          test('built from the transitively referenced project', async () => {
            let checkResult = await projects.children.c.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "src/index.gts:1:7 - error TS2322: Type 'string' is not assignable to type 'number'.

              1 const C: number = 'world';
                      ~


              Found 1 error.
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });
        });

        describe.skip('for invalid template syntax', () => {
          beforeEach(() => {
            let cCode = stripIndent`
              const Bad = <template>{{123}</template>;
              const C = 'world';
              export default C;
            `;

            projects.children.c.write(INPUT_SFC, cCode);
          });

          test('built from the main project', async () => {
            let checkResult = await projects.main.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "../c/src/index.gts:1:25 - error TS0: Parse error on line 1:
              {{123}
              -----^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'

              1 const Bad = <template>{{123}</template>;
                                        ~~~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });

          test('built from the intermediate project', async () => {
            let checkResult = await projects.children.a.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "../c/src/index.gts:1:25 - error TS0: Parse error on line 1:
              {{123}
              -----^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'

              1 const Bad = <template>{{123}</template>;
                                        ~~~
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });

          test('built from the transitively referenced project', async () => {
            let checkResult = await projects.children.c.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "src/index.gts:1:25 - error TS0: Parse error on line 1:
              {{123}
              -----^
              Expecting 'CLOSE_RAW_BLOCK', 'CLOSE', 'CLOSE_UNESCAPED', 'OPEN_SEXPR', 'CLOSE_SEXPR', 'ID', 'OPEN_BLOCK_PARAMS', 'STRING', 'NUMBER', 'BOOLEAN', 'UNDEFINED', 'NULL', 'DATA', got 'INVALID'

              1 const Bad = <template>{{123}</template>;
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
              const double = (n: number) => n * 2;
              const useDouble = <template>{{double "hello"}}</template>;
              const C = 'world';
              export default C;
            `;

            projects.children.c.write(INPUT_SFC, cCode);
          });

          test('built from the main project', async () => {
            let checkResult = await projects.main.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(2);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "../c/src/index.gts:2:38 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              2 const useDouble = <template>{{double "hello"}}</template>;
                                                     ~~~~~~~


              Found 1 error.
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });

          test('built from the intermediate project', async () => {
            let checkResult = await projects.children.a.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "../c/src/index.gts:2:38 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              2 const useDouble = <template>{{double "hello"}}</template>;
                                                     ~~~~~~~


              Found 1 error.
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });

          test('built from the transitively referenced project', async () => {
            let checkResult = await projects.children.c.buildDeclaration({ reject: false });

            expect(checkResult.exitCode).toBe(1);
            expect(stripAnsi(checkResult.stdout)).toMatchInlineSnapshot(`
              "src/index.gts:2:38 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

              2 const useDouble = <template>{{double "hello"}}</template>;
                                                     ~~~~~~~


              Found 1 error.
              "
            `);

            expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(false);
            expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(false);
          });
        });
      });
    });
  });
});

// This can't be fixed with an upsteam (Volar or `tsc`) fix. See `run-volar-tsc.rs` for more info.
describe.skip('CLI: --build --clean', () => {
  test('for basic projects', async () => {
    let project = await Project.createExact(BASE_TS_CONFIG);

    let code = stripIndent`
      import '@glint/environment-ember-template-imports';
      import Component from '@glimmer/component';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        <template>
          Welcome to app v{{@version}}.
          The current time is {{this.startupTime}}.
        </template>
      }
    `;

    project.write(INPUT_SFC, code);

    let buildResult = await project.buildDeclaration();
    expect(buildResult.exitCode).toBe(0);
    expect(existsSync(project.filePath('dist/index.d.ts'))).toBe(true);
    // expect(existsSync(project.filePath(INDEX_D_TS))).toBe(true);

    let buildCleanResult = await project.buildClean();
    expect(buildCleanResult.exitCode).toBe(0);
    expect(existsSync(project.filePath('dist/index.d.ts'))).toBe(false);
    // expect(existsSync(project.filePath(INDEX_D_TS))).toBe(false);
  });

  test('for composite projects', async () => {
    let projects = await setupCompositeProject();

    let rootCode = stripIndent`
      import Component from '@glimmer/component';
      import A from '@glint-test/a';
      import B from '@glint-test/b';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        <template>
          Welcome to app v{{@version}}.
          The current time is {{this.startupTime}}.
        </template>
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

    projects.main.write(INPUT_SFC, rootCode);
    projects.children.a.write(INPUT_SFC, aCode);
    projects.children.b.write(INPUT_SFC, bCode);
    projects.children.c.write(INPUT_SFC, cCode);

    let buildResult = await projects.main.buildDeclaration();
    expect(buildResult.exitCode).toBe(0);
    expect(buildResult.stdout).toEqual('');
    expect(buildResult.stderr).toEqual('');
    expect(existsSync(projects.children.a.filePath(INDEX_D_TS))).toBe(true);
    expect(existsSync(projects.children.b.filePath(INDEX_D_TS))).toBe(true);
    expect(existsSync(projects.children.c.filePath(INDEX_D_TS))).toBe(true);

    let buildCleanResult = await projects.main.buildDeclaration({ flags: ['--clean'] });
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

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        <template>
          Welcome to app v{{@version}}.
          The current time is {{this.startupTime}}.
        </template>
      }
    `;

    project.write(INPUT_SFC, code);

    let buildResult = await project.buildDeclaration();
    expect(buildResult.exitCode).toBe(0);
    let indexDTs = project.filePath(INDEX_D_TS);
    expect(existsSync(indexDTs)).toBe(true);
    let firstStat = statSync(indexDTs);

    let buildCleanResult = await project.buildDeclaration({ flags: ['--force'] });
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
      import A from '@glint-test/a';
      import B from '@glint-test/b';

      type ApplicationArgs = {
        version: string;
      };

      export default class Application extends Component<{ Args: ApplicationArgs }> {
        private startupTime = new Date().toISOString();

        <template>
          Welcome to app v{{@version}}.
          The current time is {{this.startupTime}}.
        </template>
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

    projects.main.write(INPUT_SFC, rootCode);
    projects.children.a.write(INPUT_SFC, aCode);
    projects.children.b.write(INPUT_SFC, bCode);
    projects.children.c.write(INPUT_SFC, cCode);

    let buildResult = await projects.main.buildDeclaration();
    expect(buildResult.exitCode).toBe(0);
    expect(buildResult.stdout).toEqual('');
    expect(buildResult.stderr).toEqual('');
    let firstRootStat = statSync(projects.main.filePath(INDEX_D_TS));
    let firstAStat = statSync(projects.children.a.filePath(INDEX_D_TS));
    let firstBStat = statSync(projects.children.b.filePath(INDEX_D_TS));
    let firstCStat = statSync(projects.children.c.filePath(INDEX_D_TS));

    let buildCleanResult = await projects.main.buildDeclaration({ flags: ['--force'] });
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

        type ApplicationArgs = {
          version: string;
        };

        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();

          <template>
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
          </template>
        }
      `;

      project.write(INPUT_SFC, code);
    });

    test('when no build has occurred', async () => {
      let buildResult = await project.buildDeclaration({ flags: ['--dry'] });
      expect(buildResult.exitCode).toBe(0);
      expect(stripAnsi(buildResult.stdout)).toMatch(
        `A non-dry build would build project '${project.filePath('tsconfig.json')}'`,
      );
      expect(buildResult.stderr).toEqual('');
    });

    describe('when the project has been built', () => {
      beforeEach(async () => {
        await project.buildDeclaration();
      });

      test('when there are no changes', async () => {
        let buildResult = await project.buildDeclaration({ flags: ['--dry'] });
        expect(buildResult.exitCode).toBe(0);
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `Project '${project.filePath('tsconfig.json')}' is up to date`,
        );
        expect(buildResult.stderr).toEqual('');
      });

      test('when there are changes', async () => {
        let code = stripIndent`
          import '@glint/environment-ember-template-imports';
          import Component from '@glimmer/component';

          type ApplicationArgs = {
            appVersion: string;
          };

          export default class Application extends Component<{ Args: ApplicationArgs }> {
            private startupTime = new Date().toISOString();

            <template>
              Welcome to app v{{@appVersion}}.
              The current time is {{this.startupTime}}.
            </template>
          }
        `;

        project.write(INPUT_SFC, code);

        let buildResult = await project.buildDeclaration({ flags: ['--dry'] });
        expect(buildResult.exitCode).toBe(0);
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `A non-dry build would build project '${project.filePath('tsconfig.json')}'`,
        );
        expect(buildResult.stderr).toEqual('');
      });
    });
  });

  describe.skip('for basic loose mode projects', () => {
    let project!: Project;
    beforeEach(async () => {
      project = await Project.createExact({
        ...BASE_TS_CONFIG,
        glint: { environment: 'ember-loose' },
      });

      let backingClass = stripIndent`
        import '@glint/environment-ember-template-imports';
        import Component from '@glimmer/component';

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
      let buildResult = await project.buildDeclaration({ flags: ['--dry'] });
      expect(buildResult.exitCode).toBe(0);
      expect(stripAnsi(buildResult.stdout)).toMatch(
        `A non-dry build would build project '${project.filePath('tsconfig.json')}'`,
      );
      expect(buildResult.stderr).toEqual('');
    });

    describe('when the project has been built', () => {
      beforeEach(async () => {
        await project.buildDeclaration();
      });

      test('when there are no changes', async () => {
        let buildResult = await project.buildDeclaration({ flags: ['--dry'] });
        expect(buildResult.exitCode).toBe(0);
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `Project '${project.filePath('tsconfig.json')}' is up to date`,
        );
        expect(buildResult.stderr).toEqual('');
      });

      test('when there are changes to the `.ts` file', async () => {
        let backingClass = stripIndent`
          import '@glint/environment-ember-template-imports';
          import Component from '@glimmer/component';

          type ApplicationArgs = {
            version: string;
            extraInfo: string[];
          };

          export default class Application extends Component<{ Args: ApplicationArgs }> {
            private startupTime = new Date().toISOString();
          }
        `;
        project.write(INPUT_SCRIPT, backingClass);

        let buildResult = await project.buildDeclaration({ flags: ['--dry'] });
        expect(buildResult.exitCode).toBe(0);
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `A non-dry build would build project '${project.filePath('tsconfig.json')}'`,
        );
        expect(buildResult.stderr).toEqual('');
      });

      test('when there are changes to the `.hbs` file', async () => {
        let template = stripIndent`
          Welcome to app v{{@appVersion}}.
          The current time is {{this.startupTime}}.
        `;

        project.write(INPUT_TEMPLATE, template);

        let buildResult = await project.buildDeclaration({ flags: ['--dry'] });
        expect(buildResult.exitCode).toBe(0);
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `A non-dry build would build project '${project.filePath('tsconfig.json')}'`,
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
        import A from '@glint-test/a';
        import B from '@glint-test/b';

        type ApplicationArgs = {
          version: string;
        };

        export default class Application extends Component<{ Args: ApplicationArgs }> {
          private startupTime = new Date().toISOString();

          <template>
            Welcome to app v{{@version}}.
            The current time is {{this.startupTime}}.
          </template>
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

      projects.main.write(INPUT_SFC, rootCode);
      projects.children.a.write(INPUT_SFC, aCode);
      projects.children.b.write(INPUT_SFC, bCode);
      projects.children.c.write(INPUT_SFC, cCode);
    });

    test('when no build has occurred', async () => {
      let buildResult = await projects.root.buildDeclaration({ flags: ['--dry'] });
      expect(buildResult.exitCode).toBe(0);
      expect(stripAnsi(buildResult.stdout)).toMatch(
        `A non-dry build would build project '${projects.main.filePath('tsconfig.json')}'`,
      );
      expect(stripAnsi(buildResult.stdout)).toMatch(
        `A non-dry build would build project '${projects.children.a.filePath('tsconfig.json')}'`,
      );
      expect(stripAnsi(buildResult.stdout)).toMatch(
        `A non-dry build would build project '${projects.children.b.filePath('tsconfig.json')}'`,
      );
      expect(stripAnsi(buildResult.stdout)).toMatch(
        `A non-dry build would build project '${projects.children.c.filePath('tsconfig.json')}'`,
      );
      expect(buildResult.stderr).toEqual('');
    });

    describe('when the project has been built', () => {
      beforeEach(async () => {
        await projects.root.buildDeclaration();
      });

      test('and there are no changes', async () => {
        let buildResult = await projects.root.buildDeclaration({ flags: ['--dry'] });
        expect(buildResult.exitCode).toBe(0);
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `Project '${projects.main.filePath('tsconfig.json')}' is up to date`,
        );
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `Project '${projects.children.a.filePath('tsconfig.json')}' is up to date`,
        );
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `Project '${projects.children.b.filePath('tsconfig.json')}' is up to date`,
        );
        expect(stripAnsi(buildResult.stdout)).toMatch(
          `Project '${projects.children.c.filePath('tsconfig.json')}' is up to date`,
        );
        expect(buildResult.stderr).toEqual('');
      });

      describe('and there are changes', () => {
        test('in a project which has changed with direct references which have not changed', async () => {
          let rootCode = stripIndent`
            import Component from '@glimmer/component';
            import A from '@glint-test/a';
            import B from '@glint-test/b';

            type ApplicationArgs = {
              appVersion: string;
            };

            export default class Application extends Component<{ Args: ApplicationArgs }> {
              private startupTime = new Date().toISOString();

              <template>
                Welcome to app v{{@appVersion}}.
                The current time is {{this.startupTime}}.
              </template>
            }
          `;
          projects.main.write(INPUT_SFC, rootCode);

          let buildResult = await projects.root.buildDeclaration({ flags: ['--dry'] });
          expect(buildResult.exitCode).toBe(0);
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `A non-dry build would build project '${projects.main.filePath('tsconfig.json')}'`,
          );
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `Project '${projects.children.a.filePath('tsconfig.json')}' is up to date`,
          );
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `Project '${projects.children.b.filePath('tsconfig.json')}' is up to date`,
          );
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `Project '${projects.children.c.filePath('tsconfig.json')}' is up to date`,
          );
          expect(buildResult.stderr).toEqual('');
        });

        test('in a project which is transitively referenced by a project which has not changed', async () => {
          let aCode = stripIndent`
            import C from '@glint-test/c';
            const A = 'hello there, ' + C;
            export default A;
          `;
          projects.children.a.write(INPUT_SFC, aCode);

          let buildResult = await projects.root.buildDeclaration({ flags: ['--dry'] });
          expect(buildResult.exitCode).toBe(0);
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `A non-dry build would build project '${projects.main.filePath('tsconfig.json')}'`,
          );
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `A non-dry build would build project '${projects.children.a.filePath('tsconfig.json')}'`,
          );
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `Project '${projects.children.b.filePath('tsconfig.json')}' is up to date`,
          );
          expect(stripAnsi(buildResult.stdout)).toMatch(
            `Project '${projects.children.c.filePath('tsconfig.json')}' is up to date`,
          );
          expect(buildResult.stderr).toEqual('');
        });
      });
    });
  });
});
