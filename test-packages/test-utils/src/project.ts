import * as path from 'node:path';
import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execaNode, ExecaChildProcess, Options } from 'execa';
import { type GlintConfigInput } from '@glint/core/config-types';
import { pathUtils, analyzeProject, ProjectAnalysis } from '@glint/core';
import { startLanguageServer, LanguageServerHandle } from '@volar/test-utils';

// type GlintLanguageServer = ProjectAnalysis['languageServer'];

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = pathUtils.normalizeFilePath(path.resolve(dirname, '../../ephemeral'));

// You'd think this would exist, but... no? Accordingly, supply a minimal
// definition for our purposes here in tests.
interface TsconfigWithGlint {
  extends?: string;
  compilerOptions?: Record<string, unknown>; // no appropriate types exist :sigh:
  references?: Array<{ path: string }>;
  files?: Array<string>;
  include?: Array<string>;
  exclude?: Array<string>;
  glint?: GlintConfigInput;
}

const newWorkingDir = (): string =>
  pathUtils.normalizeFilePath(path.join(ROOT, Math.random().toString(16).slice(2)));

// export type LanguageServerHandle = ReturnType<typeof startLanguageServer>;

export class Project {
  private rootDir: string;
  // private projectAnalysis?: ProjectAnalysis;
  private languageServerHandle?: LanguageServerHandle;

  private constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  public filePath(fileName: string): string {
    return pathUtils.normalizeFilePath(path.join(this.rootDir, fileName));
  }

  public fileURI(fileName: string): string {
    return pathUtils.filePathToUri(this.filePath(fileName));
  }

  public async startLanguageServer() {
    // GlintLanguageServer {
    if (this.languageServerHandle) {
      throw new Error('Language server is already running');
    }

    // this.projectAnalysis = analyzeProject(this.rootDir);

    // spin up a language server where bin is the bin path to the language server
    // and url is ../
    // let server = await startLanguageServer(bin, new URL('..', import.meta.url));
    // const cwd = new URL('..', import.meta.url);
    // let server = await startLanguageServer(bin, cwd);

    // TODO: rootDir might not be necessary? cwd arg is optional.
    this.languageServerHandle = startLanguageServer('../../../core/bin/glint-language-server');


    // , this.
    await this.languageServerHandle.initialize(this.rootDir, {
      // typescript: {enabled: true, tsdk}
    })
  

  

    return this.languageServerHandle;
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
    let tsconfig = {
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
      glint: config.glint ?? {
        environment: ['ember-loose', 'ember-template-imports'],
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
    // this.projectAnalysis?.shutdown();
    this.languageServerHandle?.connection.dispose();

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
    return new Watch(this.check({ ...options, flags, reject: false }));
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
    return new Watch(this.build({ ...options, flags, reject: false }));
  }
}

class Watch {
  allOutput = '';

  public constructor(private process: ExecaChildProcess) {
    this.process.stdout?.on('data', this.collectAllOutput);
    this.process.stderr?.on('data', this.collectAllOutput);
  }

  public awaitOutput(target: string, { timeout = 20_000 } = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      let output = '';
      let handleOutput = (chunk: any): void => {
        output += chunk.toString();
        if (output.includes(target)) {
          detach();
          resolve(output);
        }
      };

      let timeoutHandle = setTimeout(() => {
        detach();
        reject(
          new Error(
            `Timed out waiting to see ${JSON.stringify(target)}. Instead saw: ${JSON.stringify(
              output
            )}`
          )
        );
      }, timeout);

      let detach = (): void => {
        clearTimeout(timeoutHandle);
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
