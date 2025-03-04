import '@glint/environment-ember-loose';
import '@glint/environment-ember-template-imports';

import {value as valueExtensionless} from './normal-typescript-file';
import {value as valueWithExtension} from './normal-typescript-file.js';

// TODO: there is a discrepancy between how legacy LS mode and TS Plugin mode handle extension-less imports of .gts files.

// Omitting extensions:
// - WORKS for legacy LS mode
// - FAILS for TS Plugin mode
// import Greeting from './Greeting';

// Including `.gts` extension:
// - WORKS for both legacy LS mode and TS Plugin mode
//   - Resolves (via Hover) to: module "(LOCAL_FS_PATH)/glint/packages/vscode/__fixtures__/template-imports-app-ts-plugin/src/Greeting.gts"

import Greeting from './Greeting.gts';

<template>
  {{valueExtensionless}}
  {{valueWithExtension}}
  <Greeting @target="World" />
</template>
