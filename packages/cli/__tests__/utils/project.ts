import path from 'path';
import fs from 'fs';
import execa, { ExecaChildProcess, Options } from 'execa';

const ROOT = path.resolve(__dirname, '../../../../test-packages/ephemeral');

export default class Project {
  private rootDir = path.join(ROOT, Math.random().toString(16).slice(2));

  private constructor() {}

  public filePath(fileName: string): string {
    return path.join(this.rootDir, fileName);
  }

  public static async create(
    compilerOptions: import('typescript').CompilerOptions = {}
  ): Promise<Project> {
    let project = new Project();
    let tsconfig = {
      compilerOptions: {
        strict: true,
        target: 'es2019',
        module: 'es2015',
        moduleResolution: 'node',
        skipLibCheck: true,
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

  public write(fileName: string, fileContent: string): void {
    fs.writeFileSync(this.filePath(fileName), fileContent);
  }

  public read(fileName: string): string {
    return fs.readFileSync(this.filePath(fileName), 'utf-8');
  }

  public remove(fileName: string): void {
    fs.unlinkSync(this.filePath(fileName));
  }

  public async destroy(): Promise<void> {
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
