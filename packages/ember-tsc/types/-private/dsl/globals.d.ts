import Globals from '../../globals';

import * as VM from '@glint/template/-private/keywords';

import { ActionKeyword } from '../intrinsics/action';
import { ArrayHelper, HashHelper } from '../intrinsics/array-hash';
import { GtHelper, GteHelper, LtHelper, LteHelper } from '../intrinsics/comparison';
import { EachKeyword } from '../intrinsics/each';
import { EachInKeyword } from '../intrinsics/each-in';
import { ElementHelper } from '../intrinsics/element';
import { FnHelper } from '../intrinsics/fn';
import { LogHelper } from '../intrinsics/log';
import { MountKeyword } from '../intrinsics/mount';
import { MutKeyword } from '../intrinsics/mut';
import { OnModifier } from '../intrinsics/on';
import { OutletKeyword } from '../intrinsics/outlet';
import { AndHelper, NotHelper, OrHelper } from '../intrinsics/truth-helpers';
import { UnboundKeyword } from '../intrinsics/unbound';
import { UniqueIdHelper } from '../intrinsics/unique-id';

// ---- ember-source 7.1 detection -------------------------------------------
//
// The keywords introduced by RFCs 562, 470, 997, 998, 999, 1000, 560, 561 and
// 389 are only available at runtime when consumers are on ember-source >= 7.1.
// We probe for the `eq` value re-export added by RFC 561 to decide whether to
// expose the new keyword types. On older versions the probe collapses to the
// empty type, so the 7.1 keyword members are entirely absent from `Globals` —
// referencing e.g. `{{eq}}` then surfaces TypeScript's standard
// "Property 'eq' does not exist on type 'Globals'" diagnostic, which triggers
// auto-import quick-fixes (`import { eq } from 'ember-truth-helpers'`) and
// lets user-scoped imports flow through completion and hover without being
// shadowed by a `never`-typed builtin.
//
// We probe a value export (`eq`) rather than the matching `EqHelper`
// interface because `typeof import(...)` only surfaces the module's value
// exports; type-only exports never appear as keys, so an interface probe
// would always collapse to `false`.
//
// `@ember/helper` is an optional peer dependency at the type level: the
// `@ts-ignore` ensures Glint still type-checks in environments that haven't
// installed it.
//
// @ts-ignore — `@ember/helper` is an optional peer dependency
type EmberHelperExports = typeof import('@ember/helper');

type HasEmber71BuiltIns = [EmberHelperExports] extends [{ eq: unknown }] ? true : false;

// The keyword vs global breakdown here is loosely matched with
// the listing in http://emberjs.github.io/rfcs/0496-handlebars-strict-mode.html

interface KeywordsForEmber {
  /**
    The {{action}} helper provides a way to pass triggers for behavior (usually just a function)
    between components, and into components from controllers.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/action?anchor=action
   */
  action: ActionKeyword;

  /**
    The `{{component}}` helper lets you add instances of `Component` to a template.
    `{{component}}`'s primary use is for cases where you want to dynamically change
    which type of component is rendered as the state of your application changes.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/component?anchor=component
   */
  component: VM.ComponentKeyword;

  /**
    Execute the `debugger` statement in the current template's context.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/debugger?anchor=debugger
  */
  debugger: VM.DebuggerKeyword;

  /**
    The `{{#each}}` helper loops over elements in a collection.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/each?anchor=each
  */
  each: EachKeyword;

  /**
    The `{{each-in}}` helper loops over properties on an object.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/each-in?anchor=each-in
  */
  'each-in': EachInKeyword;

  /**
    `{{has-block}}` indicates if the component was invoked with a block.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/hasBlock?anchor=hasBlock
  */
  'has-block': VM.HasBlockKeyword;

  /**
    `{{has-block-params}}` indicates if the component was invoked with block params.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/hasBlockParams?anchor=hasBlockParams
  */
  'has-block-params': VM.HasBlockParamsKeyword;

