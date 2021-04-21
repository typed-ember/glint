import { GlintConfig } from '@glint/config';

export type Document = {
  version: number;
  contents: string;
  stale: boolean;
};

/**
 * A read-through cache for workspace document contents.
 *
 * This cache is aware (via the glint configuration it's instantiated with)
 * of the relationship between certain `.ts` and `.hbs` files, and will
 * treat a change to one member of such pairs as affecting the version
 * of both.
 */
export default class DocumentCache {
  private readonly documents = new Map<string, Document>();

  public constructor(private ts: typeof import('typescript'), private glintConfig: GlintConfig) {}

  public documentExists(path: string): boolean {
    return this.documents.has(path) || this.ts.sys.fileExists(path);
  }

  public getCompanionDocumentPath(path: string): string | undefined {
    let { environment } = this.glintConfig;
    let candidates = isTemplate(path)
      ? environment.getPossibleScriptPaths(path)
      : environment.getPossibleTemplatePaths(path);

    for (let { path, deferTo } of candidates) {
      // If a candidate companions exist and no other module that would claim that
      // companion with a higher priority exists, we've found our winner.
      if (this.documentExists(path) && !deferTo.some((path) => this.documentExists(path))) {
        return path;
      }
    }
  }

  public getDocumentContents(path: string, encoding?: string): string {
    if (!this.documentExists(path)) return '';

    let document = this.getDocument(path);
    if (document.stale) {
      document.contents = this.ts.sys.readFile(path, encoding) ?? '';
      document.stale = false;
    }

    return document.contents;
  }

  public getCompoundDocumentVersion(path: string): string {
    let template = isTemplate(path) ? this.getDocument(path) : this.findCompanionDocument(path);
    let script = isTemplate(path) ? this.findCompanionDocument(path) : this.getDocument(path);

    return `${script?.version}:${template?.version}`;
  }

  public getDocumentVersion(path: string): string {
    return this.getDocument(path).version.toString();
  }

  public updateDocument(path: string, contents: string): void {
    let document = this.getDocument(path);

    document.stale = false;
    document.contents = contents;
    document.version++;

    this.incrementCompanionVersion(path);
  }

  public markDocumentStale(path: string): void {
    let document = this.getDocument(path);

    document.stale = true;
    document.version++;

    this.incrementCompanionVersion(path);
  }

  public removeDocument(path: string): void {
    this.documents.delete(path);
  }

  private incrementCompanionVersion(path: string): void {
    let companion = this.findCompanionDocument(path);
    if (companion) {
      companion.version++;
    }
  }

  private findCompanionDocument(path: string): Document | undefined {
    let companionPath = this.getCompanionDocumentPath(path);
    return companionPath ? this.getDocument(companionPath) : undefined;
  }

  private getDocument(path: string): Document {
    let document = this.documents.get(path);
    if (!document) {
      document = { version: 0, contents: '', stale: true };
      this.documents.set(path, document);
    }
    return document;
  }
}

export function isTemplate(path: string): boolean {
  return path.endsWith('.hbs');
}

export function isScript(path: string): boolean {
  return path.endsWith('.ts');
}
