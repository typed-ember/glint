export type Request<Name extends string, T> = {
  name: Name;
  type: T;
};