  /**
    Use the `{{helper}}` helper to create a contextual helper so that it can be passed
    around as first-class values in templates.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/helper?anchor=helper
  */
  helper: VM.HelperKeyword;

  // `{{if}}` is implemented directly in `ember-tsc`
  if: void;

  /**
    The `{{in-element}}` helper renders its block content outside of the regular flow,
    into a DOM element given by its `destinationElement` positional argument.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/in-element?anchor=in-element
  */
  'in-element': VM.InElementKeyword;

  /**
    The `{{let}}` helper receives one or more positional arguments and yields
    them out as block params.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/let?anchor=let
   */
  let: VM.LetKeyword;

  /**
    `log` allows you to output the value of variables in the current rendering
    context.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/log?anchor=log
   */
  log: LogHelper;

  /**
    Use the `{{modifier}}` helper to create a contextual modifier so that it can be passed
    around as first-class values in templates.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/modifier?anchor=modifier
  */
  modifier: VM.ModifierKeyword;

  /**
    The `{{mount}}` helper lets you embed a routeless engine in a template.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/mount?anchor=mount
    ```
  */
  mount: MountKeyword;

  /**
    The `mut` helper, when used with `fn`, will return a function that
    sets the value passed to `mut` to its first argument.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/mut?anchor=mut
   */
  mut: MutKeyword;

  /**
    The `{{outlet}}` helper lets you specify where a child route will render in
    your template.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/outlet?anchor=outlet
  */
  outlet: OutletKeyword;

  /**
    The `{{unbound}}` helper disconnects the one-way binding of a property,
    essentially freezing its value at the moment of rendering.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/unbound?anchor=unbound
   */
  unbound: UnboundKeyword;

  /**
  Use the `{{unique-id}}` helper to generate a unique ID string suitable for use as an ID
  attribute in the DOM.
 
  See [the API documentation] for further details.

  [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/unique-id?anchor=unique-id
   */
  'unique-id': UniqueIdHelper;

  // `{{unless}}` is implemented directly in `ember-tsc`
  unless: void;

  /**
    Use the `{{with}}` helper when you want to alias a property to a new name.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/with?anchor=with
   */
  with: VM.WithKeyword;

  // `{{yield}}` is implemented directly in `ember-tsc`
  yield: void;
}

/**
 * Built-in template keywords introduced by ember-source 7.1
 * (RFCs 389, 470, 560, 561, 562, 997, 998, 999, 1000). The whole member set is
 * gated by `HasEmber71BuiltIns` at the `Globals` intersection below, so when
 * the consumer is on ember-source < 7.1 these property keys are absent from
 * `Globals` entirely (rather than present as `never`). That lets TypeScript
 * report `{{eq}}` / `{{and}}` / etc. as unknown properties and offer the
 * "Add import from 'ember-truth-helpers'" / `@ember/helper` quick-fix, and
 * keeps user-imported helpers from being shadowed by a `never`-typed builtin
 * in completion and hover.
 */
interface KeywordsForEmber71Members {
  /**
   * The `{{and}}` helper evaluates arguments left to right, returning the first
   * falsy value (using Handlebars truthiness) or the right-most value if all
   * are truthy. Requires at least two arguments.
   *
   * ```gjs
   * <template>
   *   {{if (and @isAdmin @isLoggedIn) "Welcome, admin!" "Access denied"}}
   * </template>
   * ```
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `and` is available as a keyword
   * and does not need to be imported from `@ember/helper`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fhelper/and
   */
  and: AndHelper;

  /**
   * Using the `{{array}}` helper, you can pass arrays directly from the
   * template as an argument to your components.
   *
   * ```gjs
   * <template>
   *   <ul>
   *     {{#each (array "Tom Dale" "Yehuda Katz" @anotherPerson) as |person|}}
   *       <li>{{person}}</li>
   *     {{/each}}
   *   </ul>
   * </template>
   * ```
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `array` is available as a
   * keyword and does not need to be imported from `@ember/helper`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fhelper/array
   */
  array: ArrayHelper;

