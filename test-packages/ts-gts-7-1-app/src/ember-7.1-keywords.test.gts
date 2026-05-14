// Smoke-tests for the built-in template keywords introduced by ember-source
// 7.1 (RFCs 562, 470, 997, 998, 999, 1000, 560, 561, 389). These verify that
// referencing each keyword from a template tag picks up the matching helper /
// modifier shape from `Keywords` in `globals.d.ts`, which is gated behind the
// `Ember71Only<T>` probe.
//
// Note: these tests run against the workspace copy of `ember-source` which is
// >= 7.1, so the `HasEmber71BuiltIns` probe resolves to `true` and every
// keyword below is exposed. Consumers on older ember-source versions get
// `never`, so the same template would surface "Cannot invoke an object which
// is possibly 'never'" diagnostics — that path is intentionally not exercised
// here because we can't pin two different ember-source versions in one test
// project.

const handler = (event: MouseEvent): void => {
  void event;
};

const greet = (name: string, exclamation: string): string =>
  `Hello, ${name}${exclamation}`;
void greet;

<template>
  {{! ---- (RFC 470) fn helper---- }}
  <button {{on "click" (fn handler)}} type="button">noop</button>

  {{! ---- (RFC 1000) array ---- }}
  {{#each (array "a" "b" "c") as |item|}}
    {{item}}
  {{/each}}

  {{! ---- (RFC 999) hash ---- }}
  {{#let (hash name="ada" age=36) as |person|}}
    {{person.name}}-{{person.age}}
  {{/let}}

  {{! ---- (RFC 560) and / or / not ---- }}
  {{#if (and true "kept")}}and{{/if}}
  {{and true true 2 "ignored" "kept"}}
  {{and true}}
  {{#if (and false)}}
    unreachable
  {{/if}}

  {{#if (or false "kept")}}or{{/if}}
  {{#if (or false)}}or{{/if}}
  {{or false 0 undefined (array) "kept"}}

  {{#if (not false)}}not{{/if}}

  {{! ---- (RFC 561) eq / neq / lt / lte / gt / gte ---- }}
  {{#if (eq 1 1)}}eq{{/if}}
  {{#if (neq 1 2)}}neq{{/if}}
  {{#if (lt 1 2)}}lt{{/if}}
  {{#if (lte 1 2)}}lte{{/if}}
  {{#if (gt 2 1)}}gt{{/if}}
  {{#if (gte 2 2)}}gte{{/if}}

  {{! ---- (RFC 389) element ---- }}
  {{#let (element "section") as |Tag|}}
    <Tag>hello</Tag>
  {{/let}}
</template>
