import { GlimmerComponent } from '@glint/environment-ember-loose';

export default class Foo extends GlimmerComponent {
  name = 'FOO';

  obj = { a: 'A', b: 'B', c: 1, 𝚪: '' };
}
