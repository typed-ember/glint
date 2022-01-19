// @ts-check

/** @type {() => import('@glint/config').GlintEnvironmentConfig} */
module.exports = () => ({
  extensions: {
    '.custom': {
      kind: 'typed-script',
    },
  },
});
