import Route from '@ember/routing/route';

export default class ClassicLoneRoute extends Route {
  async model(): Promise<{ message: string }> {
    return { message: 'hello' };
  }
}
