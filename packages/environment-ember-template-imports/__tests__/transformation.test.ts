import ts from 'typescript';
import { stripIndent } from 'common-tags';
import { describe, test, expect } from 'vitest';
import { preprocess } from '../-private/environment/preprocess';
import { transform } from '../-private/environment/transform';
import { GlintEmitMetadata } from '@glint/config/lib/environment';

describe('Environment: ETI', () => {
  describe('preprocess', () => {
    test('single template', () => {
      let source = '<template>hi</template>\n';
      let transformed = '[___T`hi`]\n';
      let result = preprocess(source, 'index.gts');

      expect(result.contents).toEqual(transformed);
      expect(result.data).toEqual({
        templateLocations: [
          {
            startTagOffset: source.indexOf('<template>'),
            startTagLength: '<template>'.length,
            endTagOffset: source.indexOf('</template>'),
            endTagLength: '</template>'.length,
            transformedStart: transformed.indexOf('[___T'),
            transformedEnd: transformed.indexOf(']') + 1,
          },
        ],
      });
    });

    test('multiple templates', () => {
      let source = stripIndent`
        <template>
          <Foo />
        </template>

        class Foo {
          <template>Hello</template>
        }
      `;

      let transformed = stripIndent`
        [___T\`
          <Foo />
        \`]

        class Foo {
          [___T\`Hello\`]
        }
      `;

      let sourceClassOffset = source.indexOf('class');
      let transformedClassOffset = transformed.indexOf('class');

      let result = preprocess(source, 'index.gts');

      expect(result.contents).toEqual(transformed);
      expect(result.data).toEqual({
        templateLocations: [
          {
            startTagOffset: source.indexOf('<template>'),
            startTagLength: '<template>'.length,
            endTagOffset: source.indexOf('</template>'),
            endTagLength: '</template>'.length,
            transformedStart: transformed.indexOf('[___T'),
            transformedEnd: transformed.indexOf(']') + 1,
          },
          {
            startTagOffset: source.indexOf('<template>', sourceClassOffset),
            startTagLength: '<template>'.length,
            endTagOffset: source.indexOf('</template>', sourceClassOffset),
            endTagLength: '</template>'.length,
            transformedStart: transformed.indexOf('[___T', transformedClassOffset),
            transformedEnd: transformed.indexOf(']', transformedClassOffset) + 1,
          },
        ],
      });
    });
  });

  describe('transform', () => {
    function applyTransform(source: string): {
      meta: Map<ts.Node, GlintEmitMetadata>;
      sourceFile: ts.SourceFile;
    } {
      let meta = new Map<ts.Node, GlintEmitMetadata>();
      let setEmitMetadata = (node: ts.TaggedTemplateExpression, newMeta: GlintEmitMetadata): void =>
        void meta.set(node, Object.assign(meta.get(node) ?? {}, newMeta));

      let { contents, data } = preprocess(source, 'index.gts');
      let ast = ts.createSourceFile('index.gts', contents, ts.ScriptTarget.Latest, true);
      let { transformed } = ts.transform(ast, [
        (context) => transform(data!, { ts, context, setEmitMetadata }),
      ]);

      expect(transformed.length).toBe(1);
      expect(transformed[0].kind).toBe(ts.SyntaxKind.SourceFile);

      return { meta, sourceFile: transformed[0] as ts.SourceFile };
    }

    test('single template', () => {
      let source = '<template>hi</template>\n';
      let { meta, sourceFile } = applyTransform(source);
      let templateNode = (sourceFile.statements[1] as ts.ExpressionStatement).expression;

      let start = source.indexOf('<template>');
      let contentStart = start + '<template>'.length;
      let contentEnd = source.indexOf('</template>');
      let end = contentEnd + '</template>'.length;

      expect(meta).toEqual(
        new Map([
          [
            templateNode,
            {
              prepend: 'export default ',
              templateLocation: {
                start,
                contentStart,
                contentEnd,
                end,
              },
            },
          ],
        ])
      );
    });

    test('multiple templates', () => {
      let source = stripIndent`
        <template>
          <Foo />
        </template>

        class Foo {
          <template>Hello</template>
        }
      `;

      let classStart = source.indexOf('class');
      let { meta, sourceFile } = applyTransform(source);
      let firstTemplate = (sourceFile.statements[1] as ts.ExpressionStatement).expression;
      let secondTemplate = (
        (
          (sourceFile.statements[2] as ts.ClassDeclaration)
            .members[0] as ts.ClassStaticBlockDeclaration
        ).body.statements[0] as ts.ExpressionStatement
      ).expression;

      let firstStart = source.indexOf('<template>');
      let firstContentStart = firstStart + '<template>'.length;
      let firstContentEnd = source.indexOf('</template>');
      let firstEnd = firstContentEnd + '</template>'.length;

      let secondStart = source.indexOf('<template>', classStart);
      let secondContentStart = secondStart + '<template>'.length;
      let secondContentEnd = source.indexOf('</template>', classStart);
      let secondEnd = secondContentEnd + '</template>'.length;

      expect(meta).toEqual(
        new Map<ts.Node, GlintEmitMetadata>([
          [
            firstTemplate,
            {
              prepend: 'export default ',
              templateLocation: {
                start: firstStart,
                contentStart: firstContentStart,
                contentEnd: firstContentEnd,
                end: firstEnd,
              },
            },
          ],
          [
            secondTemplate,
            {
              prepend: 'static { ',
              append: ' }',
              templateLocation: {
                start: secondStart,
                contentStart: secondContentStart,
                contentEnd: secondContentEnd,
                end: secondEnd,
              },
            },
          ],
        ])
      );
    });
  });
});
