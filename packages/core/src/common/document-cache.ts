import * as path from 'node:path';
import { GlintConfig } from '../config/index.js';
import { v4 as uuid } from 'uuid';


// import { DocumentsAndSourceMaps } from './documents';
// import type { DocumentsAndSourceMaps } from '@volar/language-server/lib/common/documents.js';

// import type DocumentAndSou

// import { Document } from '@volar/language-server/lib/common/documents.js';

// having trouble how to figure out DocumentsAndSourceMaps type.

export type Document = {
  /** A unique identifier shared by all possible paths that may point to a document. */
  id: string;
  /** The "true" path where this document's source of truth can be found. */
  canonicalPath: string;
  /** Incremented each time the contents of a document changes (used by TS itself). */
  version: number;
  /** The current string contents of this document. */
  contents: string;
  /**
   * Whether this document is a placeholder for something that might exist, or has actually
   * been read from disk or opened in an editor.
   */
  speculative: boolean;
  /** Whether this document has changed on disk since the last time we read it. */
  stale: boolean;
};

/**
 * A read-through cache for workspace document contents.
 *
 * Via the Glint configuration it's instantiated with, this cache is aware
 * of two things:
 *   - the relationship between companion script and template files, treating
 *     a change to one member of such pairs as affecting the version of both
 *   - the existence of custom extensions that would result in multiple
 *     potential on-disk paths corresponding to a single logical TS module,
 *     where one path must win out.
 *     TODO: what does this mean? custom extensions like .gts. Potentialy on
 *     disk paths that refer to single module? .gts is a file with many templates.
 *
 * OK so we probably need to use this; how does this compare to Volar's document cache?
 * Check the stack frame to see where it's used.
 */
export default class DocumentCache {
  private readonly documents = new Map<string, Document>();
  private readonly ts: typeof import('typescript');

	// documents: DocumentsAndSourceMaps;

  public constructor(private glintConfig: GlintConfig) {
    // where is GlintConfig created?
    this.ts = glintConfig.ts;
  }

  public getDocumentID(path: string): string {
    return this.getDocument(path).id;
  }

  public getCanonicalDocumentPath(path: string): string {
    return this.getDocument(path).canonicalPath;
  }

  public documentExists(path: string): boolean {
    // If we have a document that's actually been read from disk, it definitely exists.
    if (this.documents.get(path)?.speculative === false) {
      return true;
    }

    return this.getCandidateDocumentPaths(path).some((candidate) =>
      this.ts.sys.fileExists(candidate)
    );
  }

  public getCandidateDocumentPaths(filename: string): Array<string> {
    let extension = path.extname(filename);
    let filenameWithoutExtension = filename.slice(0, filename.lastIndexOf(extension));

    return this.getCandidateExtensions(filename).map((ext) => `${filenameWithoutExtension}${ext}`);
  }

  public getCompanionDocumentPath(path: string): string | undefined {
    let { environment } = this.glintConfig;
    let candidates = environment.isTemplate(path)
      ? environment.getPossibleScriptPaths(path)
      : environment.getPossibleTemplatePaths(path);

    for (let { path, deferTo } of candidates) {
      // If a candidate companion exist and no other module that would claim that
      // companion with a higher priority exists, we've found our winner.
      if (this.documentExists(path) && !deferTo.some((path) => this.documentExists(path))) {
        return path;
      }
    }

    if (environment.isTemplate(path)) {
      return this.glintConfig.getSynthesizedScriptPathForTS(path);
    }
  }

  public getDocumentContents(path: string, encoding?: string): string {
    if (!this.documentExists(path)) return '';

    let document = this.getDocument(path);
    if (document.stale) {
      let onDiskPath = this.getCandidateDocumentPaths(path).find((path) =>
        this.ts.sys.fileExists(path)
      );

      document.stale = false;

      if (onDiskPath) {
        document.contents = this.ts.sys.readFile(onDiskPath, encoding) ?? '';
        document.canonicalPath = onDiskPath;
        document.speculative = false;
      } else {
        document.speculative = true;
      }
    }

    return document.contents;
  }

  public getCompoundDocumentVersion(path: string): string {
    let env = this.glintConfig.environment;
    let template = env.isTemplate(path) ? this.getDocument(path) : this.findCompanionDocument(path);
    let script = env.isTemplate(path) ? this.findCompanionDocument(path) : this.getDocument(path);

    return `${script?.version}:${template?.version}`;
  }

  public getDocumentVersion(path: string): string {
    return this.getDocument(path).version.toString();
  }

  public updateDocument(path: string, contents: string): void {
    let document = this.getDocument(path);

    document.stale = false;
    document.speculative = false;
    document.contents = contents;
    document.canonicalPath = path;
    document.version++;

    this.incrementCompanionVersion(path);
  }

  public markDocumentStale(path: string): void {
    let document = this.getDocument(path);

    document.stale = true;
    document.speculative = true;
    document.version++;

    this.incrementCompanionVersion(path);
  }

  // called by TransformManager, which has a watcher thing.
  // called by GlintLanguageServer, which we no longer use.
  // Can probably remove this?
  public removeDocument(path: string): void {
    for (let candidate of this.getCandidateDocumentPaths(path)) {
      this.documents.delete(candidate);
    }
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
      document = {
        id: uuid(),
        canonicalPath: path,
        version: 0,
        contents: '',
        stale: true,
        speculative: true,
      };

      for (let candidate of this.getCandidateDocumentPaths(path)) {
        this.documents.set(candidate, document);
      }
    }
    return document;
  }

  private getCandidateExtensions(filename: string): ReadonlyArray<string> {
    let { environment } = this.glintConfig;
    switch (environment.getSourceKind(filename)) {
      case 'template':
        return environment.templateExtensions;
      case 'typed-script':
        return environment.typedScriptExtensions;
      case 'untyped-script':
        return environment.untypedScriptExtensions;
      default:
        return [path.extname(filename)];
    }
  }
}

const SCRIPT_EXTENSION_REGEX = /\.(ts|js)$/;

export function templatePathForSynthesizedModule(path: string): string {
  return path.replace(SCRIPT_EXTENSION_REGEX, '.hbs');
}
