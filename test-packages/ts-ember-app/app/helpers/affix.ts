import Helper from '@ember/component/helper';

export interface AffixHelperSignature {
  Args: {
    Named: { prefix?: string, suffix?: string };
    Positional: [string];
  },
  Return: string;
}

export default class AffixHelper extends Helper<AffixHelperSignature> {
  override compute(
    params: AffixHelperSignature['Args']['Positional'],
    { prefix, suffix }: AffixHelperSignature['Args']['Named']
  ): AffixHelperSignature['Return'] {
    return `${prefix ?? ''}${params[0]}${suffix ?? ''}`;
  }
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'affix': typeof AffixHelper;
  }
}
