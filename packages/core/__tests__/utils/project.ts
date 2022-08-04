import path from 'path';
import fs from 'fs';
import execa, { ExecaChildProcess, Options } from 'execa';
import { ConfigLoader } from '@glint/config';
import GlintLanguageServer from '../../src/language-server/glint-language-server';
import { filePathToUri, normalizeFilePath } from '../../src/language-server/util';
import DocumentCache from '../../src/common/document-cache';
import TransformManager from '../../src/common/transform-manager';
import { parseTsconfig } from '../../src/language-server/pool';
import { GlintConfigInput } from '@glint/config/lib/config';

const ROOT = path.resolve(__dirname, '../../../../test-packages/ephemeral');

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
  normalizeFilePath(path.join(ROOT, Math.random().toString(16).slice(2)));

export default class Project {
  private rootDir: string;
  private server?: GlintLanguageServer;

  private constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  public filePath(fileName: string): string {
    return normalizeFilePath(path.join(this.rootDir, fileName));
  }

  public fileURI(fileName: string): string {
    return filePathToUri(this.filePath(fileName));
  }

  public startLanguageServer(): GlintLanguageServer {
    if (this.server) {
      throw new Error('Language server is already running');
    }

    let glintConfig = new ConfigLoader().configForDirectory(this.rootDir)!;
    let documents = new DocumentCache(glintConfig);
    let transformManager = new TransformManager(glintConfig, documents);
    let tsConfig = parseTsconfig(glintConfig, transformManager);

    return (this.server = new GlintLanguageServer(
      glintConfig,
      documents,
      transformManager,
      tsConfig
    ));
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
        ...(config.compilerOptions ?? {}),
      },
      glint: config.glint ?? {
        environment: 'glimmerx',
      },
    };

    fs.rmdirSync(project.rootDir, { recursive: true });
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

  public setGlintConfig(config: unknown): void {
    let tsconfig = JSON.parse(this.read('tsconfig.json'));
    tsconfig.glint = config;
    this.write('tsconfig.json', JSON.stringify(tsconfig, null, 2));
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
    this.server?.dispose();
    fs.rmdirSync(this.rootDir, { recursive: true });
  }

  public check(options: Options & { flags?: string[] } = {}): ExecaChildProcess {
    return execa.node(`${__dirname}/../../bin/glint`, options.flags, {
      cwd: this.rootDir,
      ...options,
    });
  }

  public watch(options?: Options): Watch {
    return new Watch(this.check({ ...options, flags: ['--watch'], reject: false }));
  }

  public build(options: Options & { flags?: string[] } = {}, debug = false): ExecaChildProcess {
    let build = ['--build'];
    let flags = options.flags ? build.concat(options.flags) : build;
    return execa.node(`${__dirname}/../../bin/glint`, flags, {
      cwd: this.rootDir,
      nodeOptions: debug ? ['--inspect-brk'] : [],
      ...options,
    });
  }

  public buildWatch(options: Options): Watch {
    return new Watch(this.build({ ...options, flags: ['--watch'], reject: false }));
  }
}

class Watch {
  public constructor(private process: ExecaChildProcess) {}

  public awaitOutput(target: string): Promise<string> {
    return new Promise((resolve) => {
      let output = '';
      let handleOutput = (chunk: any): void => {
        output += chunk.toString();
        if (output.includes(target)) {
          this.process.stdout?.off('data', handleOutput);
          this.process.stderr?.off('data', handleOutput);
          resolve(output);
        }
      };

      this.process.stdout?.on('data', handleOutput);
      this.process.stderr?.on('data', handleOutput);
    });
  }

  public terminate(): ExecaChildProcess {
    this.process.kill();
    return this.process;
  }
}
