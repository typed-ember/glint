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
    // structure: true,
  },
  none: {},
  verification: {
    verification: true,
  },
  completion: {
    completion: true,
  },
  additionalCompletion: {
    completion: { isAdditional: true },
  },
  withoutCompletion: {
    verification: true,
    semantic: true,
    navigation: true,
  },
  navigation: {
    navigation: true,
  },
  navigationWithoutRename: {
    navigation: { shouldRename: () => false },
  },
  navigationAndCompletion: {
    navigation: true,
    completion: true,
  },
  navigationAndAdditionalCompletion: {
    navigation: true,
    completion: { isAdditional: true },
  },
  navigationAndVerification: {
    navigation: true,
    verification: true,
  },
  withoutNavigation: {
    verification: true,
    completion: true,
    semantic: true,
  },
  withoutHighlight: {
    semantic: { shouldHighlight: () => false },
    verification: true,
    navigation: true,
    completion: true,
    // structure: true,
  },
  withoutHighlightAndNavigation: {
    semantic: { shouldHighlight: () => false },
    verification: true,
    completion: true,
  },
  withoutHighlightAndCompletion: {
    semantic: { shouldHighlight: () => false },
    verification: true,
    navigation: true,
  },
  withoutHighlightAndCompletionAndNavigation: {
    semantic: { shouldHighlight: () => false },
    verification: true,
  },
} satisfies Record<string, CodeInformation>;

export const codeFeatures = raw as {
  [K in keyof typeof raw]: CodeInformation;
};
