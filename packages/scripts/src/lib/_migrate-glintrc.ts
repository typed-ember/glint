import { readFile, writeFile } from 'fs/promises';
import * as path from 'path';

import { evaluate, patch } from 'golden-fleece';
import yaml from 'js-yaml';
import Result, { err, isInstance, ok, tryOrElse } from 'true-myth/result';
import Unit from 'true-myth/unit';
import yargs from 'yargs';

import { z } from 'zod';

const EnvironmentList = z.array(z.string());

const EnvironmentMap = z.record(
  z.object({
    additionalGlobals: z.optional(z.array(z.string())),
  })
);
type EnvironmentMap = z.infer<typeof EnvironmentMap>;

const Environment = z.optional(z.union([z.string(), EnvironmentList, EnvironmentMap]));
const Files = z.optional(z.array(z.string()));

const GlintRc = z.object({
  environment: Environment,
  checkStandaloneTemplates: z.optional(z.boolean()),
  include: Files,
  exclude: Files,
});

type GlintRc = z.infer<typeof GlintRc>;

type GlintConfig = {
  environment?:
    | string
    | string[]
    | Record<
        string,
        {
          additionalGlobals?: string[] | undefined;
        }
      >;
  checkStandaloneTemplates?: boolean;
  transform?: {
    include?: string[];
    exclude?: string[];
  };
};

function loadFile(path: string): Promise<Result<string, string>> {
  return readFile(path, { encoding: 'utf-8' })
    .then((v) => ok<string, string>(v))
    .catch((e) => err(`Could not load file at ${path}: ${JSON.stringify(e)}`));
}

function loadOrCreateTsconfig(configPath: string): Promise<string> {
  return readFile(configPath, { encoding: 'utf-8' }).catch((e) => {
    console.info(
      `Could not load tsconfig.json at ${configPath}: ${e}; attempting to create a new one`
    );
    return '{}';
  });
}

function saveFile(path: string, data: string): Promise<Result<Unit, string>> {
  return writeFile(path, data)
    .then(() => ok<Unit, string>())
    .catch((e) => err(`Could not write file at ${path}: ${JSON.stringify(e)}`));
}

function assert(predicate: unknown, reason: string): asserts predicate {
  if (!predicate) {
    throw new Error(`panic: ${reason}`);
  }
}

function parseGlintRcFile(contents: string): Result<GlintRc, string> {
  let errors: string[] = [];
  let yamlData = yaml.load(contents, {
    onWarning: (yamlException) => errors.push(yamlException.toString()),
  });
  if (errors.length) {
    return err(`Could not parse YAML:\n\t${errors.join('\n\t')}`);
  }

  return tryOrElse(
    (e) => {
      assert(e instanceof z.ZodError, 'error somehow not a zod error');
      return `Could not parse data as a Glint config:\n\t${e.format()._errors.join('\n\t')}`;
    },
    () => {
      return GlintRc.parse(yamlData);
    }
  );
}

// Represents the part of a tsconfig.json file we care about. That is: not much!
type ReadyToTransform = {
  glint?: GlintConfig;
};

function loadTsconfig(contents: unknown): Result<ReadyToTransform, string> {
  if (typeof contents !== 'string') {
    return err(`Could not patch ${JSON.stringify(contents)}: not a string`);
  }

  return tryOrElse(
    (e) => `Could not patch data:\n\t${e instanceof Error ? e.message : JSON.stringify(e)}`,
    () => {
      let result = evaluate(contents);

      if (typeof result !== 'object' || result == null || Array.isArray(result)) {
        throw new Error('invalid contents of tsconfig.json file');
      }

      return result as ReadyToTransform;
    }
  );
}

function patchTsconfig(contents: unknown, rc: GlintRc): Result<string, string> {
  if (typeof contents !== 'string') {
    return err(`Could not patch ${JSON.stringify(contents)}: not a string`);
  }

  return loadTsconfig(contents)
    .andThen<ReadyToTransform>((loadedTsconfig) =>
      loadedTsconfig.glint
        ? err('There is already a glint config present, not overriding it')
        : ok(loadedTsconfig)
    )
    .andThen((config) =>
      tryOrElse(
        (e) => {
          return `Could not patch data:\n\t${JSON.stringify(e)}`;
        },
        () => {
          // Build up the modified config incrementally, *not* adding
          // `undefined` to it at any point, because we cannot patch in
          // `undefined`!
          config.glint = {};

          if (rc.environment !== undefined) {
            config.glint.environment = rc.environment;
          }

          if (rc.checkStandaloneTemplates !== undefined) {
            config.glint.checkStandaloneTemplates = rc.checkStandaloneTemplates;
          }

          if (rc.include || rc.exclude) {
            config.glint.transform = {};

            if (rc.include !== undefined) {
              config.glint.transform.include = rc.include;
            }

            if (rc.exclude !== undefined) {
              config.glint.transform.exclude = rc.exclude;
            }
          }

          return patch(contents, config);
        }
      )
    );
}

