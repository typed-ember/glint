import path from 'path';
import fs from 'fs';
import execa, { ExecaChildProcess, Options } from 'execa';
import ts from 'typescript';
import { loadConfig } from '@glint/config';
import { sync as glob } from 'glob';
import GlintLanguageServer from '../../src/language-server/glint-language-server';
import { filePathToUri, normalizeFilePath } from '../../src/language-server/util';
import { isTemplate, synthesizedModulePathForTemplate } from '../../src/common/document-cache';

const ROOT = path.resolve(__dirname, '../../../../test-packages/ephemeral');

export default class Project {
  private rootDir = normalizeFilePath(path.join(ROOT, Math.random().toString(16).slice(2)));
  private server?: GlintLanguageServer;

  private constructor() {}

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

    let tsConfig = ts.parseJsonConfigFileContent(
      JSON.parse(this.read('tsconfig.json')),
      ts.sys,
      this.rootDir
    );

    let glintConfig = loadConfig(this.rootDir);
    let rootFileNames = glob('**/*.{ts,js,hbs}', {
      cwd: this.rootDir,
      absolute: true,
    }).map((file) =>
      isTemplate(file) ? synthesizedModulePathForTemplate(file, glintConfig) : file
    );

    return (this.server = new GlintLanguageServer(
      ts,
      glintConfig,
      () => rootFileNames,
      tsConfig.options
    ));
  }

  public static async create(compilerOptions: ts.CompilerOptions = {}): Promise<Project> {
    let project = new Project();
    let tsconfig = {
      compilerOptions: {
        strict: true,
        target: 'es2019',
        module: 'es2015',
        moduleResolution: 'node',
        skipLibCheck: true,
        allowJs: true,
        checkJs: false,
        ...compilerOptions,
      },
    };

    fs.rmdirSync(project.rootDir, { recursive: true });
    fs.mkdirSync(project.rootDir, { recursive: true });

    fs.writeFileSync(path.join(project.rootDir, 'package.json'), '{}');
    fs.writeFileSync(path.join(project.rootDir, '.glintrc'), 'environment: glimmerx\n');
    fs.writeFileSync(
      path.join(project.rootDir, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2)
    );

    return project;
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
