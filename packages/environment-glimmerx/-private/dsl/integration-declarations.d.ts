import '@glimmerx/component';
import { TemplateComponent } from '../../component';

// Declaring that `hbs` returns a `TemplateComponent` prevents vanilla `tsc` from freaking out when
// it sees code like `const MyThing: TC<Sig> = hbs...`. Glint itself will never see `hbs` get used, as
// it's transformed to the template DSL before typechecking.
declare module '@glimmerx/component' {
  export function hbs(source: TemplateStringsArray): TemplateComponent<any>;
}
