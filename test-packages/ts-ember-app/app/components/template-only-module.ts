import templateOnlyComponent from '@glint/environment-ember-loose/ember-component/template-only';

interface TemplateOnlyModuleSignature {
  Args: { message: string };
  Yields: { default: [] };
}

const TemplateOnlyModule = templateOnlyComponent<TemplateOnlyModuleSignature>();

export default TemplateOnlyModule;

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    TemplateOnlyModule: typeof TemplateOnlyModule;
  }
}
