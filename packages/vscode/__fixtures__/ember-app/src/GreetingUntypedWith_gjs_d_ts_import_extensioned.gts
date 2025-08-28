import GreetingUntyped from './GreetingUntypedWith_gjs_d_ts.gjs';

import Component from '@glimmer/component';

export default class extends Component {
  <template>
    <GreetingUntyped
      {{! @glint-expect-error }}
      @target={{9999999}} />
  </template>
}
