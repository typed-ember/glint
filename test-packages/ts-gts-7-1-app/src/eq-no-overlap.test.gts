import Component from '@glimmer/component';

// Regression guard for https://github.com/typed-ember/glint/issues/1193
//
// TS2367 ("this comparison appears to be unintentional") anchors on the whole
// emitted binary expression. Since #1169 attached the keyword-consumption
// comma to the first operand — `((noop(eq), x) === y)` — that expression
// starts on synthetic text, and without a covering verification mapping the
// diagnostic was silently dropped: impossible comparisons went unreported and
// the directives below read as "unused". Each directive being consumed is the
// assertion that the diagnostic survives the mapping.
export default class Demo extends Component {
  kind: 'a' | 'b' = 'a';

  <template>
    {{! @glint-expect-error -- 'a' | 'b' and "z" have no overlap (TS2367) }}
    {{#if (eq this.kind "z")}}impossible{{/if}}

    {{! @glint-expect-error -- 'a' | 'b' and "z" have no overlap (TS2367) }}
    {{#if (neq this.kind "z")}}always{{/if}}

    {{! @glint-expect-error -- the eq's TS2367 must also survive nested inside (and ...) }}
    {{#if (and (eq this.kind "z") this.kind)}}nested{{/if}}

    {{! valid comparisons must stay error-free }}
    {{#if (eq this.kind "a")}}possible{{/if}}
    {{#if (neq this.kind "b")}}possible{{/if}}
  </template>
}
