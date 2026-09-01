import { Avatar, Counter, Greeting, TodoList } from "#components/index.ts";

<template>
  <h1>Welcome to Ember</h1>

  <Greeting @name="Ember" class="greeting">
    (type-checked by TypeScript 7)
  </Greeting>

  <Avatar @name="Nully Vox Populi" />

  <Counter @initial={{3}} @step={{2}} as |count|>
    {{#if (gt count 9000)}}
      <p>It's over 9000!</p>
    {{/if}}
  </Counter>

  <TodoList />

  {{outlet}}
</template>