function settledToResult<T>(
  settledResults: Array<PromiseSettledResult<Result<T, unknown>>>
): Array<Result<T, string>>;
function settledToResult<T>(
  settledResults: Array<PromiseSettledResult<T>>
): Array<Result<T, string>>;
function settledToResult<T>(
  settledResults: Array<PromiseSettledResult<T | Result<T, unknown>>>
): Array<Result<T, string>> {
  return settledResults.map((result) => {
    if (result.status === 'fulfilled') {
      return isInstance(result.value)
        ? result.value.mapErr((e) => JSON.stringify(e))
        : ok(result.value);
    } else {
      return err(JSON.stringify(result.reason));
    }
  });
}

function neighborTsconfigPath(rcPath: string): string {
  return path.join(rcPath, '..', 'tsconfig.json');
}

type Output<T, E> = SplitResults<T, E> | Result<string, string>;

type SplitResults<T, E> = {
  successes: T[];
  failures: E[];
};

function toSplitResults<T>(
  settledResults: Array<PromiseSettledResult<Result<T, unknown>>>
): SplitResults<T, string> {
  return splitResults(settledToResult(settledResults));

  function splitResults<T, E>(rs: Array<Result<T, E>>): SplitResults<T, E> {
    return rs.reduce(
      ({ successes, failures }, r) =>
        r.match({
          Ok: (value) => ({ successes: successes.concat(value), failures }),
          Err: (error) => ({ successes, failures: failures.concat(error) }),
        }),
      {
        successes: [] as T[],
        failures: [] as E[],
      }
    );
  }
}

type ArgParseResult = Result<string | string[], string>;

function parseArgs(pathArgs: string[]): Promise<ArgParseResult> {
  return new Promise((resolve) => {
    yargs(pathArgs)
      .scriptName('migrate-glintrc')
      .usage('$0 <paths>')
      .positional('paths', {
        description: 'path to the `.glintrc.yml` file(s) to migrate',
        array: true,
      })
      .demandCommand(1, 'you must supply at least one path')
      .wrap(100)
      .strict()
      .exitProcess(false)
      .parseSync(pathArgs, {}, (error, { _: paths }, output) => {
        if (error) {
          resolve(err(output));
          return;
        }

        if (output) {
          resolve(ok(output));
          return;
        }

        if (!Array.isArray(paths)) {
          resolve(err('you must supply at least one path'));
          return;
        }

        let invalidPaths = paths.filter((p) => typeof p === 'number');
        if (invalidPaths.length > 0) {
          let list = invalidPaths.join(', ');
          resolve(err(`invalid paths supplied: ${list}`));
          return;
        }

        // SAFETY: if there were any non-string paths, we resolved with an error
        // above, so we know this is safe.
        resolve(ok(paths as string[]));
      });
  });
}

export async function migrate(pathArgs: string[]): Promise<SplitResults<string, string>> {
  let parseResult = await parseArgs(pathArgs);
  if (parseResult.isErr) {
    return {
      successes: [],
      failures: [parseResult.error],
    };
  }

  if (parseResult.isOk && typeof parseResult.value === 'string') {
    return {
      successes: [parseResult.value],
      failures: [],
    };
  }

  // SAFETY: if it was a `string`, we returned above.
  let paths = parseResult.value as string[];

  let parsed = await Promise.allSettled(
    paths.map(async (p) => {
      const contents = await loadFile(p);

      return contents
        .andThen(parseGlintRcFile)
        .map((config) => ({ path: p, config }))
        .mapErr((err) => `${p}: ${err}`);
    })
  ).then(toSplitResults);

  let patched = await Promise.allSettled(
    parsed.successes.map(async ({ path: rcPath, config: rc }) => {
      let tsconfigPath = neighborTsconfigPath(rcPath);
      const contents = await loadOrCreateTsconfig(tsconfigPath);

      return patchTsconfig(contents, rc)
        .map((patched) => ({ rcPath, tsconfigPath, patched }))
        .mapErr((err) => `${rcPath}: ${err}`);
    })
  ).then(toSplitResults);

  let write = await Promise.allSettled(
    patched.successes.map(async ({ rcPath, tsconfigPath, patched }) => {
      const writeResult = await saveFile(tsconfigPath, patched);
      return writeResult.map(() => `Updated ${tsconfigPath} with contents of ${rcPath}`);
    })
  ).then(toSplitResults);

  return {
    successes: write.successes,
    failures: [...parsed.failures, ...patched.failures, ...write.failures],
  };
}
