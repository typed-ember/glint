import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execaNode, ExecaChildProcess, Options } from 'execa';
import { type GlintConfigInput } from '@glint/core/config-types';
import { pathUtils, analyzeProject, ProjectAnalysis } from '@glint/core';

type GlintLanguageServer = ProjectAnalysis['languageServer'];

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = pathUtils.normalizeFilePath(path.resolve(dirname, '../../ephemeral'));

// You'd think this would exist, but... no? Accordingly, supply a minimal
// definition for our purposes here in tests.
interface TsconfigWithGlint {
  extends?: string;
  compilerOptions?: Record<string, unknown>; // no appropriate types exist :sigh:
  watchOptions?: Record<string, unknown>; // https://www.typescriptlang.org/tsconfig#watchOptions
  references?: Array<{ path: string }>;
  files?: Array<string>;
  include?: Array<string>;
  exclude?: Array<string>;
  glint?: GlintConfigInput;
}

const newWorkingDir = (): string =>
  pathUtils.normalizeFilePath(path.join(ROOT, Math.random().toString(16).slice(2)));

export class Project {
  private rootDir: string;
  private projectAnalysis?: ProjectAnalysis;

  private constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  public filePath(fileName: string): string {
    return pathUtils.normalizeFilePath(path.join(this.rootDir, fileName));
  }

  public fileURI(fileName: string): string {
    return pathUtils.filePathToUri(this.filePath(fileName));
  }

  public startLanguageServer(): GlintLanguageServer {
    if (this.projectAnalysis) {
      throw new Error('Language server is already running');
    }

    this.projectAnalysis = analyzeProject(this.rootDir);

    return this.projectAnalysis.languageServer;
  }

  /**
   * @param config A subset of `tsconfig.json` to use to configure the project
   * @param rootDir The directory in which to create the project. It is only
   *   legal to pass in a directory which rooted in an *existing* project, so
   *   if you need multiple projects, start by creating a project *without* this
   *   and then create a directory using {@link filePath}.
   */
  public static async create(
    config: TsconfigWithGlint = {},
    rootDir = newWorkingDir()
  ): Promise<Project> {
    if (!rootDir.includes(ROOT)) {
      throw new Error('Cannot create projects outside of `ROOT` dir');
    }

    let project = new Project(rootDir);
    let tsconfig: TsconfigWithGlint = {
      compilerOptions: {
        strict: true,
        target: 'es2019',
        module: 'es2015',
        moduleResolution: 'node',
        skipLibCheck: true,
        allowJs: true,
        checkJs: false,
        ...config.compilerOptions,
      },
      watchOptions: {
        watchFile: 'fixedPollingInterval',
        watchDirectory: 'fixedPollingInterval',
        synchronousWatchDirectory: true,
      },
      glint: config.glint ?? {
        environment: 'glimmerx',
      },
    };

    fs.rmSync(project.rootDir, { recursive: true, force: true });
    fs.mkdirSync(project.rootDir, { recursive: true });

    fs.writeFileSync(path.join(project.rootDir, 'package.json'), '{}');
    fs.writeFileSync(
      path.join(project.rootDir, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2)
    );

    return project;
  }

  /**
   * An alternative to `create` which does not supply an default values for the
   * config, and therefore has no possibility of odd merges, instead allowing
   * (but also requiring) the caller to supply it in full.
   */
  public static async createExact(
    tsconfig: TsconfigWithGlint,
    packageJson: Record<string, unknown> = {},
    rootDir = newWorkingDir()
  ): Promise<Project> {
    if (!rootDir.includes(ROOT)) {
      throw new Error('Cannot create projects outside of `ROOT` dir');
    }

    let project = new Project(rootDir);

    fs.rmSync(project.rootDir, { recursive: true, force: true });
    fs.mkdirSync(project.rootDir, { recursive: true });

    project.write('package.json', JSON.stringify(packageJson, null, 2));
    project.write('tsconfig.json', JSON.stringify(tsconfig, null, 2));

    return project;
  }

  public updateTsconfig(update: (config: TsconfigWithGlint) => TsconfigWithGlint | void): void {
    let tsconfig = JSON.parse(this.read('tsconfig.json'));
    this.write('tsconfig.json', JSON.stringify(update(tsconfig) ?? tsconfig, null, 2));
  }

  public setGlintConfig(config: TsconfigWithGlint['glint']): void {
    this.updateTsconfig((tsconfig) => {
      tsconfig.glint = config;
    });
  }

