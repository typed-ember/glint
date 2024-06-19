import { rewriteModule, TransformedModule } from '../../src/transform/index.js';
import { stripIndent } from 'common-tags';
import { describe, test, expect } from 'vitest';
import { Range, SourceFile } from '../../src/transform/template/transformed-module.js';
import * as ts from 'typescript';
import { assert } from '../../src/transform/util.js';
import { GlintEnvironment } from '../../src/config/index.js';

const emberLooseEnvironment = GlintEnvironment.load('ember-loose');
const emberTemplateImportsEnvironment = GlintEnvironment.load('ember-template-imports');

// Skipping because Volar source mapping dictates this move elsewhere, not sure how to do it yet.
describe.skip('Transform: Source-to-source offset mapping', () => {
  type RewrittenTestModule = {
    source: SourceFile;
    transformedModule: TransformedModule;
  };

  function rewriteInlineTemplate({ contents }: { contents: string }): RewrittenTestModule {
    let script = {
      filename: 'test.gts',
      contents: stripIndent`
        import Component from '@glimmer/component';

        export default class MyComponent extends Component {
          <template>
            ${contents}
          </template>
        }
      `,
    };

    let transformedModule = rewriteModule(ts, { script }, emberTemplateImportsEnvironment);
    if (!transformedModule) {
      throw new Error('Expected module to have rewritten contents');
    }

    return { source: script, transformedModule };
  }

  function rewriteCompanionTemplate({
    contents,
    backing,
  }: {
    contents: string;
    backing: 'class' | 'opaque' | 'none';
  }): RewrittenTestModule {
    let script = {
      filename: 'script.ts',
      contents:
        backing === 'class'
          ? 'export default class MyComponent {}'
          : backing === 'opaque'
          ? 'export default templateOnly();'
          : '',
    };

    let template = {
      filename: 'test.hbs',
      contents: contents,
    };

    let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment);
    if (!transformedModule) {
      throw new Error('Expected module to have rewritten contents');
    }

    return { source: template, transformedModule };
  }

  function findOccurrence(haystack: string, needle: string, occurrence: number): number {
    let offset = haystack.indexOf('function(𝚪');
    for (let i = 0; i < occurrence + 1; i++) {
      offset = haystack.indexOf(needle, offset + 1);

      if (offset === -1) {
        throw new Error(`Couldn't find occurrence #${i} of ${needle}`);
      }
    }
    return offset;
  }

  function expectTokenMapping(
    rewrittenTestModule: RewrittenTestModule,
    originalToken: string,
    { transformedToken = originalToken, occurrence = 0 } = {}
  ): void {
    let originalSource = rewrittenTestModule.source.contents;
    let transformedContents = rewrittenTestModule.transformedModule.transformedContents;
    let originalOffset = findOccurrence(originalSource, originalToken, occurrence);
    let transformedOffset = findOccurrence(transformedContents, transformedToken, occurrence);

    expectRangeMapping(
      rewrittenTestModule,
      {
        start: originalOffset,
        end: originalOffset + originalToken.length,
      },
      {
        start: transformedOffset,
        end: transformedOffset + transformedToken.length,
      }
    );
  }

  function expectRangeMapping(
    rewrittenTestModule: RewrittenTestModule,
    originalRange: Range,
    transformedRange: Range
  ): void {
    let { transformedModule, source } = rewrittenTestModule;
    expect(transformedModule.getOriginalOffset(transformedRange.start)).toEqual({
      offset: originalRange.start,
      source,
    });
    expect(transformedModule.getTransformedOffset(source.filename, originalRange.start)).toEqual(
      transformedRange.start
    );

    let calculatedTransformedRange = transformedModule.getTransformedRange(
      source.filename,
      originalRange.start,
      originalRange.end
    );

    expect(calculatedTransformedRange.start).toEqual(transformedRange.start);
    expect(calculatedTransformedRange.end).toEqual(transformedRange.end);

    let calculatedOriginalRange = transformedModule.getOriginalRange(
      transformedRange.start,
      transformedRange.end
    );

    expect(calculatedOriginalRange.source).toBe(rewrittenTestModule.source);
    expect(calculatedOriginalRange.start).toEqual(originalRange.start);
    expect(calculatedOriginalRange.end).toEqual(originalRange.end);
  }

  describe('standalone companion template', () => {
    describe('path segments', () => {
      test('simple path', () => {
        let module = rewriteCompanionTemplate({ backing: 'class', contents: '{{foo.bar}}' });
        expectTokenMapping(module, 'foo');
        expectTokenMapping(module, 'bar');
      });

      test('paths with repeated subsequences', () => {
        let module = rewriteCompanionTemplate({
          backing: 'class',
          contents: '{{this.tabState.tab}}',
        });
        expectTokenMapping(module, 'this');
        expectTokenMapping(module, 'tabState');
        expectTokenMapping(module, 'tab', { occurrence: 1 });
      });
    });

    test.each(['class', 'opaque', 'none'] as const)('with backing expression: %s', (backing) => {
      let module = rewriteCompanionTemplate({ backing, contents: '{{@foo}}' });
      expectTokenMapping(module, 'foo');
    });

    test('Windows line endings', () => {
      let module = rewriteCompanionTemplate({
        backing: 'none',
        contents: `Hello, <World />!\r\n\r\n{{this.foo}}\r\n`,
      });

      expectTokenMapping(module, 'World');
      expectTokenMapping(module, 'foo');
    });
  });

  describe('inline template', () => {
    describe('path segments', () => {
      test('simple in-scope paths', () => {
        let module = rewriteInlineTemplate({
          contents: '{{foo.bar}}',
        });
        expectTokenMapping(module, 'foo');
        expectTokenMapping(module, 'bar');
      });

      test('simple out-of-scope paths', () => {
        let module = rewriteInlineTemplate({ contents: '{{foo.bar}}' });
        expectTokenMapping(module, 'foo');
        expectTokenMapping(module, 'bar');
      });

      test('arg paths', () => {
        let module = rewriteInlineTemplate({ contents: '{{@foo.bar}}' });
        expectTokenMapping(module, 'foo');
        expectTokenMapping(module, 'bar');
      });

      test('this paths', () => {
        let module = rewriteInlineTemplate({ contents: '{{this.foo.bar}}' });
        expectTokenMapping(module, 'foo');
        expectTokenMapping(module, 'bar');
        expectTokenMapping(module, 'this');
      });

      test('paths with repeated subsequences', () => {
        let module = rewriteInlineTemplate({ contents: '{{this.tabState.tab}}' });
        expectTokenMapping(module, 'this');
        expectTokenMapping(module, 'tabState');
        expectTokenMapping(module, 'tab', { occurrence: 1 });
      });
    });

    describe('keys', () => {
      test('named params to mustaches', () => {
        let module = rewriteInlineTemplate({
          contents: '{{foo bar=hello}}',
        });
        expectTokenMapping(module, 'foo');
        expectTokenMapping(module, 'bar');
        expectTokenMapping(module, 'hello');
      });

      test('named spinal-case params to mustaches', () => {
        let module = rewriteInlineTemplate({
          contents: '{{foo bar-baz=hello}}',
        });
        expectTokenMapping(module, 'foo');
        expectTokenMapping(module, 'bar-baz');
        expectTokenMapping(module, 'hello');
      });

      test('component args', () => {
        let module = rewriteInlineTemplate({
          contents: '<Foo @bar={{hello}} />',
        });
        expectTokenMapping(module, 'Foo');
        expectTokenMapping(module, 'bar');
        expectTokenMapping(module, 'hello');
      });

      test('spinal-case component args', () => {
        let module = rewriteInlineTemplate({
          contents: '<Foo @bar-baz={{hello}} />',
        });
        expectTokenMapping(module, 'Foo');
        expectTokenMapping(module, 'bar-baz');
        expectTokenMapping(module, 'hello');
      });

      test('named blocks', () => {
        let module = rewriteInlineTemplate({
          contents: '<Foo><:blockName>hi</:blockName></Foo>',
        });
        expectTokenMapping(module, 'Foo');
        expectTokenMapping(module, 'blockName');
      });

      test('spinal-case named blocks', () => {
        let module = rewriteInlineTemplate({
          contents: '<Foo><:block-name>hi</:block-name></Foo>',
        });
        expectTokenMapping(module, 'Foo');
        expectTokenMapping(module, 'block-name');
      });
    });

    describe('block params', () => {
      test('curly params', () => {
        let module = rewriteInlineTemplate({
          contents: stripIndent`
              {{#each this.items as |num|}}
                #{{num}}
              {{/each}}
            `,
        });

        expectTokenMapping(module, 'each', { occurrence: 0 });
        expectTokenMapping(module, 'this');
        expectTokenMapping(module, 'items');
        expectTokenMapping(module, 'num', { occurrence: 0 });
        expectTokenMapping(module, 'num', { occurrence: 1 });
        expectTokenMapping(module, 'each', { occurrence: 1 });
      });

      test('angle bracket params', () => {
        let module = rewriteInlineTemplate({
          contents: '<Foo as |bar baz|></Foo>',
        });
        expectTokenMapping(module, 'Foo');
        expectTokenMapping(module, 'bar');
        expectTokenMapping(module, 'baz');
      });
    });

    describe('block mustaches', () => {
      test('simple identifiers', () => {
        let module = rewriteInlineTemplate({
          contents: '{{#foo}}{{/foo}}',
        });
        expectTokenMapping(module, 'foo', { occurrence: 0 });
        expectTokenMapping(module, 'foo', { occurrence: 1 });
      });

      test('simple paths', () => {
        let module = rewriteInlineTemplate({
          contents: '{{#foo.bar}}{{/foo.bar}}',
        });
        expectTokenMapping(module, 'foo', { occurrence: 0 });
        expectTokenMapping(module, 'foo', { occurrence: 1 });
        expectTokenMapping(module, 'bar', { occurrence: 0 });
        expectTokenMapping(module, 'bar', { occurrence: 1 });
      });

      test('arg paths', () => {
        let module = rewriteInlineTemplate({ contents: '{{#@foo.bar}}{{/@foo.bar}}' });
        expectTokenMapping(module, 'foo', { occurrence: 0 });
        expectTokenMapping(module, 'foo', { occurrence: 1 });
        expectTokenMapping(module, 'bar', { occurrence: 0 });
        expectTokenMapping(module, 'bar', { occurrence: 1 });
      });

      test('this paths', () => {
        let module = rewriteInlineTemplate({ contents: '{{#this.bar}}{{/this.bar}}' });
        expectTokenMapping(module, 'this', { occurrence: 0 });
        expectTokenMapping(module, 'this', { occurrence: 1 });
        expectTokenMapping(module, 'bar', { occurrence: 0 });
        expectTokenMapping(module, 'bar', { occurrence: 1 });
      });
    });

    describe('angle bracket components', () => {
      test('simple identifiers', () => {
        let module = rewriteInlineTemplate({
          contents: '<Foo></Foo>',
        });
        expectTokenMapping(module, 'Foo', { occurrence: 0 });
        expectTokenMapping(module, 'Foo', { occurrence: 1 });
      });

      test('simple paths', () => {
        let module = rewriteInlineTemplate({
          contents: '<foo.bar></foo.bar>',
        });
        expectTokenMapping(module, 'foo', { occurrence: 0 });
        expectTokenMapping(module, 'foo', { occurrence: 1 });
        expectTokenMapping(module, 'bar', { occurrence: 0 });
        expectTokenMapping(module, 'bar', { occurrence: 1 });
      });

      test('arg paths', () => {
        let module = rewriteInlineTemplate({ contents: '<@foo.bar></@foo.bar>' });
        expectTokenMapping(module, 'foo', { occurrence: 0 });
        expectTokenMapping(module, 'foo', { occurrence: 1 });
        expectTokenMapping(module, 'bar', { occurrence: 0 });
        expectTokenMapping(module, 'bar', { occurrence: 1 });
      });

      test('this paths', () => {
        let module = rewriteInlineTemplate({ contents: '<this.bar></this.bar>' });
        expectTokenMapping(module, 'this', { occurrence: 0 });
        expectTokenMapping(module, 'this', { occurrence: 1 });
        expectTokenMapping(module, 'bar', { occurrence: 0 });
        expectTokenMapping(module, 'bar', { occurrence: 1 });
      });

      test('args with repeated subsequences', () => {
        let module = rewriteInlineTemplate({
          contents: '<Foo @nameThatIsLong="one" @name="two" />',
        });

        expectTokenMapping(module, 'Foo');
        expectTokenMapping(module, 'nameThatIsLong');
        expectTokenMapping(module, 'name', { occurrence: 1 });
      });
    });

    describe('location inference stress tests', () => {
      test('matching in/out arg names', () => {
        let { source, transformedModule } =
          rewriteInlineTemplate({
            contents: stripIndent`
              <Foo
                @foo={{@a}}
                @a="bar" />
            `,
          }) ?? {};

        let passedArgSourceOffset = source.contents.indexOf('{{@a}}') + '{{@'.length;
        let passedArgTransformedOffset =
          transformedModule.transformedContents.indexOf('args.a') + 'args.'.length;

        expect(transformedModule.getOriginalOffset(passedArgTransformedOffset).offset).toBe(
          passedArgSourceOffset
        );

        expect(transformedModule.getTransformedOffset(source.filename, passedArgSourceOffset)).toBe(
          passedArgTransformedOffset
        );

        let argNameSourceOffset = source.contents.indexOf('@a=') + '@'.length;
        let argNameTransformedOffset =
          transformedModule.transformedContents.indexOf(', a:') + ', '.length;

        expect(transformedModule.getOriginalOffset(argNameTransformedOffset).offset).toBe(
          argNameSourceOffset
        );

        expect(transformedModule.getTransformedOffset(source.filename, argNameSourceOffset)).toBe(
          argNameTransformedOffset
        );
      });

      test('arg name subsequences', () => {
        let { source, transformedModule } =
          rewriteInlineTemplate({ contents: `{{foo aa="qwe" a="qwe"}}` }) ?? {};

        let doubleASourceOFfset = source.contents.indexOf('aa=');
        let doubleATransformedOffset = transformedModule.transformedContents.indexOf('aa:');

        expect(transformedModule.getOriginalOffset(doubleATransformedOffset).offset).toBe(
          doubleASourceOFfset
        );

        expect(transformedModule.getTransformedOffset(source.filename, doubleASourceOFfset)).toBe(
          doubleATransformedOffset
        );

        let singleASourceOffset = source.contents.indexOf(' a=') + ' '.length;
        let singleATransformedOFfset =
          transformedModule.transformedContents.indexOf(' a:') + ' '.length;

        expect(transformedModule.getOriginalOffset(singleATransformedOFfset).offset).toBe(
          singleASourceOffset
        );

        expect(transformedModule.getTransformedOffset(source.filename, singleASourceOffset)).toBe(
          singleATransformedOFfset
        );
      });
    });

    test('Windows line endings', () => {
      let module = rewriteInlineTemplate({
        contents: `Hello, <World />!\r\n\r\n{{this.foo}}\r\n`,
      });

      expectTokenMapping(module, 'World');
      expectTokenMapping(module, 'foo');
    });
  });

  describe('spans outside of mapped segments', () => {
    const source = {
      filename: 'test.gts',
      contents: stripIndent`
        import Component from '@glimmer/component';

        // start
        export default class MyComponent extends Component {
          <template><Greeting /></template>
        }
        // end

        export class Greeting extends Component {
          <template>Hello, world!</template>
        }
      `,
    };

    const rewritten = rewriteModule(ts, { script: source }, emberTemplateImportsEnvironment)!;

    test('bounds that cross a rewritten span', () => {
      let originalStart = source.contents.indexOf('// start');
      let originalEnd = source.contents.indexOf('// end');

      let transformedStart = rewritten.transformedContents.indexOf('// start');
      let transformedEnd = rewritten.transformedContents.indexOf('// end');

      expect(rewritten.getOriginalRange(transformedStart, transformedEnd)).toEqual({
        start: originalStart,
        end: originalEnd,
        source,
      });

      expect(rewritten.getTransformedRange(source.filename, originalStart, originalEnd)).toEqual({
        start: transformedStart,
        end: transformedEnd,
      });
    });

    test('full file bounds', () => {
      let originalEnd = source.contents.length - 1;
      let transformedEnd = rewritten.transformedContents.length - 1;

      expect(rewritten.getOriginalOffset(transformedEnd)).toEqual({
        source,
        offset: originalEnd,
      });
      expect(rewritten.getOriginalRange(0, transformedEnd)).toEqual({
        start: 0,
        end: originalEnd,
        source,
      });

      expect(rewritten.getTransformedOffset(source.filename, originalEnd)).toEqual(transformedEnd);
      expect(rewritten.getTransformedRange(source.filename, 0, originalEnd)).toEqual({
        start: 0,
        end: transformedEnd,
      });
    });
  });
});

