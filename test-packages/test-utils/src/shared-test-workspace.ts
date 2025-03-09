import { launchServer } from '@typescript/server-harness';
import {
  ConfigurationRequest,
  PublishDiagnosticsNotification,
  TextDocument,
} from '@volar/language-server';
import type { LanguageServerHandle } from '@volar/test-utils';
import { startLanguageServer } from '@volar/test-utils';
import * as path from 'node:path';
import { URI } from 'vscode-uri';
// import { VueInitializationOptions } from '../lib/types';

let serverHandle: LanguageServerHandle | undefined;
let tsserver: import('@typescript/server-harness').Server;
let seq = 1;

export const testWorkspacePath = path.resolve(__dirname, '../..');

export async function getSharedTestWorkspaceHelper(): Promise<{
  glintserver: LanguageServerHandle;
  tsserver: import('@typescript/server-harness').Server;
  nextSeq: () => number;
  open: (uri: string, languageId: string, content: string) => Promise<TextDocument>;
  close: (uri: string) => Promise<void>;
}> {
  if (!serverHandle) {
    tsserver = launchServer(
      path.join(__dirname, '..', '..', '..', 'node_modules', 'typescript', 'lib', 'tsserver.js'),
      [
        '--disableAutomaticTypingAcquisition',
        '--globalPlugins',
        '@glint/tsserver-plugin',
        '--suppressDiagnosticEvents',
        '--logVerbosity',
        'verbose',
        '--logFile',
        path.join(__dirname, '..', '..', '..', 'tsserver.log'),
      ],
    );

    tsserver.on('exit', (code) => console.log(code ? `Exited with code ${code}` : `Terminated`));

    // Uncomment to show additional event logging (less verbose than tsserver.log)
    tsserver.on('event', (e) => console.log(e));

    serverHandle = startLanguageServer(
      require.resolve('../../../packages/core/bin/glint-language-server.js'),
      testWorkspacePath,
    );
    serverHandle.connection.onNotification(PublishDiagnosticsNotification.type, () => {});
    serverHandle.connection.onRequest(ConfigurationRequest.type, ({ items }) => {
      return items.map(({ section }) => {
        // TODO: copied this from Vue... do we have inlay hints?
        if (section?.startsWith('glint.inlayHints.')) {
          return true;
        }
        return null;
      });
    });
    serverHandle.connection.onRequest('forwardingTsRequest', async ([command, args]) => {
      const res = await tsserver.message({
        seq: seq++,
        command: command,
        arguments: args,
      });
      return res.body;
    });

    await serverHandle.initialize(
      URI.file(testWorkspacePath).toString(),
      {
        typescript: {
          tsdk: path.dirname(require.resolve('typescript/lib/typescript.js')),
          // requestForwardingCommand: 'forwardingTsRequest',
        },
        // } satisfies VueInitializationOptions,
      },
      {
        workspace: {
          configuration: true,
        },
      },
    );
  }
  return {
    glintserver: serverHandle,
    tsserver: tsserver,
    nextSeq: () => seq++,
    open: async (uri: string, languageId: string, content: string) => {
      const res = await tsserver.message({
        seq: seq++,
        type: 'request',
        command: 'updateOpen',
        arguments: {
          changedFiles: [],
          closedFiles: [],
          openFiles: [
            {
              file: URI.parse(uri).fsPath,
              fileContent: content,
            },
          ],
        },
      });
      if (!res.success) {
        throw new Error(res.body);
      }
      return await serverHandle!.openInMemoryDocument(uri, languageId, content);
    },
    close: async (uri: string) => {
      const res = await tsserver.message({
        seq: seq++,
        type: 'request',
        command: 'updateOpen',
        arguments: {
          changedFiles: [],
          closedFiles: [URI.parse(uri).fsPath],
          openFiles: [],
        },
      });
      if (!res.success) {
        throw new Error(res.body);
      }
      await serverHandle!.closeTextDocument(uri);
    },
  };
}

const openedDocuments: TextDocument[] = [];

export async function teardownSharedTestWorkspaceAfterEach() {
  const server = await getSharedTestWorkspaceHelper();
  for (const document of openedDocuments) {
    await server.close(document.uri);
  }
  openedDocuments.length = 0;
}

export async function prepareDocument(fileName: string, languageId: string, content: string) {
  const server = await getSharedTestWorkspaceHelper();
  const uri = URI.file(`${testWorkspacePath}/${fileName}`);
  const document = await server.open(uri.toString(), languageId, content);
  if (openedDocuments.every((d) => d.uri !== document.uri)) {
    openedDocuments.push(document);
  }
  return document;
}

export function extractCursor(contentWithCursors: string): [number, string] {
  const [offsets, content] = extractCursors(contentWithCursors);
  const offset = offsets[0];
  return [offset, content];
}

export function extractCursors(content: string): [number[], string] {
  const offsets = [];
  while (true) {
    const offset = content.indexOf('%');
    if (offset === -1) break;
    offsets.push(offset);
    content = content.slice(0, offset) + content.slice(offset + 1);
  }
  return [offsets, content];
}
