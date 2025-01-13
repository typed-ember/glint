import '@glint/environment-ember-loose';
import '@glint/environment-ember-template-imports';

// TS-PLUGIN: I had to add the .gts extension in order for this to work, otherwise
// Cannot find module './Greeting' or its corresponding type declarations. [ts-plugin(2307)]

// import Greeting from './Greeting';
import Greeting from './Greeting.gts';

<template>
  <Greeting @target="World" />
</template>