describe.skip('Diagnostic offset mapping', () => {
  const transformedContentsFile = { fileName: 'transformed' } as ts.SourceFile;
  const source = {
    filename: 'test.gts',
    contents: stripIndent`
      import Component from '@glimmer/component';
      export default class MyComponent extends Component {
        <template>
          {{#each foo as |bar|}}
            {{concat bar}}
          {{/each}}
        </template>
      }
    `,
  };

  const transformedModule = rewriteModule(ts, { script: source }, emberTemplateImportsEnvironment);
  assert(transformedModule);

  test('without related information', () => {
    let category = ts.DiagnosticCategory.Error;
    let messageText = '`foo` is no good';
    let code = 1234;

    let original: ts.DiagnosticWithLocation = {
      category,
      code,
      messageText,
      file: transformedContentsFile,
      start: transformedModule.transformedContents.indexOf('foo'),
      length: 3,
    };

    let rewritten = rewriteDiagnostic(ts, original, () => transformedModule);

    expect(rewritten).toMatchObject({
      category,
      code,
      messageText,
      start: source.contents.indexOf('foo'),
      length: 3,
    });
  });

  test('with related information', () => {
    let category = ts.DiagnosticCategory.Error;
    let messageText = '`bar` is no good';
    let relatedMessageText = '`bar` was defined here';
    let code = 1234;

    let original: ts.DiagnosticWithLocation = {
      category,
      code,
      file: transformedContentsFile,
      start: transformedModule.transformedContents.indexOf('(bar') + 1,
      length: 3,
      messageText,
      relatedInformation: [
        {
          category,
          code,
          file: transformedContentsFile,
          messageText: relatedMessageText,
          start: transformedModule.transformedContents.indexOf('[bar]') + 1,
          length: 3,
        },
      ],
    };

    let rewritten = rewriteDiagnostic(ts, original, () => transformedModule);

    expect(rewritten).toMatchObject({
      category,
      code,
      messageText,
      start: source.contents.indexOf(' bar') + 1,
      length: 3,
      relatedInformation: [
        {
          category,
          code,
          messageText: relatedMessageText,
          start: source.contents.indexOf('|bar|') + 1,
          length: 3,
        },
      ],
    });
  });

  test('with a companion template', () => {
    let script = { filename: 'test.ts', contents: '' };
    let template = {
      filename: 'test.hbs',
      contents: stripIndent`
        {{foo-bar type 'in'}}
      `,
    };

    let transformedModule = rewriteModule(ts, { script, template }, emberLooseEnvironment)!;
    let category = ts.DiagnosticCategory.Error;
    let messageText = '`foo-bar` is no good';
    let code = 1234;

    let original: ts.DiagnosticWithLocation = {
      category,
      code,
      messageText,
      file: { fileName: 'test.ts' } as ts.SourceFile,
      start: transformedModule?.transformedContents.indexOf('foo-bar'),
      length: 7,
    };

    let rewritten = rewriteDiagnostic(ts, original, () => transformedModule);

    expect(rewritten).toMatchObject({
      category,
      code,
      messageText,
      start: template.contents.indexOf('foo-bar'),
      length: 7,
    });
  });
});
