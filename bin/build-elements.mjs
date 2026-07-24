/**
 * Ideally TS would provide this information to us, but it does not.
 */
import { htmlElementAttributes } from 'html-element-attributes';
import { svgElementAttributes } from 'svg-element-attributes';
import { ariaAttributes } from 'aria-attributes';
import { htmlEventAttributes } from 'html-event-attributes';
import { svgEventAttributes } from 'svg-event-attributes';
import { parse } from '@babel/parser';
import { traverse } from '@babel/core';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ts = require.resolve('typescript');
const libDomFile = resolve(ts, '..', 'lib.dom.d.ts');
const source = readFileSync(libDomFile).toString();
const ast = parse(source, {
  plugins: [['typescript', { dts: true }]],
});

/**
 * These elements are not specifyable by userland ember/glimmer and don't need typing
 */
const SKIP = new Set(['html', 'body']);

// Ember allow setting both attributes and properties for HTML elements, {html,svg}-element-attributes only provides
// attributes.
const runtimeAdditionalProperties = new Map([
  ['HTMLElement', new Map()],
  [
    'HTMLSelectElement',
    new Map([
      ['length', 'number'],
      ['value', 'AttrValue'],
    ]),
  ],
  ['HTMLInputElement', new Map([['indeterminate', 'boolean']])],
  ['HTMLTextAreaElement', new Map([['value', 'AttrValue']])],
  ['SVGSVGElement', new Map([['xmlns', 'AttrValue']])],
]);

// Valid attributes missing from svg-element-attributes@2.1.0, whose crawler
// misses the SVG 2 presentation attributes list (fix proposed upstream:
// https://github.com/wooorm/svg-element-attributes/pull/5 — remove these
// once a release includes it and the dependency is bumped).
const missingSpecAttributes = new Map([
  // SVG 2 presentation attribute; may be specified on any SVG element:
  // https://svgwg.org/svg2-draft/coords.html#VectorEffectProperty
  ['GlobalSVG', new Map([['vector-effect', 'AttrValue']])],
  // Filter Effects 1 applies these to <feDropShadow>, not just <feFlood>:
  // https://drafts.fxtf.org/filter-effects/#feDropShadowElement
  [
    'SVGFEDropShadowElement',
    new Map([
      ['flood-color', 'AttrValue'],
      ['flood-opacity', 'AttrValue'],
    ]),
  ],
]);

const GLOBAL_HTML_ATTRIBUTES_NAME = 'GlobalHTMLAttributes';
const GLOBAL_SVG_ATTRIBUTES_NAME = 'GlobalSVGAttributes';
const htmlElementsMap = new Map([[GLOBAL_HTML_ATTRIBUTES_NAME, 'HTMLElement']]);
const svgElementsMap = new Map([[GLOBAL_SVG_ATTRIBUTES_NAME, 'SVGElement']]);
const mathmlElementsMap = new Map();

traverse(ast, {
  TSInterfaceDeclaration(path) {
    switch (path.node.id.name) {
      case 'HTMLElementTagNameMap': {
        path.node.body.body.forEach(({ key, typeAnnotation }) => {
          htmlElementsMap.set(key.value, typeAnnotation.typeAnnotation.typeName.name);
        });

        break;
      }

      case 'MathMLElementTagNameMap': {
        path.node.body.body.forEach(({ key, typeAnnotation }) => {
          mathmlElementsMap.set(key.value, typeAnnotation.typeAnnotation.typeName.name);
        });

        break;
      }

      case 'SVGElementTagNameMap': {
        path.node.body.body.forEach(({ key, typeAnnotation }) => {
          svgElementsMap.set(key.value, typeAnnotation.typeAnnotation.typeName.name);
        });

        break;
      }
    }
  },
});

function createAriaAttributesInterface() {
  let ariaContent = `interface GlobalAriaAttributes {\n`;
  ariaAttributes.forEach((k) => {
    ariaContent += `  ['${k}']: AttrValue;\n`;
  });
  ariaContent += '}\n';
  return ariaContent;
}

