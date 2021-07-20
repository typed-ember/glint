import Route from '@ember/routing/route';

export default class ClassicRoute extends Route {
  override async model(): Promise<{ foo: string }> {
    return { foo: 'hi' };
  }
}
