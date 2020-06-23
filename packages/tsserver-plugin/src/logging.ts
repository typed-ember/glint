import path from 'path';
import fs from 'fs';

const LOGGERS = new WeakMap<ts.server.PluginCreateInfo, Logger>();

export function loggerFor(info: ts.server.PluginCreateInfo): Logger {
  let logger = LOGGERS.get(info);
  if (!logger) {
    let logFile = resolveLogFile(info);
    if (logFile) {
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      logger = new FileLogger(logFile);
    } else {
      logger = NOOP_LOGGER;
    }

    LOGGERS.set(info, logger);
  }
  return logger;
}

export interface Logger {
  readonly enabled: boolean;
  log(...values: unknown[]): void;
}

export class FileLogger implements Logger {
  public readonly enabled = true;

  constructor(private readonly logFile: string) {}

  public log(...values: unknown[]): void {
    fs.appendFileSync(this.logFile, stringToLog(values));
  }
}

const NOOP_LOGGER: Logger = {
  enabled: false,
  log() {
    // Do nothing
  },
};

function resolveLogFile(info: ts.server.PluginCreateInfo): string | undefined {
  let { logFile } = info.config;
  if (typeof logFile === 'string') {
    return path.resolve(path.dirname(info.project.projectName), logFile);
  }
}

function stringToLog(values: unknown[]): string {
  return values.map(serialize).join(' ') + '\n';
}

function serialize(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
