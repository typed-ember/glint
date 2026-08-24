import { GlintEnvironment } from '@glint/ember-tsc/config/index';
import { rewriteModule } from '@glint/ember-tsc/transform/index';
import { rewriteModuleStandalone } from '@glint/ember-tsc/transform/standalone';
import { stripIndent } from 'common-tags';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';

const env = GlintEnvironment.load({});

// `rewriteModuleStandalone` must produce exactly what `rewriteModule` does
// for the same input; the only difference is how the script is analyzed.
function expectParity(filename: string, contents: string): void {
  let script = { filename, contents };
  let viaTypescript = rewriteModule(ts, { script }, env);
  let standalone = rewriteModuleStandalone({ script }, env);

  if (!viaTypescript || !standalone) {
    expect(standalone).toEqual(viaTypescript);
    return;
  }

  expect(standalone.transformedContents).toEqual(viaTypescript.transformedContents);
  expect(standalone.errors).toEqual(viaTypescript.errors);
  expect(standalone.directives.map(describeDirective)).toEqual(
    viaTypescript.directives.map(describeDirective),
  );
  expect(standalone.toDebugString()).toEqual(viaTypescript.toDebugString());
}

function describeDirective(directive: {
  kind: string;
  location: unknown;
  areaOfEffect: unknown;
}): unknown {
  return {
    kind: directive.kind,
    location: directive.location,
    areaOfEffect: directive.areaOfEffect,
  };
}

function collectTemplateFiles(dir: string, out: Array<string>): Array<string> {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      collectTemplateFiles(path, out);
    } else if (/\.g[jt]s$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

describe('Transform: rewriteModuleStandalone', () => {
  describe('matches rewriteModule on the test-packages corpus', () => {
    const root = resolve(__dirname, '..', '..', '..');
    const files = collectTemplateFiles(root, []).sort();

    expect(files.length).toBeGreaterThan(50);

    for (const file of files) {
      test(relative(root, file), () => {
        expectParity(file, readFileSync(file, 'utf8'));
      });
    }
  });

  describe('template placement', () => {
    test('class member, class field, nested class and arrow field', () => {
      expectParity(
        'test.gts',
        stripIndent`
          import Component from '@glimmer/component';

          export default class Outer extends Component {
            field = <template>{{this.field}}</template>;
            arrow = () => <template>{{this.arrow}}</template>;
            method() {
              class Inner extends Component {
                <template>{{this.inner}}</template>
              }
              return <template>{{this.method}}</template>;
            }
            <template><this.field /></template>
          }
        `,
      );
    });

    // ember-estree 0.7.0 builds its placeholder JS from content-tag's results
    // in content-tag order, which puts a heritage-clause template after the
    // class body template; NullVoxPopuli/ember-estree#77 sorts them. Flip to
    // `test` once that ships.
    test.fails('static block and heritage clause', () => {
      expectParity(
        'test.gts',
        stripIndent`
          import Component from '@glimmer/component';

          const mixin = (base: typeof Component, template: unknown): typeof Component => base;

          export class WithStatic extends Component {
            static {
              const x = <template>{{this.static}}</template>;
              x;
            }
          }

          export class WithHeritage extends mixin(Component, <template>{{this.heritage}}</template>) {
            <template>{{this.own}}</template>
          }
        `,
      );
    });

    test('class headers with braces in type arguments and decorators', () => {
      expectParity(
        'test.gts',
        stripIndent`
          import Component from '@glimmer/component';

          function dec(_opts: { a: number }) {
            return (target: unknown) => target;
          }

          @dec({ a: 1 })
          export default class Generic<T extends { id: string } = { id: string }> extends Component<{
            Args: { items: Array<T> };
          }> {
            key = 'class';
            <template>{{@items.length}}</template>
          }

          const record = { class: 'x', kind: 'class' };
          record.class;
        `,
      );
    });

    test('implicit default export, satisfies, and operand positions', () => {
      expectParity(
        'test.gts',
        stripIndent`
          import type { TOC } from '@ember/component/template-only';

          const A = <template>a</template>;
          const list = [<template>b</template>, <template>c</template>];
          const fn = () => <template>d</template>;
          fn(<template>e</template>);
          export const S = <template>f</template> satisfies TOC<{}>;

          <template>{{A}}{{list}}</template> satisfies TOC<{}>;
        `,
      );
    });

    // ember-estree 0.7.0's bare-backtick placeholder reads as a tagged
    // template after `x`; NullVoxPopuli/ember-estree#78 switches it to
    // `void `...``. Flip to `test` once that ships.
    test.fails('templates after statements that rely on automatic semicolon insertion', () => {
      expectParity(
        'test.gts',
        stripIndent`
          const x = 1
          const y = x
          <template>{{x}}</template>
        `,
      );
    });

    test('strings, comments, regexes and template literals containing confusing tokens', () => {
      expectParity(
        'test.gts',
        stripIndent`
          import Component from '@glimmer/component';

          const s = "class { <template>";
          const t = 'import { on } from "@ember/modifier"';
          const r = /class\\s+{/g;
          const tl = \`\${'class'} { \${(() => { return 1; })()} } \\\` \`;
          // class {
          /* import { on } from '@ember/modifier' */

          export default class Real extends Component {
            <template>{{on}} {{s}} {{t}} {{r}} {{tl}}</template>
          }
        `,
      );
    });

    test('gjs uses JSDoc emit', () => {
      expectParity(
        'test.gjs',
        stripIndent`
          import Component from '@glimmer/component';

          export default class Foo extends Component {
            <template>{{@bar}}</template>
          }

          <template>{{this}}</template>
        `,
      );
    });
  });

  describe('parse errors', () => {
    test('content-tag parse error', () => {
      expectParity(
        'test.gts',
        stripIndent`
          import Component from '@glimmer/component';

          export default class Broken extends Component {
            <template>
              <div></div>
            </template
          }
        `,
      );
    });

    test('handlebars parse error', () => {
      expectParity(
        'test.gts',
        stripIndent`
          export default <template>
            {{#if}}
          </template>;
        `,
      );
    });

    test('script syntax error still emits the template', () => {
      // oxc-parser yields an empty program on an unrecoverable script error
      // (TypeScript's parser is more tolerant), so import bindings and
      // template placement are unavailable: content-tag still classifies the
      // class member, and `fn` is emitted as a bare identifier, which
      // resolves lexically to the import. The syntax error itself is
      // reported by whichever type-checker consumes the output.
      let script = {
        filename: 'test.gts',
        contents: stripIndent`
          import { fn } from '@ember/helper';
          let planets = []);
          export default class Demo {
            <template>{{fn this.remove}}</template>
          }
        `,
      };

      let standalone = rewriteModuleStandalone({ script }, env);

      expect(standalone?.errors).toEqual([]);
      expect(standalone?.transformedContents).toContain('templateForBackingValue(this');
      expect(standalone?.transformedContents).toContain('__glintDSL__.resolve(fn)(');
    });

    test('no templates', () => {
      expectParity('test.gts', `export const x = 1;\n`);
      expectParity('test.ts', `export const x = 1;\n`);
    });
  });

  describe('imports', () => {
    test('imported bindings shadow globals and resolve special forms', () => {
      expectParity(
        'test.gts',
        stripIndent`
          import { on } from '@ember/modifier';
          import { hash as h, array } from '@ember/helper';
          import type { TOC } from '@ember/component/template-only';
          import Component, { type Foo } from '@glimmer/component';

          <template>
            <button {{on "click" this.go}}>{{h a=1}} {{array 1 2}}</button>
          </template>
        `,
      );
    });
  });
});
