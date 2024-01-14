import { ProtocolRequestType, TextEdit } from '@volar/language-server';

export type Request<Name extends string, T> = {
  name: Name;
  type: T;
};

export const GetIRRequest = makeRequestType(
  'glint/getIR',
  ProtocolRequestType<GetIRParams, GetIRResult | null, void, void, void>
);

export const SortImportsRequest = makeRequestType(
  'glint/sortImports',
  ProtocolRequestType<SortImportsParams, SortImportsResult | null, void, void, void>
);

export interface GetIRParams {
  uri: string;
}

export interface GetIRResult {
  contents: string;
  uri: string;
}

export interface SortImportsParams {
  uri: string;
}

export type SortImportsResult = TextEdit[];

// This utility allows us to encode type information to enforce that we're using
// a valid request name along with its associated param/response types without
// actually requring the runtime code here to be imported elsewhere.
// See `requestKey` in the Code extension.
function makeRequestType<Name extends string, T>(
  name: Name,
  RequestType: new (name: Name) => T
): Request<Name, T> {
  return { name, type: new RequestType(name) };
}
