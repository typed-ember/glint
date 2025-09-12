import { CodeInformation } from '@volar/language-server/node.js';

/**
 * Based on https://github.com/machty/vue-language-tools/blob/deff856aa8c15f691544e646519215a15aacbef1/packages/language-core/lib/codegen/codeFeatures.ts
 *
 * This file exports a "code features" object which provides a useful shorthand/shortcut
 * for specifying a nubmer of Volar CodeInformation configuration options in the code
 * we use for mapping between source code (e.g. .gts files) and transformed (i.e. type-checkable TS) code.
 *
 * Volar uses the CodeInformation we pass along with each mapping to determine what sort of language
 * features should be activated/processed for a given span of code.
 */
const raw = {
  all: {
    verification: true,
    completion: true,
    semantic: true,
    navigation: true,
  },
  withoutHighlight: {
    semantic: { shouldHighlight: () => false },
    verification: true,
    navigation: true,
    completion: true,
  },
} satisfies Record<string, CodeInformation>;

export const codeFeatures = raw as {
  [K in keyof typeof raw]: CodeInformation;
};
