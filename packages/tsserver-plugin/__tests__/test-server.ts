import { fork, ChildProcess } from 'child_process';
import { createInterface, ReadLine } from 'readline';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import Protocol, { CommandTypes, WatchFileKind } from 'typescript/lib/protocol';

export type Requests = {
  [CommandTypes.SemanticDiagnosticsSync]: [
    Protocol.SemanticDiagnosticsSyncRequestArgs,
    Protocol.SemanticDiagnosticsSyncResponse
  ];
  [CommandTypes.SuggestionDiagnosticsSync]: [
    Protocol.SuggestionDiagnosticsSyncRequestArgs,
    Protocol.SuggestionDiagnosticsSyncResponse
  ];
  [CommandTypes.SyntacticDiagnosticsSync]: [
    Protocol.SyntacticDiagnosticsSyncRequestArgs,
    Protocol.SyntacticDiagnosticsSyncResponse
  ];
  [CommandTypes.Quickinfo]: [Protocol.QuickInfoRequest['arguments'], Protocol.QuickInfoResponse];
  [CommandTypes.CompletionInfo]: [Protocol.CompletionsRequestArgs, Protocol.CompletionInfoResponse];
  [CommandTypes.CompletionDetails]: [
    Protocol.CompletionDetailsRequestArgs,
    Protocol.CompletionDetailsResponse
  ];
  [CommandTypes.References]: [Protocol.ReferencesRequest['arguments'], Protocol.ReferencesResponse];
  [CommandTypes.Definition]: [Protocol.DefinitionRequest['arguments'], Protocol.DefinitionResponse];
  [CommandTypes.DefinitionAndBoundSpan]: [
    Protocol.DefinitionAndBoundSpanRequest['arguments'],
    Protocol.DefinitionAndBoundSpanResponse
  ];
  [CommandTypes.Rename]: [Protocol.RenameRequestArgs, Protocol.RenameResponse];
  [CommandTypes.GetEditsForFileRename]: [
    Protocol.GetEditsForFileRenameRequestArgs,
    Protocol.GetEditsForFileRenameResponse
  ];
};

export type Commands = {
  [CommandTypes.Configure]: Protocol.ConfigureRequestArguments;
  [CommandTypes.Open]: Protocol.OpenRequestArgs;
  [CommandTypes.UpdateOpen]: Protocol.UpdateOpenRequestArgs;
  [CommandTypes.Geterr]: Protocol.GeterrRequestArgs;
  [CommandTypes.Exit]: null;
};

export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason: unknown) => void;
};

const ROOT = path.resolve(__dirname, '../../../test-packages/ephemeral');

export class Project {
  private rootDir = path.join(ROOT, Math.random().toString(16).slice(2));
  private openFiles = new Set<string>();
  private printLogContents = false;

  constructor(private server: TSServer) {}

  public filePath(fileName: string): string {
    return normalizePath(path.join(this.rootDir, fileName));
  }

