import Component from '@glimmer/component';
import { TOC } from '@ember/component/template-only';
import { hash } from '@ember/helper';
import { ComponentLike, ModifierLike, HelperLike } from '@glint/template';

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

  {{#each-in (hash a=1 b='hi') as |key value|}}
    {{key}}: {{value}}
  {{/each-in}}

  {{t "NOT IMPORTED!"}}
</template>


declare const CanvasThing: ComponentLike<{ Args: { str: string }; Element: HTMLCanvasElement }>;
declare const makeString: HelperLike<{ Args: { Named: { len: number } }; Return: string }>;
declare const drawCanvasStuff: ModifierLike<{ Args: { Named: { width: number; height: number } }; Element: HTMLCanvasElement }>;

declare const customModifierManagerExample: abstract new <El extends Element, Args extends Array<any>>() => InstanceType<ModifierLike<{
  Element: El,
  Args: {
    Positional: [(element: El, args: Args) => void, ...Args]
  }
}>>;

declare function exampleCallback(el: Element, pos: [number, string]): void;

export const CanvasPlayground = <template>
  {{#let (component CanvasThing str="hi") as |BoundCanvasThing|}}
    <BoundCanvasThing />
  {{/let}}

  {{#let (helper makeString len=5) (modifier drawCanvasStuff width=10) as |boundMakeString boundDrawCanvasStuff|}}
    <CanvasThing @str={{(boundMakeString)}} {{boundDrawCanvasStuff height=5}} />
  {{/let}}

  {{#let (modifier customModifierManagerExample exampleCallback) as |m|}}
    <div {{m}}></div>
  {{/let}}
</template>
