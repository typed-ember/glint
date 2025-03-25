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

const elements = new Set();
traverse(ast, {
  TSInterfaceDeclaration: function (path) {
    if (path.node.id.name === 'HTMLElementTagNameMap') {
      const items = path.node.body.body;
      for (const item of items) {
        elements.add(item.typeAnnotation.typeAnnotation.typeName.name);
      }
    }
    if (path.node.id.name === 'SVGElementTagNameMap') {
      const items = path.node.body.body;
      for (const item of items) {
        elements.add(item.typeAnnotation.typeAnnotation.typeName.name);
      }
    }
  },
});

let augmentations = [];
for (const element of elements) {
  augmentations.push(`
  interface ${element} {
    [GlintSymbol]: '${element}';
  }`);
}

const prefix = `//generated by scrips/build-augmentations.mjs\n`;
const filePath = resolve(
  fileURLToPath(import.meta.url),
  '../../packages/template/-private/dsl/lib.dom.augmentation.d.ts',
);
let content = prefix;
content += 'export const GlintSymbol: unique symbol = Symbol();\n\n';
content += 'declare global {\n';
content += augmentations.join('\n\n') + '\n}';
writeFileSync(filePath, content);
