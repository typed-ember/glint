import Helper from '@ember/component/helper';

type Positional = [string];
type Named = { prefix?: string, suffix?: string };

export interface AffixHelperSignature {
  Args: {
    Positional: Positional;
    Named: Named;
  },
  Return: string;
}

export default class AffixHelper extends Helper<AffixHelperSignature> {
  override compute(
    [base]: Positional,
    { prefix, suffix }: Named
  ): string {
    return `${prefix ?? ''}${base}${suffix ?? ''}`;
  }
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'affix': typeof AffixHelper;
  }
}
