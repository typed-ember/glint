import type { TOC } from '@ember/component/template-only';
import { repeat } from './utils';

export interface BangSignature {
  Args: { times: number };
}

const Bang: TOC<BangSignature> = <template>
  {{repeat '!' @times}}
</template>;

export default Bang;
