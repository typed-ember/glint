import Greeting from './Greeting';
import GreetingTemplateOnly from './Greeting-template-only.gts';

<template>
  <Greeting @target="World" />
  <GreetingTemplateOnly @message="hello" @target="World" />
</template>
