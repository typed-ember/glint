import {
  getSharedTestWorkspaceHelper,
  teardownSharedTestWorkspaceAfterEach,
  prepareDocument,
  extractCursor,
} from 'glint-monorepo-test-utils';
import { describe, afterEach, test, expect } from 'vitest';
import { stripIndent } from 'common-tags';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItemKind, Position } from '@volar/language-server';

describe('Language Server: Completions (ts plugin)', () => {
  afterEach(teardownSharedTestWorkspaceAfterEach);

  test.skip('querying a standalone template', async () => {
    await prepareDocument('ts-ember-app/app/components/index.hbs', 'handlebars', '<LinkT />');

    expect(
      await requestCompletion('ts-ember-app/app/components/index.hbs', 'handlebars', '<LinkT />'),
    ).toMatchInlineSnapshot();
  });

  test.skip('in unstructured text', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          <div>
            hello
          </div>
        </template>
      }
    `;

    expect(
      await requestCompletion('ts-template-imports-app/src/index.gts', 'glimmer-ts', code),
    ).toMatchInlineSnapshot();
  });

  test.skip('in a companion template with syntax errors', async () => {
    const code = stripIndent`
      Hello, {{this.target.%}}!
    `;

    expect(
      await requestCompletion('ts-ember-app/app/components/index.hbs', 'handlebars', code),
    ).toMatchInlineSnapshot();
  });

  // Fails with "No content available", but maybe that's a perfectly fine response in this case?
  test.skip('in an embedded template with syntax errors', async () => {
    const code = stripIndent`
      <template>Hello, {{this.target.%}}!</template>
    `;

    expect(
      await requestCompletion(
        'ts-template-imports-app/src/ephemeral-index.gts',
        'glimmer-ts',
        code,
      ),
    ).toMatchInlineSnapshot();
  });

  test('passing component args', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          <Inner @% />
        </template>
      }

      class Inner extends Component<{ Args: { foo?: string; 'bar-baz'?: number | undefined } }> {}
    `;

    expect(await requestCompletion('ts-template-imports-app/src/index.gts', 'glimmer-ts', code))
      .toMatchInlineSnapshot(`
      [
        {
          "kind": "property",
          "kindModifiers": "optional",
          "name": "bar-baz",
          "replacementSpan": {
            "end": {
              "line": 5,
              "offset": 13,
            },
            "start": {
              "line": 5,
              "offset": 13,
            },
          },
          "sortText": "11",
        },
        {
          "kind": "property",
          "kindModifiers": "optional",
          "name": "foo",
          "replacementSpan": {
            "end": {
              "line": 5,
              "offset": 13,
            },
            "start": {
              "line": 5,
              "offset": 13,
            },
          },
          "sortText": "11",
        },
      ]
    `);
  });

  test('referencing class properties', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        private message = 'hello';

        <template>
          {{this.me%}}
        </template>
      }
    `;

    expect(
      await requestCompletionItem(
        'ts-template-imports-app/src/index.gts',
        'glimmer-ts',
        code,
        'message',
      ),
    ).toMatchInlineSnapshot(`
      {
        "kind": "property",
        "kindModifiers": "private",
        "name": "message",
        "sortText": "11",
      }
    `);
  });

  // TODO: reinstate this... seems broken in the IDE as well.
  test.skip('auto imports', async () => {
    await prepareDocument(
      'ts-template-imports-app/src/empty-fixture.gts',
      'glimmer-ts',
      stripIndent`
        import Component from '@glimmer/component';

        export default class MyComponent extends Component {
          <template>
            <div>
              hello
            </div>
          </template>
        }
      `,
    );

    const completions = await requestCompletion(
      'ts-template-imports-app/src/empty-fixture2.gts',
      'glimmer-ts',
      stripIndent`
        let a = My%
      `,
    );

    let importCompletion = completions.find(
      (k: any) => k.kind == CompletionItemKind.Variable && k.name == 'foobar',
    );

    expect(importCompletion).toMatchInlineSnapshot();
  });

  test.skip('auto imports with documentation and tags', async () => {
    await prepareDocument(
      'ts-template-imports-app/src/other.ts',
      'typescript',
      stripIndent`
        /**
         * This is a doc comment
         * @param foo
         */
        export let foobar = 123;
      `,
    );

    expect(
      await requestCompletion(
        'ts-template-imports-app/src/index.ts',
        'typescript',
        stripIndent`
          import { thing } from 'nonexistent';

          let a = foo
        `,
      ),
    ).toMatchInlineSnapshot();
  });

  test.skip('auto import - import statements - ensure all completions are resolvable', async () => {
    await prepareDocument(
      'ts-template-imports-app/src/other.ts',
      'typescript',
      stripIndent`
        export let foobar = 123;
      `,
    );

    expect(
      await requestCompletion(
        'ts-template-imports-app/src/index.ts',
        'typescript',
        stripIndent`
          import foo
        `,
      ),
    ).toMatchInlineSnapshot(`
      TODO
    `);
  });

  test('referencing own args', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      type MyComponentArgs<T> = {
        items: Set<T>;
      };

      export default class MyComponent<T> extends Component<{ Args: MyComponentArgs<T> }> {
        <template>
          {{@i%}}
        </template>
      }
    `;

    expect(await requestCompletion('ts-template-imports-app/src/index.gts', 'glimmer-ts', code))
      .toMatchInlineSnapshot(`
        [
          {
            "kind": "parameter",
            "kindModifiers": "",
            "name": "__glintDSL__",
            "sortText": "11",
          },
          {
            "kind": "parameter",
            "kindModifiers": "",
            "name": "__glintRef__",
            "sortText": "11",
          },
          {
            "kind": "local var",
            "kindModifiers": "",
            "name": "arguments",
            "sortText": "11",
          },
          {
            "kind": "alias",
            "kindModifiers": "export,declare",
            "name": "Component",
            "sortText": "11",
          },
          {
            "kind": "class",
            "kindModifiers": "export",
            "name": "MyComponent",
            "sortText": "11",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "__dirname",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "__filename",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AbortController",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AbortSignal",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AbstractRange",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "addEventListener",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AggregateError",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "alert",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AnalyserNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Animation",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AnimationEffect",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AnimationEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AnimationPlaybackEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AnimationTimeline",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Array",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ArrayBuffer",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "as",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "async",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "atob",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Atomics",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Attr",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Audio",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioBuffer",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioBufferSourceNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioContext",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioData",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioDecoder",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioDestinationNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioEncoder",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioListener",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioParam",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioParamMap",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioScheduledSourceNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioWorklet",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AudioWorkletNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AuthenticatorAssertionResponse",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AuthenticatorAttestationResponse",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "AuthenticatorResponse",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "await",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "BarProp",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "BaseAudioContext",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "BeforeUnloadEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "BigInt",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "BigInt64Array",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "BigUint64Array",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "BiquadFilterNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Blob",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "BlobEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Boolean",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "break",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "BroadcastChannel",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "btoa",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Buffer",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ByteLengthQueuingStrategy",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Cache",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "caches",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CacheStorage",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "cancelAnimationFrame",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "cancelIdleCallback",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CanvasCaptureMediaStreamTrack",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CanvasGradient",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CanvasPattern",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CanvasRenderingContext2D",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CaretPosition",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "case",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "catch",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CDATASection",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ChannelMergerNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ChannelSplitterNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CharacterData",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "class",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "clearImmediate",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "clearInterval",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "clearTimeout",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Clipboard",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ClipboardEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ClipboardItem",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "close",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "closed",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CloseEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Comment",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CompositionEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CompressionStream",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "confirm",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "console",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "const",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ConstantSourceNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ContentVisibilityAutoStateChangeEvent",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "continue",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ConvolverNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CountQueuingStrategy",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "createImageBitmap",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Credential",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CredentialsContainer",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "crossOriginIsolated",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "crypto",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Crypto",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CryptoKey",
            "sortText": "15",
          },
          {
            "kind": "module",
            "kindModifiers": "declare",
            "name": "CSS",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSAnimation",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSConditionRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSContainerRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSCounterStyleRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSFontFaceRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSFontFeatureValuesRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSFontPaletteValuesRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSGroupingRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSImageValue",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSImportRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSKeyframeRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSKeyframesRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSKeywordValue",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSLayerBlockRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSLayerStatementRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSMathClamp",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSMathInvert",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSMathMax",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSMathMin",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSMathNegate",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSMathProduct",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSMathSum",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSMathValue",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSMatrixComponent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSMediaRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSNamespaceRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSNumericArray",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSNumericValue",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSPageRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSPerspective",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSPropertyRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSRotate",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSRuleList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSScale",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSScopeRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSSkew",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSSkewX",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSSkewY",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSStartingStyleRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSStyleDeclaration",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSStyleRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSStyleSheet",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSStyleValue",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSSupportsRule",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSTransformComponent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSTransformValue",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSTransition",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSTranslate",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSUnitValue",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSUnparsedValue",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CSSVariableReferenceValue",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CustomElementRegistry",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "customElements",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CustomEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "CustomStateSet",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DataTransfer",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DataTransferItem",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DataTransferItemList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DataView",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Date",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "debugger",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "decodeURI",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "decodeURIComponent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DecompressionStream",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "default",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DelayNode",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "delete",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DeviceMotionEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DeviceOrientationEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "devicePixelRatio",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "dispatchEvent",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "do",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "document",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Document",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DocumentFragment",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DocumentTimeline",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DocumentType",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMException",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMImplementation",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMMatrix",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMMatrixReadOnly",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMParser",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMPoint",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMPointReadOnly",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMQuad",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMRect",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMRectList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMRectReadOnly",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMStringList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMStringMap",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DOMTokenList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DragEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "DynamicsCompressorNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Element",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ElementInternals",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "else",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "EncodedAudioChunk",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "EncodedVideoChunk",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "encodeURI",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "encodeURIComponent",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "enum",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Error",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ErrorEvent",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "eval",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "EvalError",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Event",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "EventCounts",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "EventSource",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "EventTarget",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "export",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "exports",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "extends",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "false",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "fetch",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "File",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FileList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FileReader",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FileSystem",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FileSystemDirectoryEntry",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FileSystemDirectoryHandle",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FileSystemDirectoryReader",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FileSystemEntry",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FileSystemFileEntry",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FileSystemFileHandle",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FileSystemHandle",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FileSystemWritableFileStream",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FinalizationRegistry",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "finally",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Float32Array",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Float64Array",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "focus",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FocusEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FontFace",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FontFaceSet",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FontFaceSetLoadEvent",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "for",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FormData",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FormDataEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "FragmentDirective",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "frameElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "frames",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "function",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Function",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "GainNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Gamepad",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "GamepadButton",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "GamepadEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "GamepadHapticActuator",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "gc",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Geolocation",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "GeolocationCoordinates",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "GeolocationPosition",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "GeolocationPositionError",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "getComputedStyle",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "getSelection",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "global",
            "sortText": "15",
          },
          {
            "kind": "module",
            "kindModifiers": "",
            "name": "globalThis",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HashChangeEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Headers",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Highlight",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HighlightRegistry",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "history",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "History",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLAllCollection",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLAnchorElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLAreaElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLAudioElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLBaseElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLBodyElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLBRElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLButtonElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLCanvasElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLCollection",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLDataElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLDataListElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLDetailsElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLDialogElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLDivElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLDListElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLEmbedElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLFieldSetElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLFormControlsCollection",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLFormElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLHeadElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLHeadingElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLHRElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLHtmlElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLIFrameElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLImageElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLInputElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLLabelElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLLegendElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLLIElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLLinkElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLMapElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLMediaElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLMenuElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLMetaElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLMeterElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLModElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLObjectElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLOListElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLOptGroupElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLOptionElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLOptionsCollection",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLOutputElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLParagraphElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLPictureElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLPreElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLProgressElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLQuoteElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLScriptElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLSelectElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLSlotElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLSourceElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLSpanElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLStyleElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLTableCaptionElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLTableCellElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLTableColElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLTableElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLTableRowElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLTableSectionElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLTemplateElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLTextAreaElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLTimeElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLTitleElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLTrackElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLUListElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLUnknownElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "HTMLVideoElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IDBCursor",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IDBCursorWithValue",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IDBDatabase",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IDBFactory",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IDBIndex",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IDBKeyRange",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IDBObjectStore",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IDBOpenDBRequest",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IDBRequest",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IDBTransaction",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IDBVersionChangeEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IdleDeadline",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "if",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IIRFilterNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Image",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ImageBitmap",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ImageBitmapRenderingContext",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ImageData",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "implements",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "import",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "in",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "indexedDB",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Infinity",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "innerHeight",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "innerWidth",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "InputDeviceInfo",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "InputEvent",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "instanceof",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Int8Array",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Int16Array",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Int32Array",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "interface",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IntersectionObserver",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "IntersectionObserverEntry",
            "sortText": "15",
          },
          {
            "kind": "module",
            "kindModifiers": "declare",
            "name": "Intl",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "isFinite",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "isNaN",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "isSecureContext",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "JSON",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "KeyboardEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "KeyframeEffect",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "LargestContentfulPaint",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "length",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "let",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "localStorage",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "location",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Location",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "locationbar",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Lock",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "LockManager",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Map",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "matchMedia",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Math",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MathMLElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaCapabilities",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaDeviceInfo",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaDevices",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaElementAudioSourceNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaEncryptedEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaError",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaKeyMessageEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaKeys",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaKeySession",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaKeyStatusMap",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaKeySystemAccess",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaMetadata",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaQueryList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaQueryListEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaRecorder",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaSession",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaSource",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaSourceHandle",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaStream",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaStreamAudioDestinationNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaStreamAudioSourceNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaStreamTrack",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MediaStreamTrackEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "menubar",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MessageChannel",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MessageEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MessagePort",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MIDIAccess",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MIDIConnectionEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MIDIInput",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MIDIInputMap",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MIDIMessageEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MIDIOutput",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MIDIOutputMap",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MIDIPort",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "module",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MouseEvent",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "moveBy",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "moveTo",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MutationObserver",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "MutationRecord",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "NamedNodeMap",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "NaN",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "NavigationPreloadManager",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "navigator",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Navigator",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "new",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Node",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "NodeFilter",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "NodeIterator",
            "sortText": "15",
          },
          {
            "kind": "module",
            "kindModifiers": "declare",
            "name": "NodeJS",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "NodeList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Notification",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "null",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Number",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Object",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "OfflineAudioCompletionEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "OfflineAudioContext",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "OffscreenCanvas",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "OffscreenCanvasRenderingContext2D",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onabort",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onafterprint",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onanimationcancel",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onanimationend",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onanimationiteration",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onanimationstart",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onauxclick",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onbeforeinput",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onbeforeprint",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onbeforetoggle",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onbeforeunload",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onblur",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "oncancel",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "oncanplay",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "oncanplaythrough",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onchange",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onclick",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onclose",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "oncontextlost",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "oncontextmenu",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "oncontextrestored",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "oncopy",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "oncuechange",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "oncut",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ondblclick",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ondevicemotion",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ondeviceorientation",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ondeviceorientationabsolute",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ondrag",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ondragend",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ondragenter",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ondragleave",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ondragover",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ondragstart",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ondrop",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ondurationchange",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onemptied",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onended",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onerror",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onfocus",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onformdata",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ongamepadconnected",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ongamepaddisconnected",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ongotpointercapture",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onhashchange",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "oninput",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "oninvalid",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onkeydown",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onkeyup",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onlanguagechange",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onload",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onloadeddata",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onloadedmetadata",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onloadstart",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onlostpointercapture",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onmessage",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onmessageerror",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onmousedown",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onmouseenter",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onmouseleave",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onmousemove",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onmouseout",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onmouseover",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onmouseup",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onoffline",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ononline",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onpagehide",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onpageshow",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onpaste",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onpause",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onplay",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onplaying",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onpointercancel",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onpointerdown",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onpointerenter",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onpointerleave",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onpointermove",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onpointerout",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onpointerover",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onpointerup",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onpopstate",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onprogress",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onratechange",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onrejectionhandled",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onreset",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onresize",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onscroll",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onscrollend",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onsecuritypolicyviolation",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onseeked",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onseeking",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onselect",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onselectionchange",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onselectstart",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onslotchange",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onstalled",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onstorage",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onsubmit",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onsuspend",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ontimeupdate",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ontoggle",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ontouchcancel",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ontouchend",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ontouchmove",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ontouchstart",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ontransitioncancel",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ontransitionend",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ontransitionrun",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ontransitionstart",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onunhandledrejection",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onvolumechange",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onwaiting",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "onwheel",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "open",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "opener",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Option",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "origin",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "OscillatorNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "outerHeight",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "outerWidth",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "OverconstrainedError",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "package",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PageTransitionEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PannerNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "parent",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "parseFloat",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "parseInt",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Path2D",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PaymentAddress",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PaymentMethodChangeEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PaymentRequest",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PaymentRequestUpdateEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PaymentResponse",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "performance",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Performance",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PerformanceEntry",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PerformanceEventTiming",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PerformanceMark",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PerformanceMeasure",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PerformanceNavigationTiming",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PerformanceObserver",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PerformanceObserverEntryList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PerformancePaintTiming",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PerformanceResourceTiming",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PerformanceServerTiming",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PeriodicWave",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Permissions",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PermissionStatus",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "personalbar",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PictureInPictureEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PictureInPictureWindow",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PointerEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PopStateEvent",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "postMessage",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "print",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "process",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ProcessingInstruction",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ProgressEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Promise",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PromiseRejectionEvent",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "prompt",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Proxy",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PublicKeyCredential",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PushManager",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PushSubscription",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "PushSubscriptionOptions",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "queueMicrotask",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RadioNodeList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Range",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RangeError",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ReadableByteStreamController",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ReadableStream",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ReadableStreamBYOBReader",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ReadableStreamBYOBRequest",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ReadableStreamDefaultController",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ReadableStreamDefaultReader",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ReferenceError",
            "sortText": "15",
          },
          {
            "kind": "module",
            "kindModifiers": "declare",
            "name": "Reflect",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RegExp",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RemotePlayback",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "removeEventListener",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Report",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ReportBody",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "reportError",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ReportingObserver",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Request",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "requestAnimationFrame",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "requestIdleCallback",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "require",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "resizeBy",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ResizeObserver",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ResizeObserverEntry",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ResizeObserverSize",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "resizeTo",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Response",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "return",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCCertificate",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCDataChannel",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCDataChannelEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCDtlsTransport",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCDTMFSender",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCDTMFToneChangeEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCEncodedAudioFrame",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCEncodedVideoFrame",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCError",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCErrorEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCIceCandidate",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCIceTransport",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCPeerConnection",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCPeerConnectionIceErrorEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCPeerConnectionIceEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCRtpReceiver",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCRtpScriptTransform",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCRtpSender",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCRtpTransceiver",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCSctpTransport",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCSessionDescription",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCStatsReport",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "RTCTrackEvent",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "satisfies",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "screen",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Screen",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "screenLeft",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ScreenOrientation",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "screenTop",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "screenX",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "screenY",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "scroll",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "scrollbars",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "scrollBy",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "scrollTo",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "scrollX",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "scrollY",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SecurityPolicyViolationEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Selection",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "self",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ServiceWorker",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ServiceWorkerContainer",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ServiceWorkerRegistration",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "sessionStorage",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Set",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "setImmediate",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "setInterval",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "setTimeout",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ShadowRoot",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SharedArrayBuffer",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SharedWorker",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SourceBuffer",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SourceBufferList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SpeechRecognitionAlternative",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SpeechRecognitionResult",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SpeechRecognitionResultList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "speechSynthesis",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SpeechSynthesis",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SpeechSynthesisErrorEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SpeechSynthesisEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SpeechSynthesisUtterance",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SpeechSynthesisVoice",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "StaticRange",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "statusbar",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "StereoPannerNode",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "stop",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Storage",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "StorageEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "StorageManager",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "String",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "structuredClone",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "StylePropertyMap",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "StylePropertyMapReadOnly",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "StyleSheet",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "StyleSheetList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SubmitEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SubtleCrypto",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "super",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAngle",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimatedAngle",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimatedBoolean",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimatedEnumeration",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimatedInteger",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimatedLength",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimatedLengthList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimatedNumber",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimatedNumberList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimatedPreserveAspectRatio",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimatedRect",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimatedString",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimatedTransformList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimateElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimateMotionElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimateTransformElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGAnimationElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGCircleElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGClipPathElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGComponentTransferFunctionElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGDefsElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGDescElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGEllipseElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEBlendElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEColorMatrixElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEComponentTransferElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFECompositeElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEConvolveMatrixElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEDiffuseLightingElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEDisplacementMapElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEDistantLightElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEDropShadowElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEFloodElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEFuncAElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEFuncBElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEFuncGElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEFuncRElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEGaussianBlurElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEImageElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEMergeElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEMergeNodeElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEMorphologyElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEOffsetElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFEPointLightElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFESpecularLightingElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFESpotLightElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFETileElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFETurbulenceElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGFilterElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGForeignObjectElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGGElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGGeometryElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGGradientElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGGraphicsElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGImageElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGLength",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGLengthList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGLinearGradientElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGLineElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGMarkerElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGMaskElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGMatrix",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGMetadataElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGMPathElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGNumber",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGNumberList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGPathElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGPatternElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGPoint",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGPointList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGPolygonElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGPolylineElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGPreserveAspectRatio",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGRadialGradientElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGRect",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGRectElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGScriptElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGSetElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGStopElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGStringList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGStyleElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGSVGElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGSwitchElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGSymbolElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGTextContentElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGTextElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGTextPathElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGTextPositioningElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGTitleElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGTransform",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGTransformList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGTSpanElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGUnitTypes",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGUseElement",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SVGViewElement",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "switch",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Symbol",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "SyntaxError",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Text",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TextDecoder",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TextDecoderStream",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TextEncoder",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TextEncoderStream",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TextMetrics",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TextTrack",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TextTrackCue",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TextTrackCueList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TextTrackList",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "this",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "throw",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TimeRanges",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ToggleEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "toolbar",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "top",
            "sortText": "15",
          },
          {
            "kind": "function",
            "kindModifiers": "declare",
            "name": "toString",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Touch",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TouchEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TouchList",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TrackEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TransformStream",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TransformStreamDefaultController",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TransitionEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TreeWalker",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "true",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "try",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "type",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "TypeError",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "typeof",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "UIEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Uint8Array",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Uint8ClampedArray",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Uint16Array",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Uint32Array",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "",
            "name": "undefined",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "URIError",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "URL",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "URLSearchParams",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "UserActivation",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "using",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ValidityState",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "var",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "VideoColorSpace",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "VideoDecoder",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "VideoEncoder",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "VideoFrame",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "VideoPlaybackQuality",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "ViewTransition",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "visualViewport",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "VisualViewport",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "void",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "VTTCue",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "VTTRegion",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WakeLock",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WakeLockSentinel",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WaveShaperNode",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WeakMap",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WeakRef",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WeakSet",
            "sortText": "15",
          },
          {
            "kind": "module",
            "kindModifiers": "declare",
            "name": "WebAssembly",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGL2RenderingContext",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLActiveInfo",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLBuffer",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLContextEvent",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLFramebuffer",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLProgram",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLQuery",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLRenderbuffer",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLRenderingContext",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLSampler",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLShader",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLShaderPrecisionFormat",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLSync",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLTexture",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLTransformFeedback",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLUniformLocation",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebGLVertexArrayObject",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebKitCSSMatrix",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "webkitURL",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebSocket",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebTransport",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebTransportBidirectionalStream",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebTransportDatagramDuplexStream",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WebTransportError",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WheelEvent",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "while",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "window",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Window",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "with",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Worker",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "Worklet",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WritableStream",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WritableStreamDefaultController",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "WritableStreamDefaultWriter",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "XMLDocument",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "XMLHttpRequest",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "XMLHttpRequestEventTarget",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "XMLHttpRequestUpload",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "XMLSerializer",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "XPathEvaluator",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "XPathExpression",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "XPathResult",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "declare",
            "name": "XSLTProcessor",
            "sortText": "15",
          },
          {
            "kind": "keyword",
            "kindModifiers": "",
            "name": "yield",
            "sortText": "15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "AudioProcessingEvent",
            "sortText": "z15",
          },
          {
            "kind": "function",
            "kindModifiers": "deprecated,declare",
            "name": "blur",
            "sortText": "z15",
          },
          {
            "kind": "function",
            "kindModifiers": "deprecated,declare",
            "name": "captureEvents",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "clientInformation",
            "sortText": "z15",
          },
          {
            "kind": "function",
            "kindModifiers": "deprecated,declare",
            "name": "escape",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "event",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "external",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "External",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "HTMLDirectoryElement",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "HTMLDocument",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "HTMLFontElement",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "HTMLFrameElement",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "HTMLFrameSetElement",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "HTMLMarqueeElement",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "HTMLParamElement",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "MimeType",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "MimeTypeArray",
            "sortText": "z15",
          },
          {
            "kind": "const",
            "kindModifiers": "deprecated,declare",
            "name": "name",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "onkeypress",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "onorientationchange",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "onunload",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "onwebkitanimationend",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "onwebkitanimationiteration",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "onwebkitanimationstart",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "onwebkittransitionend",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "orientation",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "pageXOffset",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "pageYOffset",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "PerformanceNavigation",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "PerformanceTiming",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "Plugin",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "PluginArray",
            "sortText": "z15",
          },
          {
            "kind": "function",
            "kindModifiers": "deprecated,declare",
            "name": "releaseEvents",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "ScriptProcessorNode",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "status",
            "sortText": "z15",
          },
          {
            "kind": "var",
            "kindModifiers": "deprecated,declare",
            "name": "TextEvent",
            "sortText": "z15",
          },
          {
            "kind": "function",
            "kindModifiers": "deprecated,declare",
            "name": "unescape",
            "sortText": "z15",
          },
        ]
      `);
  });

  test('referencing block params', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent extends Component {
        <template>
          {{#each "abc" as |letter|}}
            {{l%}}
          {{/each}}
        </template>
      }
    `;

    expect(
      await requestCompletionItem(
        'ts-template-imports-app/src/index.gts',
        'glimmer-ts',
        code,
        'letter',
      ),
    ).toMatchInlineSnapshot(`
      {
        "kind": "const",
        "kindModifiers": "",
        "name": "letter",
        "sortText": "11",
      }
    `);
  });

  test('referencing module-scope identifiers', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      const greeting: string = 'hello';

      export default class MyComponent extends Component {
        <template>
          {{g%}}
        </template>
      }
    `;
    const completions = await requestCompletion(
      'ts-template-imports-app/src/index.ts',
      'typescript',
      code,
    );
    const matches = completions.filter((item: any) => item.name === 'greeting');

    expect(matches).toMatchInlineSnapshot(`
      [
        {
          "kind": "const",
          "kindModifiers": "",
          "name": "greeting",
          "sortText": "11",
        },
      ]
    `);
  });

  test.skip('immediately after a change', async () => {
    const code = stripIndent`
      import Component from '@glimmer/component';

      export default class MyComponent<T> extends Component {
        <template>
          {{#each "abc" as |letter|}}
            {{}}
          {{/each}}
        </template>
      }
    `;

    expect(
      await requestCompletion('ts-template-imports-app/src/index.gts', 'typescript', code),
    ).toMatchInlineSnapshot();
  });
});

async function requestCompletionItem(
  fileName: string,
  languageId: string,
  content: string,
  itemLabel: string,
): Promise<any> {
  const completions = await requestCompletion(fileName, languageId, content);
  let completion = completions.find((item: any) => item.name === itemLabel);
  expect(completion).toBeDefined();
  return completion!;
}

async function requestCompletion(
  fileName: string,
  languageId: string,
  contentWithCursor: string,
): Promise<any> {
  const [offset, content] = extractCursor(contentWithCursor);
  const document = await prepareDocument(fileName, languageId, content);
  const res = await performCompletionRequest(document, offset);
  return res;
}

async function performCompletionRequest(document: TextDocument, offset: number): Promise<any> {
  const workspaceHelper = await getSharedTestWorkspaceHelper();
  const res = await workspaceHelper.tsserver.message({
    seq: workspaceHelper.nextSeq(),
    command: 'completions',
    arguments: {
      file: URI.parse(document.uri).fsPath,
      position: offset,
    },
  });

  expect(res.success).toBe(true);
  return res.body;
}
