import { createRequire } from 'node:module';
import { GlintEnvironmentConfig, GlintSpecialFormConfig } from '@glint/ember-tsc/config-types';
import { preprocess } from './preprocess.js';
import { transform } from './transform.js';

/**
 * Probe for the ember-source >= 7.1 built-in keyword set at config-load time.
 *
 * The 7.1 keywords (and, or, eq, fn, hash, not, gt/gte/lt/lte/neq, on, element,
 * array) ship with ember-source 7.1 (RFCs 389, 470, 560, 561, 562, 997, 998,
 * 999, 1000). On older versions consumers must import them from
 * `ember-truth-helpers` / `@ember/helper`. Including these names in the strict
 * mode `globals` set unconditionally suppresses TypeScript's
 * "Cannot find name 'X'" diagnostic on <7.1 (because the transform emits
 * `__glintDSL__.Globals.X` instead of a bare `X`), which in turn disables the
 * `Add import from '...'` quick-fix and IDE autocomplete from user imports.
 *
 * Resolving from this module's URL means the probe walks the consumer's
 * `node_modules` tree, so it reflects the host project's installed
 * `ember-source`. Any failure (missing package, unreadable JSON, malformed
 * version) collapses to `false` so the safe default is to assume the
 * consumer is on a pre-7.1 build and let users import explicitly.
 */
function hasEmber71BuiltIns(): boolean {
  try {
    const require_ = createRequire(import.meta.url);
    const pkg = require_('ember-source/package.json') as { version?: unknown };
    if (typeof pkg.version !== 'string') return false;
    const [majorStr, minorStr] = pkg.version.split('.', 2);
    const major = Number(majorStr);
    const minor = Number(minorStr);
    if (!Number.isFinite(major) || !Number.isFinite(minor)) return false;
    return major > 7 || (major === 7 && minor >= 1);
  } catch {
    return false;
  }
}

export default function emberTemplateImportsEnvironment(
  options: Record<string, unknown>,
): GlintEnvironmentConfig {
  let additionalSpecialForms =
    typeof options['additionalSpecialForms'] === 'object'
      ? (options['additionalSpecialForms'] as GlintSpecialFormConfig)
      : {};

  const additionalGlobalSpecialForms = additionalSpecialForms.globals ?? {};

  const additionalGlobals = Array.isArray(options['additionalGlobals'])
    ? options['additionalGlobals']
    : [];

  const globalsForEmber = [
    'action',
    'component',
    'debugger',
    'each',
    'each-in',
    'has-block',
    'has-block-params',
    'helper',
    'if',
    'in-element',
    'let',
    'log',
    'modifier',
    'mount',
    'mut',
    'outlet',
    'unbound',
    'unless',
    'with',
    'yield',
  ];

  /*
    Ember 7.1+ built-in keywords (RFCs 389, 470, 560, 561, 562, 997, 998, 999,
    1000). Their template-side signatures live in `KeywordsForEmber71` in
    `types/-private/dsl/globals.d.ts` and are gated on `ember-source >= 7.1.0`
    via the `HasEmber71BuiltIns` probe.
  */
  const globalsForEmber71 = [
    'and',
    'array',
    'element',
    'eq',
    'fn',
    'gt',
    'gte',
    'hash',
    'lt',
    'lte',
    'neq',
    'not',
    'on',
    'or',
  ];

  return {
    template: {
      typesModule: '@glint/ember-tsc/-private/dsl',
      specialForms: {
        globals: {
          if: 'if',
          unless: 'if-not',
          yield: 'yield',
          component: 'bind-invokable',
          modifier: 'bind-invokable',
          helper: 'bind-invokable',
          ...additionalGlobalSpecialForms,
        },
        imports: {
          '@ember/helper': {
            array: 'array-literal',
            hash: 'object-literal',
            ...additionalSpecialForms.imports?.['@ember/helper'],
          },
          ...additionalSpecialForms.imports,
        },
      },
      globals: [
        ...globalsForEmber,
        ...(hasEmber71BuiltIns() ? globalsForEmber71 : []),
        ...Object.keys(additionalGlobalSpecialForms),
        ...additionalGlobals,
      ],
    },
    extensions: {
      '.gts': {
        kind: 'typed-script',
        preprocess,
        transform,
      },
      '.gjs': {
        kind: 'untyped-script',
        preprocess,
        transform,
      },
    },
  };
}
