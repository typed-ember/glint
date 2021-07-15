import Component from '@glint/environment-ember-loose/ember-component';

declare class WelcomePage extends Component {}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    WelcomePage: typeof WelcomePage;
  }
}
