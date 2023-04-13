import * as VM from '@glint/template/-private/keywords';

import { ActionKeyword } from '../intrinsics/action';
import { ConcatHelper } from '../intrinsics/concat';
import { EachKeyword } from '../intrinsics/each';
import { EachInKeyword } from '../intrinsics/each-in';
import { FnHelper } from '../intrinsics/fn';
import { GetHelper } from '../intrinsics/get';
import { InputComponent } from '../intrinsics/input';
import { LinkToKeyword, LinkToComponent } from '../intrinsics/link-to';
import { LogHelper } from '../intrinsics/log';
import { MountKeyword } from '../intrinsics/mount';
import { MutKeyword } from '../intrinsics/mut';
import { OnModifier } from '../intrinsics/on';
import { OutletKeyword } from '../intrinsics/outlet';
import { TextareaComponent } from '../intrinsics/textarea';
import { UnboundKeyword } from '../intrinsics/unbound';
import { UniqueIdHelper } from '../intrinsics/unique-id';

import Registry from '../../registry';

// The keyword vs global breakdown here is loosely matched with
// the listing in http://emberjs.github.io/rfcs/0496-handlebars-strict-mode.html

interface Keywords {
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

  // `{{if}}` is implemented directly in `@glint/core`
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
     The `{{link-to}}` helper renders a link to the supplied `route`.

     See [the API documentation] for further details.

     [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/link-to?anchor=link-to
   */
  'link-to': LinkToKeyword;

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

  // `{{unless}}` is implemented directly in `@glint/core`
  unless: void;

  /**
    Use the `{{with}}` helper when you want to alias a property to a new name.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/with?anchor=with
   */
  with: VM.WithKeyword;

  // `{{yield}}` is implemented directly in `@glint/core`
  yield: void;
}

export interface Globals extends Keywords, Registry {
  // `{{array}}` is implemented directly in `@glint/core`
  array: void;

  /**
    Concatenates the given arguments into a string.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/concat?anchor=concat
  */
  concat: ConcatHelper;

  /**
    The `fn` helper allows you to ensure a function that you are passing off
    to another component, helper, or modifier has access to arguments that are
    available in the template.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/fn?anchor=fn
  */
  fn: FnHelper;

  /**
    Dynamically look up a property on an object. The second argument to `{{get}}`
    should have a string value, although it can be bound.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/get?anchor=get
  */
  get: GetHelper;

  // `hash` is implemented directly in `@glint/core`
  hash: void;

  /**
    The `{{input}}` helper lets you create an HTML `<input>` element.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/input?anchor=input
  */
  input: InputComponent;

  /**
    The `Input` component lets you create an HTML `<input>` element.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.components/methods/Input?anchor=Input
  */
  Input: InputComponent;

  /**
    The `LinkTo` component renders a link to the supplied `routeName` passing an optionally
    supplied model to the route as its `model` context of the route.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.components/methods/LinkTo?anchor=LinkTo
  */
  LinkTo: LinkToComponent;

  /**
    The `{{on}}` modifier lets you easily add event listeners (it uses
    [EventTarget.addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
    internally).

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/on?anchor=on
  */
  on: OnModifier;

  /**
    The `{{textarea}}` component inserts a new instance of `<textarea>` tag into the template.
    The `value` argument provides the content of the `<textarea>`.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.components/methods/Textarea?anchor=Textarea
   */
  textarea: TextareaComponent;

  /**
    The `Textarea` component inserts a new instance of `<textarea>` tag into the template.
    The `@value` argument provides the content of the `<textarea>`.

    See [the API documentation] for further details.

    [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.components/methods/Textarea?anchor=Textarea
   */
  Textarea: TextareaComponent;

  /**
  Use the `{{unique-id}}` helper to generate a unique ID string suitable for use as an ID
  attribute in the DOM.
 
  See [the API documentation] for further details.

  [the API documentation]: https://api.emberjs.com/ember/release/classes/Ember.Templates.helpers/methods/unique-id?anchor=unique-id
   */
  'unique-id': UniqueIdHelper;
}

export declare const Globals: Globals;
