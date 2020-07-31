import { rewriteModule, TransformedModule, rewriteDiagnostic } from '../src';
import { stripIndent } from 'common-tags';
import { Range } from '../src/transformed-module';
import ts from 'typescript';
import { assert } from '../src/util';
import { GlintEnvironment } from '@glint/config';

const glimmerxEnvironment = GlintEnvironment.load('glimmerx');

describe('Source-to-source offset mapping', () => {
  function rewriteTestModule({
    contents,
    identifiersInScope = [],
  }: {
    contents: string;
    identifiersInScope?: string[];
  }): TransformedModule {
    let result = rewriteModule(
      'test.ts',
      stripIndent`
        import Component, { hbs } from '@glimmerx/component';
        import { ${identifiersInScope.join(', ')} } from 'dummy';

        export default class MyComponent extends Component {
          static template = hbs\`
            ${contents}
          \`;
        }
      `,
      glimmerxEnvironment
    );

    if (!result) {
      throw new Error('Expected module to have rewritten contents');
    }

    return result;
  }

  function findOccurrence(haystack: string, needle: string, occurrence: number): number {
    let offset = -1;
    for (let i = 0; i < occurrence + 1; i++) {
      offset = haystack.indexOf(needle, offset + 1);

      if (offset === -1) {
        throw new Error(`Couldn't find occurrence #${i} of ${needle}`);
      }
    }
    return offset;
  }

  function expectTokenMapping(
    transformedModule: TransformedModule,
    originalToken: string,
    { transformedToken = originalToken, occurrence = 0 } = {}
  ): void {
    let { originalSource, transformedSource } = transformedModule;
    let originalOffset = findOccurrence(originalSource, originalToken, occurrence);
    let transformedOffset = findOccurrence(transformedSource, transformedToken, occurrence);

    expectRangeMapping(
      transformedModule,
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
    transformedModule: TransformedModule,
    originalRange: Range,
    transformedRange: Range
  ): void {
    expect(transformedModule.getOriginalOffset(transformedRange.start)).toEqual(
      originalRange.start
    );
    expect(transformedModule.getTransformedOffset(originalRange.start)).toEqual(
      transformedRange.start
    );

    let calculatedTransformedRange = transformedModule.getTransformedRange(
      originalRange.start,
      originalRange.end
    );

    expect(calculatedTransformedRange.start).toEqual(transformedRange.start);
    expect(calculatedTransformedRange.end).toEqual(transformedRange.end);

    let calculatedOriginalRange = transformedModule.getOriginalRange(
      transformedRange.start,
      transformedRange.end
    );

    expect(calculatedOriginalRange.start).toEqual(originalRange.start);
    expect(calculatedOriginalRange.end).toEqual(originalRange.end);
  }

  describe('path segments', () => {
    test('simple in-scope paths', () => {
      let module = rewriteTestModule({ identifiersInScope: ['foo'], contents: '{{foo.bar}}' });
      expectTokenMapping(module, 'foo');
      expectTokenMapping(module, 'bar');
    });

    test('simple out-of-scope paths', () => {
      let module = rewriteTestModule({ contents: '{{foo.bar}}' });
      expectTokenMapping(module, 'foo', { transformedToken: '"foo"' });
      expectTokenMapping(module, 'bar');
    });

    test('arg paths', () => {
      let module = rewriteTestModule({ contents: '{{@foo.bar}}' });
      expectTokenMapping(module, 'foo');
      expectTokenMapping(module, 'bar');
    });

    test('this paths', () => {
      let module = rewriteTestModule({ contents: '{{this.foo.bar}}' });
      expectTokenMapping(module, 'foo');
      expectTokenMapping(module, 'bar');
      expectTokenMapping(module, 'this');
    });
  });

  describe('keys', () => {
    test('named params to mustaches', () => {
      let module = rewriteTestModule({
        identifiersInScope: ['foo', 'hello'],
        contents: '{{foo bar=hello}}',
      });
      expectTokenMapping(module, 'foo');
      expectTokenMapping(module, 'bar');
      expectTokenMapping(module, 'hello');
    });

    test('named spinal-case params to mustaches', () => {
      let module = rewriteTestModule({
        identifiersInScope: ['foo', 'hello'],
        contents: '{{foo bar-baz=hello}}',
      });
      expectTokenMapping(module, 'foo');
      expectTokenMapping(module, 'bar-baz', { transformedToken: '"bar-baz"' });
      expectTokenMapping(module, 'hello');
    });

    test('component args', () => {
      let module = rewriteTestModule({
        identifiersInScope: ['Foo', 'hello'],
        contents: '<Foo @bar={{hello}} />',
      });
      expectTokenMapping(module, 'Foo');
      expectTokenMapping(module, 'bar');
      expectTokenMapping(module, 'hello');
    });

    test('spinal-case component args', () => {
      let module = rewriteTestModule({
        identifiersInScope: ['Foo', 'hello'],
        contents: '<Foo @bar-baz={{hello}} />',
      });
      expectTokenMapping(module, 'Foo');
      expectTokenMapping(module, 'bar-baz', { transformedToken: '"bar-baz"' });
      expectTokenMapping(module, 'hello');
    });

    test('named blocks', () => {
      let module = rewriteTestModule({
        identifiersInScope: ['Foo'],
        contents: '<Foo><:block>hi</:block></Foo>',
      });
      expectTokenMapping(module, 'Foo');
      expectTokenMapping(module, 'block');
    });

    test('spinal-case named blocks', () => {
      let module = rewriteTestModule({
        identifiersInScope: ['Foo'],
        contents: '<Foo><:block-name>hi</:block-name></Foo>',
      });
      expectTokenMapping(module, 'Foo');
      expectTokenMapping(module, 'block-name', { transformedToken: '"block-name"' });
    });
  });

  describe('block params', () => {
    test('curly params', () => {
      let module = rewriteTestModule({
        contents: stripIndent`
          {{#each this.items as |num|}}
            #{{num}}
          {{/each}}
        `,
      });

      expectTokenMapping(module, 'each', { occurrence: 0, transformedToken: '"each"' });
      expectTokenMapping(module, 'this');
      expectTokenMapping(module, 'items');
      expectTokenMapping(module, 'num', { occurrence: 0 });
      expectTokenMapping(module, 'num', { occurrence: 1 });
      expectTokenMapping(module, 'each', { occurrence: 1, transformedToken: '"each"' });
    });

    test('angle bracket params', () => {
      let module = rewriteTestModule({
        identifiersInScope: ['Foo'],
        contents: '<Foo as |bar baz|></Foo>',
      });
      expectTokenMapping(module, 'Foo');
      expectTokenMapping(module, 'bar');
      expectTokenMapping(module, 'baz');
    });
  });

  describe('block mustaches', () => {
    test('simple identifiers', () => {
      let module = rewriteTestModule({ identifiersInScope: ['foo'], contents: '{{#foo}}{{/foo}}' });
      expectTokenMapping(module, 'foo', { occurrence: 0 });
      expectTokenMapping(module, 'foo', { occurrence: 1 });
    });

    test('simple paths', () => {
      let module = rewriteTestModule({
        identifiersInScope: ['foo'],
        contents: '{{#foo.bar}}{{/foo.bar}}',
      });
      expectTokenMapping(module, 'foo', { occurrence: 0 });
      expectTokenMapping(module, 'foo', { occurrence: 1 });
      expectTokenMapping(module, 'bar', { occurrence: 0 });
      expectTokenMapping(module, 'bar', { occurrence: 1 });
    });

    test('arg paths', () => {
      let module = rewriteTestModule({ contents: '{{#@foo.bar}}{{/@foo.bar}}' });
      expectTokenMapping(module, 'foo', { occurrence: 0 });
      expectTokenMapping(module, 'foo', { occurrence: 1 });
      expectTokenMapping(module, 'bar', { occurrence: 0 });
      expectTokenMapping(module, 'bar', { occurrence: 1 });
    });

    test('this paths', () => {
      let module = rewriteTestModule({ contents: '{{#this.bar}}{{/this.bar}}' });
      expectTokenMapping(module, 'this', { occurrence: 0 });
      expectTokenMapping(module, 'this', { occurrence: 1 });
      expectTokenMapping(module, 'bar', { occurrence: 0 });
      expectTokenMapping(module, 'bar', { occurrence: 1 });
    });
  });

  describe('angle bracket components', () => {
    test('simple identifiers', () => {
      let module = rewriteTestModule({ identifiersInScope: ['Foo'], contents: '<Foo></Foo>' });
      expectTokenMapping(module, 'Foo', { occurrence: 0 });
      expectTokenMapping(module, 'Foo', { occurrence: 1 });
    });

    test('simple paths', () => {
      let module = rewriteTestModule({
        identifiersInScope: ['foo'],
        contents: '<foo.bar></foo.bar>',
      });
      expectTokenMapping(module, 'foo', { occurrence: 0 });
      expectTokenMapping(module, 'foo', { occurrence: 1 });
      expectTokenMapping(module, 'bar', { occurrence: 0 });
      expectTokenMapping(module, 'bar', { occurrence: 1 });
    });

    test('arg paths', () => {
      let module = rewriteTestModule({ contents: '<@foo.bar></@foo.bar>' });
      expectTokenMapping(module, 'foo', { occurrence: 0 });
      expectTokenMapping(module, 'foo', { occurrence: 1 });
      expectTokenMapping(module, 'bar', { occurrence: 0 });
      expectTokenMapping(module, 'bar', { occurrence: 1 });
    });

    test('this paths', () => {
      let module = rewriteTestModule({ contents: '<this.bar></this.bar>' });
      expectTokenMapping(module, 'this', { occurrence: 0 });
      expectTokenMapping(module, 'this', { occurrence: 1 });
      expectTokenMapping(module, 'bar', { occurrence: 0 });
      expectTokenMapping(module, 'bar', { occurrence: 1 });
    });
  });

  describe('spans outside of mapped segments', () => {
    const rewritten = rewriteModule(
      'test.ts',
      stripIndent`
        import Component, { hbs } from '@glimmerx/component';

        // start
        export default class MyComponent extends Component {
          static template = hbs\`<Greeting />\`;
        }
        // end

        export class Greeting extends Component {
          static template = hbs\`Hello, world!\`;
        }
      `,
      glimmerxEnvironment
    )!;

    test('bounds that cross a rewritten span', () => {
      let originalStart = rewritten.originalSource.indexOf('// start');
      let originalEnd = rewritten.originalSource.indexOf('// end');

      let transformedStart = rewritten.transformedSource.indexOf('// start');
      let transformedEnd = rewritten.transformedSource.indexOf('// end');

      expect(rewritten.getOriginalRange(transformedStart, transformedEnd)).toEqual({
        start: originalStart,
        end: originalEnd,
      });

      expect(rewritten.getTransformedRange(originalStart, originalEnd)).toEqual({
        start: transformedStart,
        end: transformedEnd,
      });
    });

    test('full file bounds', () => {
      let originalEnd = rewritten.originalSource.length - 1;
      let transformedEnd = rewritten.transformedSource.length - 1;

      expect(rewritten.getOriginalOffset(transformedEnd)).toEqual(originalEnd);
      expect(rewritten.getOriginalRange(0, transformedEnd)).toEqual({
        start: 0,
        end: originalEnd,
      });

      expect(rewritten.getTransformedOffset(originalEnd)).toEqual(transformedEnd);
      expect(rewritten.getTransformedRange(0, originalEnd)).toEqual({
        start: 0,
        end: transformedEnd,
      });
    });
  });
});

describe('Diagnostic offset mapping', () => {
  const originalSourceFile = { fileName: 'original' } as ts.SourceFile;
  const transformedSourceFile = { fileName: 'transformed' } as ts.SourceFile;
  const source = stripIndent`
    import Component, { hbs } from '@glimmerx/component';
    export default class MyComponent extends Component {
      static template = hbs\`
        {{#each foo as |bar|}}
          {{concat bar}}
        {{/each}}
      \`;
    }
  `;

  const transformedModule = rewriteModule('test.ts', source, glimmerxEnvironment);
  assert(transformedModule);

  test('without related information', () => {
    let category = ts.DiagnosticCategory.Error;
    let messageText = '`foo` is no good';
    let code = 1234;

    let original: ts.DiagnosticWithLocation = {
      category,
      code,
      messageText,
      file: transformedSourceFile,
      start: transformedModule.transformedSource.indexOf('"foo"'),
      length: 5,
    };

    let rewritten = rewriteDiagnostic(original, transformedModule, originalSourceFile);

    expect(rewritten).toEqual({
      category,
      code,
      messageText,
      file: originalSourceFile,
      start: source.indexOf('foo'),
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
      file: transformedSourceFile,
      start: transformedModule.transformedSource.indexOf(', bar') + 2,
      length: 3,
      messageText,
      relatedInformation: [
        {
          category,
          code,
          file: transformedSourceFile,
          messageText: relatedMessageText,
          start: transformedModule.transformedSource.indexOf('[bar]') + 1,
          length: 3,
        },
      ],
    };

    let rewritten = rewriteDiagnostic(original, transformedModule, originalSourceFile);

    expect(rewritten).toEqual({
      category,
      code,
      messageText,
      file: originalSourceFile,
      start: source.indexOf(' bar') + 1,
      length: 3,
      relatedInformation: [
        {
          category,
          code,
          file: originalSourceFile,
          messageText: relatedMessageText,
          start: source.indexOf('|bar|') + 1,
          length: 3,
        },
      ],
    });
  });
});
