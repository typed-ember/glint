export type PreprocessData = {
  templateLocations: Array<TemplateLocation>;
};

export type TemplateLocation = {
  /** content-tag's classification: a class's own template, or a template expression. */
  type: 'expression' | 'class-member';
  startTagOffset: number;
  startTagLength: number;
  endTagOffset: number;
  endTagLength: number;
  transformedStart: number;
  transformedEnd: number;
};

export const GLOBAL_TAG = `___T`;
