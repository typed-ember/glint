import Component from '@glimmer/component';
import { TOC } from '@ember/component/template-only';

const lib = {
  MaybeComponent: undefined as TOC<{ Args: { arg: string } }> | undefined
};

interface ListSignature<T> {
  Args: {
    items: Array<T>;
  };
  Blocks: {
    default: [item: T];
  };
}

class List<T> extends Component<ListSignature<T>> {
  <template>
    <ol>
      {{#each @items as |item|}}
        <li>{{yield item}}</li>
      {{/each}}
    </ol>
  </template>
}

const NUMS = [1, 2, 3];

<template>
  <lib.MaybeComponent @arg="hi" />

  {{! @glint-expect-error: missing arg }}
  <lib.MaybeComponent />

  <List @items={{NUMS}} as |item|>
    #{{item}}
  </List>
</template>
