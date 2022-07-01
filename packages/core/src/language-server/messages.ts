import { ProtocolRequestType, ProtocolNotificationType } from 'vscode-languageserver';

export type Message<Name extends string, T> = {
  name: Name;
  type: T;
};

export const GetIRRequest = makeMessageType(
  'glint/getIR',
  ProtocolRequestType<GetIRParams, string | null, void, void, void>
);

export interface GetIRParams {
  uri: string;
}

export const GlintDidActivateNotification = makeMessageType(
  'glint/didActivateForConfig',
  ProtocolNotificationType<GlintDidActivateParams, void>
);

export interface GlintDidActivateParams {
  configPath: string;
}

// This utility allows us to encode type information to enforce that we're using
// a valid request name along with its associated param/response types without
// actually requring the runtime code here to be imported elsewhere.
// See `messageKey` in the Code extension.
function makeMessageType<Name extends string, T>(
  name: Name,
  MessageType: new (name: Name) => T
): Message<Name, T> {
  return { name, type: new MessageType(name) };
}
