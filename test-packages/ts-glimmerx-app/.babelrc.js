module.exports = function (api) {
  return {
    plugins: [['@glimmer/babel-plugin-glimmer-env', { DEBUG: !api.env('production') }]],
    presets: [
      '@babel/preset-env',
      '@glimmerx/babel-preset',
      ['@babel/preset-typescript', { onlyRemoveTypeImports: true }],
    ],
  };
};
