export type PreprocessData = {
  templateLocations: Array<TemplateLocation>;
};

export type TemplateLocation = {
  startTagOffset: number;
  startTagLength: number;
  endTagOffset: number;
  endTagLength: number;
  transformedStart: number;
  transformedEnd: number;
};

export const GLOBAL_TAG = `___T`;