  public write(files: Record<string, string>): void;
  public write(fileName: string, fileContent: string): void;
  public write(...args: [Record<string, string>] | [string, string]): void {
    let files: Record<string, string>;
    if (args.length === 2) {
      files = { [args[0]]: args[1] };
    } else {
      files = args[0];
    }

    for (let [fileName, fileContent] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(this.filePath(fileName)), { recursive: true });
      fs.writeFileSync(this.filePath(fileName), fileContent);
    }
  }

  public readdir(dirName = '.'): Array<string> {
    return fs.readdirSync(this.filePath(dirName));
  }

  public read(fileName: string): string {
    return fs.readFileSync(this.filePath(fileName), 'utf-8');
  }

  public remove(fileName: string): void {
    fs.unlinkSync(this.filePath(fileName));
  }

  public rename(fromName: string, toName: string): void {
    fs.renameSync(this.filePath(fromName), this.filePath(toName));
  }

  public mkdir(name: string): void {
    fs.mkdirSync(this.filePath(name), { recursive: true });
  }

  public async destroy(): Promise<void> {
    this.projectAnalysis?.shutdown();
    fs.rmSync(this.rootDir, { recursive: true, force: true });
  }

  public check(options: Options & { flags?: string[] } = {}): ExecaChildProcess {
    return execaNode(require.resolve('@glint/core/bin/glint'), options.flags, {
      cwd: this.rootDir,
      ...options,
    });
  }

  public watch(options: Options & { flags?: string[] } = {}): Watch {
    let watchFlag = ['--watch'];
    let flags = options.flags ? watchFlag.concat(options.flags) : watchFlag;
    return new Watch(this, this.check({ ...options, flags, reject: false }));
  }

  public build(options: Options & { flags?: string[] } = {}, debug = false): ExecaChildProcess {
    let build = ['--build'];
    let flags = options.flags ? build.concat(options.flags) : build;
    return execaNode(require.resolve('@glint/core/bin/glint'), flags, {
      cwd: this.rootDir,
      nodeOptions: debug ? ['--inspect-brk'] : [],
      ...options,
    });
  }

  public buildWatch(options: Options & { flags?: string[] } = {}): Watch {
    let watchFlag = ['--watch'];
    let flags = options.flags ? watchFlag.concat(options.flags) : watchFlag;
    return new Watch(this, this.build({ ...options, flags, reject: false }));
  }
}

type AwaitOutputOptions = {
  timeout?: number;
  touchFile?: string;
  touchFileTimeout?: number;
};

class Watch {
  public allOutput = '';

  public constructor(private project: Project, private process: ExecaChildProcess) {
    this.process.stdout?.on('data', this.collectAllOutput);
    this.process.stderr?.on('data', this.collectAllOutput);
  }

  /**
   * "Write a file, then wait for the CLI to emit some output" is a common pattern in tests, but
   * in CI, TypeScript's filesystem watcher can occasionally miss events, so 'tickling' the file we
   * just wrote periodically to make sure the CLI noticed the change may help tests that are stable
   * locally but flaky in CI.
   *
   * This method encapsulates that entire process into a single action that should stabilize such
   * usage in CI.
   */
  public writeAndAwaitOutput(
    filePath: string,
    fileContent: string,
    output: string,
    options: Omit<AwaitOutputOptions, 'touchFile'> = {}
  ): Promise<string> {
    this.project.write(filePath, fileContent);
    return this.awaitOutput(output, { ...options, touchFile: filePath });
  }

  public awaitOutput(target: string, options: AwaitOutputOptions = {}): Promise<string> {
    let { timeout = 20_000, touchFile, touchFileTimeout = 5_000 } = options;

    return new Promise((resolve, reject) => {
      let output = '';
      let handleOutput = (chunk: any): void => {
        output += chunk.toString();
        if (output.includes(target)) {
          detach();
          clearInterval(checkInterval);
          resolve(output);
        }
      };

      let waited = 0;
      let checkInterval = setInterval(() => {
        waited += touchFileTimeout;
        touchFileIfNeeded();
        terminateIfTimedOut();
      }, touchFileTimeout);

      let touchFileIfNeeded = (): void => {
        // If there's still been no output and we have a file to touch, give that a try.
        if (waited < timeout && touchFile && output === '') {
          let now = new Date();
          let filePath = this.project.filePath(touchFile);
          fs.utimesSync(filePath, now, now);
          fs.closeSync(fs.openSync(filePath, 'a'));
        }
      };

      let terminateIfTimedOut = (): void => {
        if (waited >= timeout) {
          clearInterval(checkInterval);
          detach();
          reject(
            new Error(
              `Timed out waiting to see ${JSON.stringify(target)}. Instead saw: ${JSON.stringify(
                output
              )}`
            )
          );
        }
      };

      let detach = (): void => {
        clearTimeout(checkInterval);
        this.process.stdout?.off('data', handleOutput);
        this.process.stderr?.off('data', handleOutput);
      };

      this.process.stdout?.on('data', handleOutput);
      this.process.stderr?.on('data', handleOutput);
    });
  }

  private collectAllOutput = (chunk: any): void => {
    this.allOutput += chunk.toString();
  };

  public terminate(): ExecaChildProcess {
    this.process.stdout?.off('data', this.collectAllOutput);
    this.process.stderr?.off('data', this.collectAllOutput);
    this.process.kill();
    return this.process;
  }
}