  public async create(
    projectOptions: { printLogContents?: boolean } = {},
    compilerOptions: import('typescript').CompilerOptions = {}
  ): Promise<Project> {
    this.printLogContents = projectOptions.printLogContents ?? false;

    let tsconfig = {
      compilerOptions: {
        plugins: [{ name: path.resolve(__dirname, '../lib') }],
        strict: true,
        target: 'es2019',
        module: 'es2015',
        moduleResolution: 'node',
        skipLibCheck: true,
        ...compilerOptions,
      },
    };

    if (this.printLogContents) {
      Object.assign(tsconfig.compilerOptions.plugins[0], {
        logFile: './glint.log',
      });
    }

    fs.rmdirSync(this.rootDir, { recursive: true });
    fs.mkdirSync(this.rootDir, { recursive: true });

    fs.writeFileSync(path.join(this.rootDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
    fs.writeFileSync(path.join(this.rootDir, 'package.json'), '{}');
    fs.writeFileSync(path.join(this.rootDir, '.glintrc'), 'environment: glimmerx\n');

    await this.server.sendAndWait(CommandTypes.Configure, {
      watchOptions: { watchFile: WatchFileKind.UseFsEventsOnParentDirectory },
    });

    return this;
  }

  public write(fileName: string, fileContent: string): void {
    fs.writeFileSync(this.filePath(fileName), fileContent);
  }

  public async open(files: Record<string, string>): Promise<void> {
    let openFiles = [];

    for (let fileName of Object.keys(files)) {
      let file = this.filePath(fileName);
      let fileContent = files[fileName];

      if (!this.openFiles.has(file)) {
        if (!fs.existsSync(file)) {
          fs.writeFileSync(file, fileContent ?? '');
        }

        this.openFiles.add(file);
      }

      openFiles.push({ file, fileContent });
    }

    await this.server.sendAndWait(CommandTypes.UpdateOpen, { openFiles });
  }

  public async update(fileName: string, ...edits: Array<Protocol.CodeEdit>): Promise<void> {
    await this.server.send(CommandTypes.UpdateOpen, {
      changedFiles: [
        {
          fileName: this.filePath(fileName),
          textChanges: edits,
        },
      ],
    });
  }

  public async getDiagnostics(
    fileName: string
  ): Promise<Array<Protocol.DiagnosticWithLinePosition | Protocol.Diagnostic>> {
    let options: Protocol.SemanticDiagnosticsSyncRequestArgs = {
      file: this.filePath(fileName),
      includeLinePosition: true,
    };

    let [syntax, semantic, suggestions] = await Promise.all([
      this.server.request(CommandTypes.SyntacticDiagnosticsSync, options),
      this.server.request(CommandTypes.SemanticDiagnosticsSync, options),
      this.server.request(CommandTypes.SuggestionDiagnosticsSync, options),
    ]);

    return [...(syntax ?? []), ...(semantic ?? []), ...(suggestions ?? [])];
  }

  public async destroy(): Promise<void> {
    let logPath = path.join(this.rootDir, 'glint.log');
    if (fs.existsSync(logPath)) {
      let contents = fs.readFileSync(logPath, 'utf-8');
      console.log(contents);
    }

    await this.server.send(CommandTypes.UpdateOpen, {
      closedFiles: [...this.openFiles],
    });

    fs.rmdirSync(this.rootDir, { recursive: true });
  }
}

function defer<T>(): Deferred<T> {
  let result = {} as Deferred<T>;
  result.promise = new Promise((resolve, reject) => {
    result.resolve = resolve;
    result.reject = reject;
  });
  return result;
}

export class TSServer extends EventEmitter {
  private seq = 0;
  private pending = new Map<number, Deferred<unknown>>();
  private server?: ChildProcess;
  private readline?: ReadLine;
  private linesReceived = 0;
  private printMessages = false;

  public async start(options: {
    listenForDebugger?: boolean;
    printMessages?: boolean;
  }): Promise<TSServer> {
    let execArgv = process.execArgv;
    if (options.listenForDebugger) {
      jest.setTimeout(9999999);
      execArgv = [...execArgv, '--inspect-brk'];
    }

    this.printMessages = options.printMessages ?? false;
    this.server = fork(require.resolve('typescript/lib/tsserver'), [], {
      stdio: 'pipe',
      execArgv,
    });

    if (!this.server.stdout) {
      throw new Error('Missing stdout from child process');
    }

    this.readline = createInterface(this.server.stdout);
    this.readline.on('line', (line) => this.lineReceived(line));

    await new Promise((resolve) => this.once('typingsInstallerPid', resolve));

    return this;
  }

  public async request<K extends keyof Requests>(
    command: K,
    args: Requests[K][0]
  ): Promise<Requests[K][1]['body']> {
    let seq = await this.sendCommand(command, args);
    let deferred = defer<any>();

    this.pending.set(seq, deferred);

    return deferred.promise;
  }

  public async sendAndWait<K extends keyof Commands>(command: K, args: Commands[K]): Promise<void> {
    let seq = await this.sendCommand(command, args);
    let deferred = defer<any>();

    this.pending.set(seq, deferred);

    return deferred.promise;
  }

  public async send<K extends keyof Commands>(command: K, args: Commands[K]): Promise<void> {
    await this.sendCommand(command, args);
  }

  public awaitEvent(event: string): Promise<unknown> {
    return new Promise((resolve) => this.once(event, resolve));
  }

  public async shutdown(): Promise<void> {
    await this.send(CommandTypes.Exit, null);

    this.readline?.close();
    this.server?.kill('SIGKILL');

    await new Promise((resolve) => this.server?.once('close', resolve));
  }

  private async sendCommand(command: string, args: unknown): Promise<number> {
    let seq = this.seq++;
    let payload = { seq, type: 'request', command, arguments: args };

    if (this.printMessages) {
      console.log('Sending', JSON.stringify(payload, null, 2));
    }

    await new Promise((resolve, reject) => {
      this.server?.stdin?.write(`${JSON.stringify(payload)}\r\n`, (error) =>
        error ? reject(error) : resolve()
      );
    });

    return seq;
  }

  private lineReceived(line: string): void {
    // tsserver sends header information prior to each message, but we just assume it's always well behaved
    if (this.linesReceived < 2) {
      this.linesReceived++;
      return;
    }

    this.linesReceived = 0;

    let message = JSON.parse(line) as Protocol.Event | Protocol.Response;
    if (this.printMessages) {
      console.log('Received', JSON.stringify(message, null, 2));
    }

    if (message.type === 'event') {
      this.emit(message.event, message.body);
    } else {
      let deferred = this.pending.get(message.request_seq);
      if (message.success) {
        deferred?.resolve(message.body);
      } else {
        deferred?.reject(new Error(message.message));
      }
    }
  }
}

function normalizePath(fileName: string): string {
  if (path.sep !== '/') {
    return fileName.split(path.sep).join('/');
  }

  return fileName;
}
