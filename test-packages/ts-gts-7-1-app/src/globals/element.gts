import { expectTypeOf, to } from '@glint/type-test';
import type { ComponentLike } from '@glint/template';

// The shape `element` yields for a given resolved element type.
type ElementComponent<El> = ComponentLike<{
  Element: El;
  Args: Record<string, unknown>;
  Blocks: { default: [] };
}>;

const video = null as unknown as ElementComponent<HTMLVideoElement>;
const inputOrButton = null as unknown as ElementComponent<HTMLInputElement | HTMLButtonElement>;
const anchor = null as unknown as ElementComponent<HTMLAnchorElement>;
const svg = null as unknown as ElementComponent<SVGSVGElement>;
const rect = null as unknown as ElementComponent<SVGRectElement>;
const empty = null as unknown as ElementComponent<null>;
const anyElement = null as unknown as ElementComponent<Element>;

const videoOrNot = null as unknown as 'video' | '';

const dynamicTag: string = 'div';

declare function narrow(loose: string): loose is 'input' | 'button';

<template>
  {{! ---- (RFC 389) element ---- }}

  {{! ---- Precise element-type narrowing (via @glint/type-test) ---- }}

  {{! Known HTML tag -> the matching HTMLElement }}
  {{expectTypeOf (element "video") to.equalTypeOf video}}

  {{! Known SVG tags -> the matching SVGElement }}
  {{expectTypeOf (element "svg") to.equalTypeOf svg}}
  {{expectTypeOf (element "rect") to.equalTypeOf rect}}

  {{! A name present in both maps (e.g. "a") resolves to the HTML element }}
  {{expectTypeOf (element "a") to.equalTypeOf anchor}}

  {{! Empty string renders no wrapping element -> `null` (no element) }}
  {{expectTypeOf (element "") to.equalTypeOf empty}}

  {{! A tag or empty -- because element can't know which will be received }}
  {{expectTypeOf (element videoOrNot) to.equalTypeOf anyElement}}

  {{! A dynamic (non-literal) tag name falls back to the base `Element` }}
  {{expectTypeOf (element dynamicTag) to.equalTypeOf anyElement}}

  {{! A known tag is not assignable to the wrong element type }}
  {{! @glint-expect-error: a video is not an anchor }}
  {{expectTypeOf (element "video") to.equalTypeOf anchor}}

  {{#if (narrow dynamicTag)}}
    {{expectTypeOf (element dynamicTag) to.equalTypeOf inputOrButton}}
  {{/if}}

  {{! ---- Narrowing flows through to attribute checking ---- }}

  {{#let (element "section") as |Tag|}}
    <Tag>hello</Tag>
  {{/let}}

  {{#let (element "video") as |Tag|}}
    <Tag src="src" />
    {{! @glint-expect-error: `href` is not valid on a video }}
    <Tag href="href" />
  {{/let}}

  {{#let (element "a") as |Tag|}}
    <Tag href="href" />
    {{! @glint-expect-error: `src` is not valid on an anchor }}
    <Tag src="src" />
  {{/let}}

  {{#let (element "svg") as |Tag|}}
    <Tag width="100" height="100" />
  {{/let}}

  {{#let (element "rect") as |Tag|}}
    <Tag x="0" y="0" width="10" height="10" />
  {{/let}}

  {{! Empty string: the block renders without a wrapping element, so there is
      no element for attributes to apply to }}
  {{#let (element "") as |Tag|}}
    <Tag>hello</Tag>
    {{! @glint-expect-error: a tagless element has no attributes (no element rendered) }}
    <Tag id="foo" />
  {{/let}}
</template>