  /**
   * The `{{element}}` helper lets you dynamically set the tag name of an
   * element.
   *
   * ```gjs
   * <template>
   *   {{#let (element @tagName) as |Tag|}}
   *     <Tag class="my-element">Hello</Tag>
   *   {{/let}}
   * </template>
   * ```
   *
   * When `@tagName` is `"h1"`, this renders `<h1 class="my-element">Hello</h1>`.
   * When `@tagName` is an empty string, the block content is rendered without
   * a wrapping element. When `@tagName` is `null` or `undefined`, nothing is
   * rendered.
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `element` is available as a
   * keyword and does not need to be imported from `@ember/helper`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fhelper/element
   */
  element: ElementHelper;

  /**
   * The `{{eq}}` helper returns `true` if its two arguments are strictly equal
   * (`===`). Takes exactly two arguments.
   *
   * ```gjs
   * <template>
   *   {{if (eq @status "active") "Active" "Inactive"}}
   * </template>
   * ```
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `eq` is available as a keyword
   * and does not need to be imported from `@ember/helper`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fhelper/eq
   */
  // `{{eq}}` is emitted as the native `===` operator in `ember-tsc`.
  eq: void;

  /**
   * `{{fn}}` is a helper that receives a function and some arguments, and
   * returns a new function that combines them. This allows you to pass
   * parameters along to functions in your templates:
   *
   * ```gjs
   * function showAlert(message) {
   *   alert(`The message is: '${message}'`);
   * }
   *
   * <template>
   *   <button type="button" {{on "click" (fn showAlert "Hello!")}}>
   *     Click me!
   *   </button>
   * </template>
   * ```
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `fn` is available as a keyword
   * and does not need to be imported from `@ember/helper`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fhelper/fn
   */
  fn: FnHelper;

  /**
   * The `{{gt}}` helper returns `true` if the first argument is greater than
   * the second argument.
   *
   * ```gjs
   * <template>
   *   {{if (gt @score 100) "High score!" "Keep trying"}}
   * </template>
   * ```
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `gt` is available as a keyword
   * and does not need to be imported from `@ember/helper`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fhelper/gt
   */
  gt: GtHelper;

  /**
   * The `{{gte}}` helper returns `true` if the first argument is greater than
   * or equal to the second argument.
   *
   * ```gjs
   * <template>
   *   {{if (gte @age 18) "Adult" "Minor"}}
   * </template>
   * ```
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `gte` is available as a keyword
   * and does not need to be imported from `@ember/helper`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fhelper/gte
   */
  gte: GteHelper;

  /**
   * Using the `{{hash}}` helper, you can pass objects directly from the
   * template as an argument to your components.
   *
   * ```gjs
   * <template>
   *   {{#each-in (hash givenName="Jen" familyName="Weber") as |key value|}}
   *     <p>{{key}}: {{value}}</p>
   *   {{/each-in}}
   * </template>
   * ```
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `hash` is available as a
   * keyword and does not need to be imported from `@ember/helper`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fhelper/hash
   */
  hash: HashHelper;

  /**
   * The `{{lt}}` helper returns `true` if the first argument is less than the
   * second argument.
   *
   * ```gjs
   * <template>
   *   {{if (lt @temperature 0) "Freezing" "Above zero"}}
   * </template>
   * ```
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `lt` is available as a keyword
   * and does not need to be imported from `@ember/helper`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fhelper/lt
   */
  lt: LtHelper;

  /**
   * The `{{lte}}` helper returns `true` if the first argument is less than or
   * equal to the second argument.
   *
   * ```gjs
   * <template>
   *   {{if (lte @count 0) "Empty" "Has items"}}
   * </template>
   * ```
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `lte` is available as a keyword
   * and does not need to be imported from `@ember/helper`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fhelper/lte
   */
  lte: LteHelper;

  /**
   * The `{{neq}}` helper returns `true` if its two arguments are strictly not
   * equal (`!==`). Takes exactly two arguments.
   *
   * ```gjs
   * <template>
   *   {{if (neq @status "active") "Not active" "Active"}}
   * </template>
   * ```
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `neq` is available as a keyword
   * and does not need to be imported from `@ember/helper`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fhelper/neq
   */
  // `{{neq}}` is emitted as the native `!==` operator in `ember-tsc`.
  neq: void;

