// @ts-check

const TAG_NAME = '___tpl';

/** @type {() => import('@glint/config').GlintEnvironmentConfig} */
module.exports = () => ({
  tags: {
    'glint-environment-custom-test': {
      hbs: {
        typesSource: '@glint/environment-glimmerx/-private/dsl',
        globals: [],
      },
    },
  },
  extensions: {
    '.custom': {
      kind: 'typed-script',

      // This environment provides a super-pared-down version of the proposed
      // .gts format for embedded templates. Unlike full .gts, this only supports
      // templates in expression position, with no implicit default export.
      preprocess: (source) => ({
        contents: source
          .replace(/[<]template>/g, `${TAG_NAME}\``.padEnd('<template>'.length))
          .replace(/<\/template>/g, '`'.padStart('</template>'.length)),
        data: {
          hasTemplates: source.includes('<' + 'template>'),
        },
      }),

      transform: (data, { ts, context }) =>
        function visit(original) {
          let f = ts.factory;
          let node = original;

          if (ts.isSourceFile(node) && data.hasTemplates) {
            node = f.updateSourceFile(node, [
              f.createImportDeclaration(
                [],
                [],
                f.createImportClause(
                  false,
                  undefined,
                  f.createNamedImports([makeImportSpecifier(f)])
                ),
                f.createStringLiteral('glint-environment-custom-test')
              ),
              ...node.statements,
            ]);
          }

          let result = ts.visitEachChild(node, visit, context);
          result.forEachChild((node) => {
            Object.assign(node, { parent: result });
          });
          return result;
        },
    },
  },
});

// 🙄 TS 4.5 prepended a new param to `createImportSpecifier`
function makeImportSpecifier(f) {
  let local = f.createIdentifier(TAG_NAME);
  let foreign = f.createIdentifier('hbs');

  // TS >= 4.5 (isTypeOnly, propertyName, name)
  let node = f.createImportSpecifier(false, foreign, local);
  if (node.propertyName === false) {
    // TS <= 4.4 (propertyName, name)
    node = f.createImportSpecifier(foreign, local);
  }

  return node;
}
