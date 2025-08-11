import { launchServer } from '@typescript/server-harness';
import {
  ConfigurationRequest,
  PublishDiagnosticsNotification,
  TextDocument,
  type FullDocumentDiagnosticReport,
} from '@volar/language-server';
import type { LanguageServerHandle } from '@volar/test-utils';
import { startLanguageServer } from '@volar/test-utils';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { URI } from 'vscode-uri';

function uriToFilePath(uri: string): string {
  return URI.parse(uri).fsPath.replace(/\\/g, '/');
}

function filePathToUri(filePath: string): string {
  return URI.file(filePath).toString();
}

function normalizeFilePath(filePath: string): string {
  return uriToFilePath(filePathToUri(filePath));
}

const dirname = path.dirname(fileURLToPath(import.meta.url));
const pathToTemplatePackage = normalizeFilePath(
  path.resolve(dirname, '../../../packages/template'),
);
const fileUriToTemplatePackage = filePathToUri(pathToTemplatePackage);

let serverHandle: LanguageServerHandle | undefined;
let tsserver: import('@typescript/server-harness').Server;
let seq = 1;

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const testWorkspacePath = path.resolve(__dirname, '../..');

let eventHandler: ((e: any) => void) | undefined;

export async function getSharedTestWorkspaceHelper(): Promise<{
  glintserver: LanguageServerHandle;
  tsserver: import('@typescript/server-harness').Server;
  nextSeq: () => number;
  open: (uri: string, languageId: string, content: string) => Promise<TextDocument>;
  close: (uri: string) => Promise<void>;
  setTsserverEventHandler: (handler: (e: any) => void) => void;
}> {
  if (!serverHandle) {
    let tsserverPath = require.resolve('typescript/lib/tsserver');
    let tsserverLog = path.join(__dirname, '..', '..', '..', 'tsserver.log');

    tsserver = launchServer(tsserverPath, [
      '--disableAutomaticTypingAcquisition',
      '--globalPlugins',
      '@glint/tsserver-plugin',
      // '--suppressDiagnosticEvents',
      '--logVerbosity',
      'verbose',
      '--logFile',
      tsserverLog,
    ]);

    tsserver.on('exit', (code) => console.log(code ? `Exited with code ${code}` : `Terminated`));

    // Uncomment to show additional event logging (less verbose than tsserver.log)
    tsserver.on('event', (e) => {
      // console.log(e);

      if (eventHandler) {
        eventHandler(e);
      }
    });

    let glintLSPath = require.resolve('@glint/core/bin/glint-language-server');
    serverHandle = startLanguageServer(glintLSPath, testWorkspacePath);
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
    serverHandle.connection.onNotification('tsserver/request', async ([id, command, args]) => {
      const res = await tsserver.message({
        seq: seq++,
        command: command,
        arguments: args,
      });
      serverHandle!.connection.sendNotification('tsserver/response', [id, res.body]);
    });

    await serverHandle.initialize(
      URI.file(testWorkspacePath).toString(),
      {},
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

    // Open a document both in tsserver and the Glint language server.
    open: async (uri: string, languageId: string, content: string) => {
      // Within tssserver:
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

      // Within the Glint language server:
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
    setTsserverEventHandler: (handler: (e: any) => void) => {
      eventHandler = handler;
    },
  };
}

const openedDocuments: TextDocument[] = [];

export async function teardownSharedTestWorkspaceAfterEach(): Promise<void> {
  const server = await getSharedTestWorkspaceHelper();
  for (const document of openedDocuments) {
    await server.close(document.uri);
  }
  openedDocuments.length = 0;
  eventHandler = undefined;
}

export async function prepareDocument(
  fileName: string,
  languageId: string,
  content: string,
): Promise<TextDocument> {
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

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const offset = content.indexOf('%');
    if (offset === -1) break;
    offsets.push(offset);
    content = content.slice(0, offset) + content.slice(offset + 1);
  }
  return [offsets, content];
}

/**
 * Request diagnostics from tsserver, such as the core TypeScript type-checking diagnostics
 * that Glint provides for .gts/.gjs files.
 *
 * Other diagnostics unrelated to type-checking (such as detecting top-level syntax errors
 * and others) are provided by Language Server (see `requestLanguageServerDiagnostics`).
 */
export async function requestTsserverDiagnostics(
  fileName: string,
  languageId: string,
  content: string,
): Promise<any> {
  const workspaceHelper = await getSharedTestWorkspaceHelper();

  const diagnosticsReceivedPromise = new Promise<any>((resolve) => {
    workspaceHelper.setTsserverEventHandler((e) => {
      if (e.event == 'semanticDiag') {
        // TODO: double check filename is for the correct one?
        // Perhaps there are race conditions.
        resolve(e.body);
      }
    });
  });

  let document = await prepareDocument(fileName, languageId, content);

  // `geterr`'s response doesn't contain diagnostic data; diagnostic
  // data comes in the form of events.
  const res = await workspaceHelper.tsserver.message({
    seq: workspaceHelper.nextSeq(),
    command: 'geterr',
    arguments: {
      delay: 0,
      files: [URI.parse(document.uri).fsPath],
    },
  });
  if (res.event != 'requestCompleted') {
    throw new Error(`expected requestCompleted event, got ${res.event}`);
  }

  const diagnosticsResponse = await diagnosticsReceivedPromise;

  for (const diagnostic of diagnosticsResponse.diagnostics) {
    if (diagnostic.relatedInformation) {
      for (const related of diagnostic.relatedInformation) {
        if (related.span) {
          related.span.file =
            '${testWorkspacePath}' + related.span.file.slice(testWorkspacePath.length);
        }
      }
    }
  }

  return diagnosticsResponse.diagnostics;
}

/**
 * Request diagnostics from the Language Server, such as top-level syntax errors
 * and others.
 *
 * For the more common / core diagnostics provided as part of the type-checking process,
 * see `requestTsserverDiagnostics`.
 */
export async function requestLanguageServerDiagnostics(
  fileName: string,
  languageId: string,
  content: string,
): Promise<any> {
  const workspaceHelper = await getSharedTestWorkspaceHelper();

  let document = await prepareDocument(fileName, languageId, content);

  const diagnostics = (await workspaceHelper.glintserver.sendDocumentDiagnosticRequest(
    document.uri,
  )) as FullDocumentDiagnosticReport;

  return normalizeForSnapshotting(document.uri, diagnostics.items);
}

/**
 * Processes the language server return object passed in and converts any absolute URIs to
 * local files (which differ between localhost and CI) to static strings
 * so that they can be easily snapshotted in tests using `toMatchInlineSnapshot`.
 *
 * @param uri
 * @param object
 * @returns normalized object for snapshotting
 */
function normalizeForSnapshotting(uri: string, object: unknown): unknown {
  let stringified = JSON.stringify(object);

  const volarEmbeddedContentUri_template_ts = URI.from({
    scheme: 'volar-embedded-content',
    authority: 'template_ts',
    path: '/' + encodeURIComponent(uri),
  });

  const volarEmbeddedContentUri_gts = URI.from({
    scheme: 'volar-embedded-content',
    authority: 'gts',
    path: '/' + encodeURIComponent(uri),
  });

  // Create file URI for the test workspace path
  const testWorkspaceFileUri = URI.file(testWorkspacePath).toString();

  const normalized = stringified
    .replaceAll(
      volarEmbeddedContentUri_template_ts.toString(),
      `volar-embedded-content://template_ts/PATH_TO_FILE`,
    )
    .replaceAll(
      volarEmbeddedContentUri_gts.toString(),
      `volar-embedded-content://gts/PATH_TO_FILE`,
    )
    .replaceAll(`"${testWorkspacePath}`, '"/path/to/EPHEMERAL_TEST_PROJECT')
    .replaceAll(`"${testWorkspaceFileUri}`, '"file:///path/to/EPHEMERAL_TEST_PROJECT')
    .replace(fileUriToTemplatePackage, '"file:///PATH_TO_MODULE/@glint/template');

  return JSON.parse(normalized);
}
