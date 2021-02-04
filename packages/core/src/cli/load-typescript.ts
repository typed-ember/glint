import resolve from 'resolve';

type ts = typeof import('typescript');

export function loadTypeScript(): ts {
  let ts =
    tryResolve(() => require(resolve.sync('typescript', { basedir: process.cwd() }))) ??
    tryResolve(() => require('typescript'));

  if (!ts) {
    throw new Error('[glint] Unable to load TypeScript');
  }

  return ts;
}

function tryResolve<T>(load: () => T): T | null {
  try {
    return load();
  } catch (error) {
    if (error?.code === 'MODULE_NOT_FOUND') {
      return null;
    }

    throw error;
  }
}
