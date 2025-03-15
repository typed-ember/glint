declare module '@glint/core' {
  export const pathUtils: {
    isAbsolute(path: string): boolean;
    join(...paths: string[]): string;
    dirname(path: string): string;
    basename(path: string): string;
    relative(from: string, to: string): string;
  };
}
