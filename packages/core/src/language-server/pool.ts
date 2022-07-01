import { ConfigLoader, GlintConfig } from '@glint/config';
import type ts from 'typescript';
import {
  Connection,
  MessageType,
  ShowMessageNotification,
  TextDocuments,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import DocumentCache from '../common/document-cache';
import { debounce } from '../common/scheduling';
import TransformManager from '../common/transform-manager';
import GlintLanguageServer from './glint-language-server';
import { GlintDidActivateNotification } from './messages';
import { uriToFilePath } from './util';

export type ServerDetails = {
  server: GlintLanguageServer;
  rootDir: string;
  scheduleDiagnostics: () => void;
};

export class LanguageServerPool {
  private servers = new Map<GlintConfig, ServerDetails>();
  private configLoader = new ConfigLoader();

  public constructor(
    private connection: Connection,
    private openDocuments: TextDocuments<TextDocument>
  ) {}

  public forEachServer<T>(callback: (details: ServerDetails) => T): void {
    for (let details of this.servers.values()) {
      this.runWithCapturedErrors(callback, details);
    }
  }

  public withServerForURI<T>(uri: string, callback: (details: ServerDetails) => T): T | undefined {
    let details = this.getServerDetailsForURI(uri);
    if (details) {
      return this.runWithCapturedErrors(callback, details);
    }
  }

  private runWithCapturedErrors<T>(
    callback: (details: ServerDetails) => T,
    details: ServerDetails
  ): T | undefined {
    try {
      return callback(details);
    } catch (error) {
      this.connection.console.error(errorMessage(error));
    }
  }

  private configForURI(uri: string): GlintConfig | null {
    return this.configLoader.configForFile(uriToFilePath(uri));
  }

  private getServerDetailsForURI(uri: string): ServerDetails | undefined {
    try {
      let config = this.configForURI(uri);
      if (!config) return;

      let details = this.servers.get(config);
      if (!details) {
        details = this.launchServer(config);
        this.servers.set(config, details);
      }

      return details;
    } catch (error) {
      this.sendMessage(
        MessageType.Error,
        `Unable to start Glint language service for ${uriToFilePath(uri)}.\n${errorMessage(error)}`
      );
    }
  }

  private launchServer(glintConfig: GlintConfig): ServerDetails {
    this.reportActiveServer(glintConfig);

    let documentCache = new DocumentCache(glintConfig);
    let transformManager = new TransformManager(glintConfig, documentCache);
    let tsconfig = parseTsconfig(glintConfig, transformManager);
    let rootDir = glintConfig.rootDir;
    let server = new GlintLanguageServer(glintConfig, documentCache, transformManager, tsconfig);
    let scheduleDiagnostics = this.buildDiagnosticScheduler(server, glintConfig);

    return { server, rootDir, scheduleDiagnostics };
  }

  private buildDiagnosticScheduler(
    server: GlintLanguageServer,
    glintConfig: GlintConfig
  ): () => void {
    return debounce(250, () => {
      let documentsForServer = this.openDocuments
        .all()
        .filter((doc) => this.configForURI(doc.uri) === glintConfig);

      for (let { uri } of documentsForServer) {
        try {
          const diagnostics = server.getDiagnostics(uri);
          this.connection.sendDiagnostics({ uri, diagnostics });
        } catch (error) {
          this.connection.sendDiagnostics({
            uri,
            diagnostics: [
              {
                range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
                message:
                  'Glint encountered an error computing diagnostics for this file. ' +
                  'This is likely a bug in Glint; please file an issue, including any ' +
                  'code and/or steps to follow to reproduce the error.\n\n' +
                  errorMessage(error),
              },
            ],
          });

          this.connection.console.error(
            `Error getting diagnostics for ${uri}.\n${errorMessage(error)}`
          );
        }
      }
    });
  }

  private reportActiveServer(config: GlintConfig): void {
    this.connection.sendNotification(GlintDidActivateNotification.type, {
      configPath: config.configPath,
    });
  }

  private sendMessage(type: MessageType, message: string): void {
    this.connection.sendNotification(ShowMessageNotification.type, { message, type });
  }
}

export function parseTsconfig(
  glintConfig: GlintConfig,
  transformManager: TransformManager
): ts.ParsedCommandLine {
  let { ts } = glintConfig;
  let contents = ts.readConfigFile(glintConfig.configPath, ts.sys.readFile).config;
  let host = { ...ts.sys, readDirectory: transformManager.readDirectory };

  return ts.parseJsonConfigFileContent(
    contents,
    host,
    glintConfig.rootDir,
    undefined,
    glintConfig.configPath
  );
}

function errorMessage(error: unknown): string {
  return (error instanceof Error && error.stack) || `${error}`;
}
