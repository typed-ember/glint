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

const GLOBAL_HTML_ATTRIBUTES_NAME = 'GlobalHTMLAttributes';
const GLOBAL_SVG_ATTRIBUTES_NAME = 'GlobalSVGAttributes';
const htmlElementsMap = new Map([[GLOBAL_HTML_ATTRIBUTES_NAME, 'HTMLElement']]);
const svgElementsMap = new Map([[GLOBAL_SVG_ATTRIBUTES_NAME, 'SVGElement']]);
const mathmlElementsMap = new Map();

traverse(ast, {
  TSInterfaceDeclaration: function (path) {
    if (path.node.id.name === 'HTMLElementTagNameMap') {
      const items = path.node.body.body;
      for (const item of items) {
        htmlElementsMap.set(item.key.value, item.typeAnnotation.typeAnnotation.typeName.name);
      }
    }
    if (path.node.id.name === 'SVGElementTagNameMap') {
      const items = path.node.body.body;
      for (const item of items) {
        svgElementsMap.set(item.key.value, item.typeAnnotation.typeAnnotation.typeName.name);
      }
    }
    if (path.node.id.name === 'MathMLElementTagNameMap') {
      const items = path.node.body.body;
      for (const item of items) {
        mathmlElementsMap.set(item.key.value, item.typeAnnotation.typeAnnotation.typeName.name);
      }
    }
  },
});

function createHtmlElementsAttributesMap() {
  let htmlElementsContent = `
import { AttrValue } from '../index';

declare global {
`;
  const processed = new Set();

  let mergedHtmlElements = `
/**
 * @internal
 * @private - not for use outside of Glint
 */
interface GlintHtmlElementAttributesMap {\n`;

  function emitAttributeInterface(type, keys, name) {
    if (!type || processed.has(type)) return;
    processed.add(type);
    const interfaceName = type + 'Attributes';
    const extend =
      name === GLOBAL_HTML_ATTRIBUTES_NAME ? '' : `extends ${GLOBAL_HTML_ATTRIBUTES_NAME}`;
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
      ariaAttributes.forEach((k) => {
        htmlElementsContent += `  ['${k}']: AttrValue;\n`;
      });
      htmlEventAttributes.forEach((k) => {
        htmlElementsContent += `  ['${k}']: AttrValue;\n`;
      });
    }
    htmlElementsContent += '}\n';
  }

  function addMapEntry(type) {
    const interfaceName =
      type === 'HTMLElement' ? GLOBAL_HTML_ATTRIBUTES_NAME : type + 'Attributes';
    mergedHtmlElements += `  ['${type}']: ${interfaceName};\n`;
  }

  Object.entries(htmlElementAttributes).forEach(([name, keys]) => {
    if (name === '*') {
      name = GLOBAL_HTML_ATTRIBUTES_NAME;
      htmlElementsMap.set(name, 'GlobalHTML');
    }
    if (SKIP.has(name)) return;
    const type = htmlElementsMap.get(name);

    emitAttributeInterface(type, keys, name);

    // Not an element, but we use this prefix for attributes
    if (type === 'GlobalHTML') return;

    addMapEntry(type);
  });
  emitAttributeInterface('HTMLElement', [], 'HTMLElement');
  addMapEntry('HTMLElement');

  mergedHtmlElements += `}\n`;

  htmlElementsContent += mergedHtmlElements + '}\n';
  return htmlElementsContent;
}

function createSvgElementAttributesMap() {
  let svgElementsContent = `
declare global {
`;
  let mergedSvgElements = `

/**
 * @internal
 * @private - not for use outside of Glint
 */
interface GlintSvgElementAttributesMap {\n`;

  function emitAttributeInterface(type, keys, name) {
    const interfaceName = type + 'Attributes';
    const extend =
      name === GLOBAL_SVG_ATTRIBUTES_NAME ? '' : `extends ${GLOBAL_SVG_ATTRIBUTES_NAME}`;
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

    if (name === GLOBAL_SVG_ATTRIBUTES_NAME) {
      svgEventAttributes.forEach((k) => {
        svgElementsContent += `  ['${k}']: AttrValue;\n`;
      });
    }
    svgElementsContent += `}\n`;
  }

  function addMapEntry(type) {
    const interfaceName = type === 'SVGElement' ? GLOBAL_SVG_ATTRIBUTES_NAME : type + 'Attributes';

    mergedSvgElements += `  ['${type}']: ${interfaceName};\n`;
  }

  Object.entries(svgElementAttributes).forEach(([name, keys]) => {
    if (name === '*') {
      name = GLOBAL_SVG_ATTRIBUTES_NAME;
      svgElementsMap.set(name, 'GlobalSVG');
    }
    const type = svgElementsMap.get(name);

    if (!type) return;

    emitAttributeInterface(type, keys, name);

    // Not an element, but we use this prefix for attributes
    if (type === 'GlobalSVG') return;

    addMapEntry(type);
  });
  emitAttributeInterface('SVGElement', [], 'SVGElement');
  addMapEntry('SVGElement');

  mergedSvgElements += `}\n`;
  svgElementsContent += mergedSvgElements + '}\n';
  return svgElementsContent;
}

const prefix = `//generated by scrips/build-elements.mjs
// this server to provide the html attributes for each element
`;
const filePath = resolve(
  fileURLToPath(import.meta.url),
  '../../packages/template/-private/dsl/elements.d.ts',
);
const content = prefix + createHtmlElementsAttributesMap() + createSvgElementAttributesMap();
writeFileSync(filePath, content);
