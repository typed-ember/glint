import Route from '@ember/routing/route';

export default class PodControllerRoute extends Route {
  async model(): Promise<{ message: string }> {
    return { message: 'hello' };
  }
}