  /**
   * The `{{not}}` helper returns the logical negation of its argument using
   * Handlebars truthiness. Takes exactly one argument.
   *
   * ```gjs
   * <template>
   *   {{if (not @isDisabled) "Enabled" "Disabled"}}
   * </template>
   * ```
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `not` is available as a keyword
   * and does not need to be imported from `@ember/helper`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fhelper/not
   */
  not: NotHelper;

  /**
   * The `{{on}}` element modifier attaches an event listener to an element.
   *
   * ```gjs
   * <template>
   *   <button type="button" {{on "click" this.handleClick}}>
   *     Click me!
   *   </button>
   * </template>
   * ```
   *
   * It accepts the same options as `addEventListener` via named arguments
   * (`capture`, `once`, `passive`).
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `on` is available as a keyword
   * and does not need to be imported from `@ember/modifier`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fmodifier/on
   */
  on: OnModifier;

  /**
   * The `{{or}}` helper evaluates arguments left to right, returning the first
   * truthy value (using Handlebars truthiness) or the right-most value if all
   * are falsy. Requires at least two arguments.
   *
   * ```gjs
   * <template>
   *   {{if (or @hasAccess @isAdmin) "Welcome!" "No access"}}
   * </template>
   * ```
   *
   * In strict-mode (`.gjs`/`.gts`) templates, `or` is available as a keyword
   * and does not need to be imported from `@ember/helper`.
   *
   * @see https://api.emberjs.com/ember/release/functions/@ember%2Fhelper/or
   */
  or: OrHelper;
}

/**
 * Identifier-safe aliases for hyphenated members of `KeywordsForEmber`.
 *
 * The Glint template-to-TypeScript transform emits hyphenated template
 * keywords (e.g. `{{each-in}}`, `{{in-element}}`) as dotted property accesses
 * on `Globals` using these snake_case aliases (`each_in`, `in_element`, ...).
 * Dotted access preserves JSDoc, go-to-definition and completions on hover,
 * which the bracket-string fallback (`Globals["each-in"]`) does not.
 *
 * Each alias intentionally has the SAME character length as its hyphenated
 * counterpart so that the Volar source-to-TypeScript character mapping for
 * the keyword stays balanced.
 */
interface KeywordAliasesForEmber {
  /**
    The `{{each-in}}` helper loops over properties on an object.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/each-in?anchor=each-in
  */
  each_in: EachInKeyword;

  /**
    `{{has-block}}` indicates if the component was invoked with a block.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/hasBlock?anchor=hasBlock
  */
  has_block: VM.HasBlockKeyword;

  /**
    `{{has-block-params}}` indicates if the component was invoked with block params.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/hasBlockParams?anchor=hasBlockParams
  */
  has_block_params: VM.HasBlockParamsKeyword;

  /**
    The `{{in-element}}` helper renders its block content outside of the regular flow,
    into a DOM element given by its `destinationElement` positional argument.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/in-element?anchor=in-element
  */
  in_element: VM.InElementKeyword;

  /**
  Use the `{{unique-id}}` helper to generate a unique ID string suitable for use as an ID
  attribute in the DOM.
 
  See [the API documentation] for further details.

  [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/unique-id?anchor=unique-id
   */
  unique_id: UniqueIdHelper;
}

interface Keywords extends KeywordsForEmber, KeywordAliasesForEmber {}

// When `HasEmber71BuiltIns` is `true`, the 7.1 keyword members are included on
// `Globals`; otherwise the conditional collapses to `{}` and the keys are
// absent so TypeScript surfaces "unknown identifier" diagnostics / auto-import
// quick-fixes for `{{and}}`, `{{eq}}`, etc.
type KeywordsForEmber71 = HasEmber71BuiltIns extends true ? KeywordsForEmber71Members : {};

export const Globals: Keywords & KeywordsForEmber71 & Globals;
