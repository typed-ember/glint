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

// Ember allow setting both attributes and properties for HTML elements, {html,svg}-element-attributes only provides
// attributes.
const htmlElementProperties = new Map([
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

const htmlElementsMap = new Map();
const svgElementsMap = new Map();
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

  let mergedHtmlElements = 'interface GlintHtmlElementAttributesMap {\n';
  Object.entries(htmlElementAttributes).forEach(([name, keys]) => {
    if (name === '*') {
      name = 'GlobalAttributes';
      htmlElementsMap.set(name, 'Global');
    }
    const type = htmlElementsMap.get(name);
    if (!type || processed.has(type)) return;
    processed.add(type);
    const interfaceName = type + 'Attributes';
    const extend = name === 'GlobalAttributes' ? '' : 'extends GlobalAttributes';
    htmlElementsContent += `interface ${interfaceName} ${extend} {\n`;
    keys.forEach((k) => {
      htmlElementsContent += `  ['${k}']: AttrValue;\n`;
    });

    const properties = htmlElementProperties.get(type);
    if (properties) {
      properties.forEach((value, property) => {
        htmlElementsContent += `  ['${property}']: ${value};\n`;
      });
    }

    if (name === 'GlobalAttributes') {
      ariaAttributes.forEach((k) => {
        htmlElementsContent += `  ['${k}']: AttrValue;\n`;
      });
      htmlEventAttributes.forEach((k) => {
        htmlElementsContent += `  ['${k}']: AttrValue;\n`;
      });
    }
    htmlElementsContent += '}\n';

    // Global is not an element, so it doesn't belong in the merged map
    if (type === 'Global') return;

    mergedHtmlElements += `  ['${type}']: ${interfaceName};\n`;
  });

  mergedHtmlElements += `}\n`;

  htmlElementsContent += mergedHtmlElements + '}\n';
  return htmlElementsContent;
}

function createSvgElementAttributesMap() {
  let svgElementsContent = `
declare global {
`;
  const processed = new Set();
  let mergedSvgElements = 'interface GlintSvgElementAttributesMap {\n';
  Object.entries(svgElementAttributes).forEach(([name, keys]) => {
    if (name === '*') {
      name = 'GlobalAttributes';
    }
    const type = svgElementsMap.get(name);
    if (!type || processed.has(type)) {
      return;
    }
    processed.add(type);
    const interfaceName = type + 'Attributes';
    const extend = name === 'GlobalAttributes' ? '' : 'extends GlobalAttributes';
    svgElementsContent += `interface ${interfaceName} ${extend} {\n`;
    keys.forEach((k) => {
      svgElementsContent += `  ['${k}']: AttrValue;\n`;
    });

    const properties = htmlElementProperties.get(type);
    if (properties) {
      properties.forEach((value, property) => {
        svgElementsContent += `  ['${property}']: ${value};\n`;
      });
    }

    if (name === 'GlobalAttributes') {
      svgEventAttributes.forEach((k) => {
        svgElementsContent += `  ['${k}']: AttrValue;\n`;
      });
    }
    mergedSvgElements += `  ['${type}']: ${interfaceName};\n`;
    svgElementsContent += `}\n`;
  });

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
