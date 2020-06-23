const EXTENSIONLESS_TRANSFORMED_SUFFIX = '.-glint-';
const TRANSFORMED_SUFFIX = `${EXTENSIONLESS_TRANSFORMED_SUFFIX}.ts`;

declare const TRANSFORMED: unique symbol;
declare const TRANSFORMABLE: unique symbol;

export type TransformedPath = string & { [TRANSFORMED]: true };
export type TransformablePath = string & { [TRANSFORMABLE]: true };

export function getTransformedPath(path: TransformablePath): TransformedPath {
  return path.replace('.ts', TRANSFORMED_SUFFIX) as TransformedPath;
}

export function getOriginalPath(path: TransformedPath): TransformablePath {
  return path.replace(TRANSFORMED_SUFFIX, '.ts') as TransformablePath;
}

export function isTransformablePath(path: string): path is TransformablePath {
  return path.endsWith('.ts') && !path.endsWith('.d.ts') && !path.endsWith(TRANSFORMED_SUFFIX);
}

export function isTransformedPath(path: string): path is TransformedPath {
  return path.endsWith(TRANSFORMED_SUFFIX);
}

// When dealing with modules, paths often don't include the extension...

export function isExtensionlessTransformedPath(path: string): boolean {
  return path.endsWith(EXTENSIONLESS_TRANSFORMED_SUFFIX);
}

export function getExtensionlessOriginalPath(path: string): string {
  return path.replace(EXTENSIONLESS_TRANSFORMED_SUFFIX, '');
}