function createHtmlElementsAttributesMap() {
  let htmlElementsContent = [
    `import { AttrValue } from '../index';`,
    ``,
    `declare global {`,
    ``,
  ].join('\n');

  const processed = new Set();

  htmlElementsContent += createAriaAttributesInterface();

  function emitAttributeInterface(type, keys, name) {
    if (!type || processed.has(type)) return;
    processed.add(type);
    const interfaceName = type + 'Attributes';
    const extend =
      name === GLOBAL_HTML_ATTRIBUTES_NAME
        ? 'extends GlobalAriaAttributes'
        : `extends ${GLOBAL_HTML_ATTRIBUTES_NAME}`;
    htmlElementsContent += `interface ${interfaceName} ${extend} {\n`;
    keys.forEach((k) => {
      htmlElementsContent += `  ['${k}']: AttrValue;\n`;
    });

    const properties = runtimeAdditionalProperties.get(type);
    if (properties) {
      properties.forEach((value, property) => {
        htmlElementsContent += `  ['${property}']: ${value};\n`;
      });
    }

    if (name === GLOBAL_HTML_ATTRIBUTES_NAME) {
      htmlEventAttributes.forEach((k) => {
        htmlElementsContent += `  ['${k}']: AttrValue;\n`;
      });
    }
    htmlElementsContent += '}\n';
  }

  let elementToAttributes = new Map();

  Object.entries(htmlElementAttributes).forEach(([elementName, keys]) => {
    if (elementName === '*') {
      elementName = GLOBAL_HTML_ATTRIBUTES_NAME;
      htmlElementsMap.set(elementName, 'GlobalHTML');
    }

    if (SKIP.has(elementName)) {
      return;
    }

    const elementType = htmlElementsMap.get(elementName);

    if (!elementType) {
      return;
    }

    emitAttributeInterface(elementType, keys, elementName);

    // Not an element, but we use this prefix for attributes
    if (elementType === 'GlobalHTML') {
      return;
    }

    elementToAttributes.set(elementType, `${elementType}Attributes`);
  });

  emitAttributeInterface('HTMLElement', [], 'HTMLElement');
  elementToAttributes.set('HTMLElement', GLOBAL_HTML_ATTRIBUTES_NAME);

  // Manually add entries
  elementToAttributes.set('HTMLBodyElement', GLOBAL_HTML_ATTRIBUTES_NAME);
  elementToAttributes.set('HTMLDataListElement', GLOBAL_HTML_ATTRIBUTES_NAME);
  elementToAttributes.set('HTMLHtmlElement', GLOBAL_HTML_ATTRIBUTES_NAME);
  elementToAttributes.set('HTMLPictureElement', GLOBAL_HTML_ATTRIBUTES_NAME);
  elementToAttributes.set('HTMLSpanElement', GLOBAL_HTML_ATTRIBUTES_NAME);
  elementToAttributes.set('HTMLTitleElement', GLOBAL_HTML_ATTRIBUTES_NAME);

  // Sort by element type
  elementToAttributes = new Map([...elementToAttributes].sort());

  htmlElementsContent += [
    `/**`,
    ` * @internal`,
    ` * @private - not for use outside of Glint`,
    ` */`,
    `interface GlintHtmlElementAttributesMap {`,
    ...Array.from(elementToAttributes.entries()).map(([elementType, attributesType]) => {
      return `  ['${elementType}']: ${attributesType};`;
    }),
    `}`,
    ``,
  ].join('\n');

  // Closing brace for `declare global`
  htmlElementsContent += '}\n';

  return htmlElementsContent;
}

function createSvgElementAttributesMap() {
  let svgElementsContent = [`declare global {`, ``].join('\n');

  function emitAttributeInterface(type, keys, name) {
    const interfaceName = type + 'Attributes';
    const extend =
      name === GLOBAL_SVG_ATTRIBUTES_NAME
        ? 'extends GlobalHTMLAttributes'
        : `extends ${GLOBAL_SVG_ATTRIBUTES_NAME}`;
    svgElementsContent += `interface ${interfaceName} ${extend} {\n`;
    keys.forEach((k) => {
      svgElementsContent += `  ['${k}']: AttrValue;\n`;
    });

    const properties = runtimeAdditionalProperties.get(type);
    if (properties) {
      properties.forEach((value, property) => {
        svgElementsContent += `  ['${property}']: ${value};\n`;
      });
    }

    const missingAttributes = missingSpecAttributes.get(type);
    if (missingAttributes) {
      missingAttributes.forEach((value, attribute) => {
        svgElementsContent += `  ['${attribute}']: ${value};\n`;
      });
    }

    if (name === GLOBAL_SVG_ATTRIBUTES_NAME) {
      svgEventAttributes.forEach((k) => {
        svgElementsContent += `  ['${k}']: AttrValue;\n`;
      });
    }

    svgElementsContent += `}\n`;
  }

  let elementToAttributes = new Map();

  Object.entries(svgElementAttributes).forEach(([elementName, keys]) => {
    if (elementName === '*') {
      elementName = GLOBAL_SVG_ATTRIBUTES_NAME;
      svgElementsMap.set(elementName, 'GlobalSVG');
    }

    const elementType = svgElementsMap.get(elementName);

    if (!elementType) {
      return;
    }

    emitAttributeInterface(elementType, keys, elementName);

    // Not an element, but we use this prefix for attributes
    if (elementType === 'GlobalSVG') {
      return;
    }

    elementToAttributes.set(elementType, `${elementType}Attributes`);
  });

  emitAttributeInterface('SVGElement', [], 'SVGElement');
  elementToAttributes.set('SVGElement', GLOBAL_SVG_ATTRIBUTES_NAME);

  elementToAttributes = new Map([...elementToAttributes].sort());

  svgElementsContent += [
    `/**`,
    ` * @internal`,
    ` * @private - not for use outside of Glint`,
    ` */`,
    `interface GlintSvgElementAttributesMap {`,
    ...Array.from(elementToAttributes.entries()).map(([elementType, attributesType]) => {
      return `  ['${elementType}']: ${attributesType};`;
    }),
    `}`,
    ``,
  ].join('\n');

  // Closing brace for `declare global`
  svgElementsContent += '}\n';

  return svgElementsContent;
}

const filePath = resolve(
  fileURLToPath(import.meta.url),
  '../../packages/template/-private/dsl/elements.d.ts',
);

writeFileSync(
  filePath,
  [
    '// Auto-generated by bin/build-elements.mjs',
    '// this server to provide the html attributes for each element',
    '',
    createHtmlElementsAttributesMap(),
    createSvgElementAttributesMap(),
  ].join('\n'),
);
