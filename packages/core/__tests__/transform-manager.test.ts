import { describe, test, expect, vi, beforeEach } from 'vitest';
import TransformManager from '../src/common/transform-manager.js';

/**
 * Tests for TransformManager's file existence and reading functionality,
 * specifically testing the new feature that supports finding .gjs.d.ts and .gts.d.ts
 * files when looking for .d.ts files (for Glint V1 to V2 migration support).
 *
 * This supports the scenario where:
 * - A .gjs or .gts file exists (e.g., component.gjs)
 * - A corresponding declaration file exists (e.g., component.gjs.d.ts)
 * - Code imports using .d.ts extension (e.g., import from './component.d.ts')
 * - TransformManager should find and use the .gjs.d.ts file
 */

describe('TransformManager', () => {
  let mockTS: any;
  let mockGlintConfig: any;
  let mockDocumentCache: any;
  let transformManager: TransformManager;

  beforeEach(() => {
    mockTS = {
      sys: {
        fileExists: vi.fn(),
        readFile: vi.fn(),
        getCurrentDirectory: vi.fn(() => '/test'),
      },
      createModuleResolutionCache: vi.fn(() => ({})),
      sortAndDeduplicateDiagnostics: vi.fn((diags: any) => diags),
    };

    mockGlintConfig = {
      ts: mockTS,
      environment: {
        typedScriptExtensions: ['.ts', '.gts', '.gjs'],
        untypedScriptExtensions: ['.js'],
      },
    };

    mockDocumentCache = {
      documentExists: vi.fn(),
      getDocumentContents: vi.fn(),
    };

    transformManager = new TransformManager(mockGlintConfig, mockDocumentCache);
  });

  describe('fileExists', () => {
    test('returns true if document exists normally', () => {
      mockDocumentCache.documentExists.mockReturnValue(true);

      const result = transformManager.fileExists('/path/to/file.ts');

      expect(result).toBe(true);
      expect(mockDocumentCache.documentExists).toHaveBeenCalledWith('/path/to/file.ts');
    });

    test('returns false for non-.d.ts files that do not exist normally', () => {
      mockDocumentCache.documentExists.mockReturnValue(false);

      const result = transformManager.fileExists('/path/to/file.ts');

      expect(result).toBe(false);
      expect(mockDocumentCache.documentExists).toHaveBeenCalledWith('/path/to/file.ts');
    });

    describe('for .d.ts files', () => {
      test('returns false if no alternative declaration file exists', () => {
        mockDocumentCache.documentExists.mockReturnValue(false);
        mockTS.sys.fileExists.mockReturnValue(false);

        const result = transformManager.fileExists('/path/to/component.d.ts');

        expect(result).toBe(false);
      });

      test('returns true if .gts source file exists and has corresponding .gts.d.ts', () => {
        mockDocumentCache.documentExists
          .mockReturnValueOnce(false) // component.d.ts doesn't exist normally
          .mockReturnValueOnce(true); // component.gts exists
        mockTS.sys.fileExists.mockReturnValue(true); // component.gts.d.ts exists

        const result = transformManager.fileExists('/path/to/component.d.ts');

        expect(result).toBe(true);
        expect(mockDocumentCache.documentExists).toHaveBeenCalledWith('/path/to/component.gts');
        expect(mockTS.sys.fileExists).toHaveBeenCalledWith('/path/to/component.gts.d.ts');
      });

      test('returns true if .gjs source file exists and has corresponding .gjs.d.ts', () => {
        mockDocumentCache.documentExists
          .mockReturnValueOnce(false) // component.d.ts doesn't exist normally
          .mockReturnValueOnce(false) // component.gts doesn't exist (checked first)
          .mockReturnValueOnce(true); // component.gjs exists (checked second)
        mockTS.sys.fileExists.mockReturnValue(true); // component.gjs.d.ts exists

        const result = transformManager.fileExists('/path/to/component.d.ts');

        expect(result).toBe(true);
        expect(mockDocumentCache.documentExists).toHaveBeenCalledWith('/path/to/component.gts');
        expect(mockDocumentCache.documentExists).toHaveBeenCalledWith('/path/to/component.gjs');
        expect(mockTS.sys.fileExists).toHaveBeenCalledWith('/path/to/component.gjs.d.ts');
      });

      test('returns false if .gts source file exists but no .gts.d.ts file', () => {
        mockDocumentCache.documentExists
          .mockReturnValueOnce(false) // component.d.ts doesn't exist normally
          .mockReturnValueOnce(true); // component.gts exists
        mockTS.sys.fileExists.mockReturnValue(false); // component.gts.d.ts doesn't exist

        const result = transformManager.fileExists('/path/to/component.d.ts');

        expect(result).toBe(false);
      });

      test('skips .ts and .js extensions when looking for alternatives', () => {
        mockDocumentCache.documentExists.mockReturnValue(false);
        mockTS.sys.fileExists.mockReturnValue(false);

        const result = transformManager.fileExists('/path/to/component.d.ts');

        expect(result).toBe(false);
        expect(mockDocumentCache.documentExists).not.toHaveBeenCalledWith('/path/to/component.ts');
        expect(mockDocumentCache.documentExists).not.toHaveBeenCalledWith('/path/to/component.js');
      });

      test('checks multiple extensions until one is found', () => {
        mockDocumentCache.documentExists
          .mockReturnValueOnce(false) // component.d.ts doesn't exist normally
          .mockReturnValueOnce(false) // component.gts doesn't exist
          .mockReturnValueOnce(true); // component.gjs exists
        mockTS.sys.fileExists.mockReturnValue(true); // component.gjs.d.ts exists

        const result = transformManager.fileExists('/path/to/component.d.ts');

        expect(result).toBe(true);
        expect(mockDocumentCache.documentExists).toHaveBeenCalledWith('/path/to/component.gts');
        expect(mockDocumentCache.documentExists).toHaveBeenCalledWith('/path/to/component.gjs');
        expect(mockTS.sys.fileExists).toHaveBeenCalledWith('/path/to/component.gjs.d.ts');
      });

      test('stops checking after finding first match', () => {
        mockDocumentCache.documentExists
          .mockReturnValueOnce(false) // component.d.ts doesn't exist normally
          .mockReturnValueOnce(true); // component.gts exists (first match)
        mockTS.sys.fileExists.mockReturnValue(true); // component.gts.d.ts exists

        const result = transformManager.fileExists('/path/to/component.d.ts');

        expect(result).toBe(true);
        // Should not check .gjs since .gts was found first
        expect(mockDocumentCache.documentExists).not.toHaveBeenCalledWith('/path/to/component.gjs');
      });
    });
  });

  describe('readTransformedFile', () => {
    beforeEach(() => {
      // Mock getTransformInfo to return null (no transform info)
      vi.spyOn(transformManager as any, 'getTransformInfo').mockReturnValue(null);
    });

    test('returns document contents for non-.d.ts files', () => {
      mockDocumentCache.getDocumentContents.mockReturnValue('file contents');

      const result = transformManager.readTransformedFile('/path/to/file.ts', 'utf8');

      expect(result).toBe('file contents');
      expect(mockDocumentCache.getDocumentContents).toHaveBeenCalledWith('/path/to/file.ts', 'utf8');
    });

    test('returns document contents for .d.ts files with no alternatives', () => {
      mockDocumentCache.documentExists.mockReturnValue(false);
      mockTS.sys.fileExists.mockReturnValue(false);
      mockDocumentCache.getDocumentContents.mockReturnValue('fallback contents');

      const result = transformManager.readTransformedFile('/path/to/component.d.ts', 'utf8');

      expect(result).toBe('fallback contents');
      expect(mockDocumentCache.getDocumentContents).toHaveBeenCalledWith('/path/to/component.d.ts', 'utf8');
    });

    describe('for .d.ts files with alternatives', () => {
      test('returns contents from .gts.d.ts when .gts source exists', () => {
        mockDocumentCache.documentExists.mockReturnValue(true); // component.gts exists
        mockTS.sys.fileExists.mockReturnValue(true); // component.gts.d.ts exists
        mockTS.sys.readFile.mockReturnValue('declaration file contents');

        const result = transformManager.readTransformedFile('/path/to/component.d.ts', 'utf8');

        expect(result).toBe('declaration file contents');
        expect(mockTS.sys.readFile).toHaveBeenCalledWith('/path/to/component.gts.d.ts', 'utf8');
      });

      test('returns contents from .gjs.d.ts when .gjs source exists', () => {
        mockDocumentCache.documentExists
          .mockReturnValueOnce(false) // component.gts doesn't exist
          .mockReturnValueOnce(true); // component.gjs exists
        mockTS.sys.fileExists.mockReturnValue(true); // component.gjs.d.ts exists
        mockTS.sys.readFile.mockReturnValue('gjs declaration contents');

        const result = transformManager.readTransformedFile('/path/to/component.d.ts', 'utf8');

        expect(result).toBe('gjs declaration contents');
        expect(mockTS.sys.readFile).toHaveBeenCalledWith('/path/to/component.gjs.d.ts', 'utf8');
      });

      test('falls back to document contents if alternative exists but no .d.ts file', () => {
        mockDocumentCache.documentExists.mockReturnValue(true); // component.gts exists
        mockTS.sys.fileExists.mockReturnValue(false); // component.gts.d.ts doesn't exist
        mockDocumentCache.getDocumentContents.mockReturnValue('fallback contents');

        const result = transformManager.readTransformedFile('/path/to/component.d.ts', 'utf8');

        expect(result).toBe('fallback contents');
        expect(mockDocumentCache.getDocumentContents).toHaveBeenCalledWith('/path/to/component.d.ts', 'utf8');
      });

      test('skips .ts and .js extensions when looking for alternatives', () => {
        mockDocumentCache.documentExists.mockReturnValue(false);
        mockTS.sys.fileExists.mockReturnValue(false);
        mockDocumentCache.getDocumentContents.mockReturnValue('fallback contents');

        const result = transformManager.readTransformedFile('/path/to/component.d.ts', 'utf8');

        expect(result).toBe('fallback contents');
        expect(mockDocumentCache.documentExists).not.toHaveBeenCalledWith('/path/to/component.ts');
        expect(mockDocumentCache.documentExists).not.toHaveBeenCalledWith('/path/to/component.js');
      });

      test('stops at first matching alternative file', () => {
        mockDocumentCache.documentExists
          .mockReturnValueOnce(true); // component.gts exists (first match)
        mockTS.sys.fileExists.mockReturnValue(true); // component.gts.d.ts exists
        mockTS.sys.readFile.mockReturnValue('gts declaration contents');

        const result = transformManager.readTransformedFile('/path/to/component.d.ts', 'utf8');

        expect(result).toBe('gts declaration contents');
        // Should not check .gjs since .gts was found first
        expect(mockDocumentCache.documentExists).not.toHaveBeenCalledWith('/path/to/component.gjs');
      });
    });

    test('returns transformed contents when transform info exists', () => {
      const mockTransformInfo = {
        transformedModule: {
          transformedContents: 'transformed contents'
        }
      };
      vi.spyOn(transformManager as any, 'getTransformInfo').mockReturnValue(mockTransformInfo);

      const result = transformManager.readTransformedFile('/path/to/file.ts', 'utf8');

      expect(result).toBe('transformed contents');
    });
  });

  describe('findAlternativeDeclarationFile (private method)', () => {
    test('returns null for non-.d.ts files', () => {
      const result = (transformManager as any).findAlternativeDeclarationFile('/path/to/file.ts');

      expect(result).toBeNull();
    });

    test('returns null when no alternative source files exist', () => {
      mockDocumentCache.documentExists.mockReturnValue(false);
      mockTS.sys.fileExists.mockReturnValue(false);

      const result = (transformManager as any).findAlternativeDeclarationFile('/path/to/component.d.ts');

      expect(result).toBeNull();
    });

    test('returns .gts.d.ts path when .gts source exists', () => {
      mockDocumentCache.documentExists.mockReturnValue(true); // component.gts exists
      mockTS.sys.fileExists.mockReturnValue(true); // component.gts.d.ts exists

      const result = (transformManager as any).findAlternativeDeclarationFile('/path/to/component.d.ts');

      expect(result).toBe('/path/to/component.gts.d.ts');
    });

    test('returns .gjs.d.ts path when .gjs source exists', () => {
      mockDocumentCache.documentExists
        .mockReturnValueOnce(false) // component.gts doesn't exist
        .mockReturnValueOnce(true); // component.gjs exists
      mockTS.sys.fileExists.mockReturnValue(true); // component.gjs.d.ts exists

      const result = (transformManager as any).findAlternativeDeclarationFile('/path/to/component.d.ts');

      expect(result).toBe('/path/to/component.gjs.d.ts');
    });

    test('returns null when source exists but no corresponding .d.ts file', () => {
      mockDocumentCache.documentExists.mockReturnValue(true); // component.gts exists
      mockTS.sys.fileExists.mockReturnValue(false); // component.gts.d.ts doesn't exist

      const result = (transformManager as any).findAlternativeDeclarationFile('/path/to/component.d.ts');

      expect(result).toBeNull();
    });
  });

  describe('integration with different file extensions', () => {
    test('handles complex file paths correctly', () => {
      mockDocumentCache.documentExists
        .mockReturnValueOnce(false) // normal check fails
        .mockReturnValueOnce(true); // .gts exists
      mockTS.sys.fileExists.mockReturnValue(true);

      const result = transformManager.fileExists('/deep/nested/path/to/my-component.d.ts');

      expect(result).toBe(true);
      expect(mockDocumentCache.documentExists).toHaveBeenCalledWith('/deep/nested/path/to/my-component.gts');
      expect(mockTS.sys.fileExists).toHaveBeenCalledWith('/deep/nested/path/to/my-component.gts.d.ts');
    });

    test('handles files with multiple dots in name', () => {
      mockDocumentCache.documentExists
        .mockReturnValueOnce(false) // my.special.component.d.ts doesn't exist normally
        .mockReturnValueOnce(false) // my.special.component.gts doesn't exist (checked first)
        .mockReturnValueOnce(true); // my.special.component.gjs exists (checked second)
      mockTS.sys.fileExists.mockReturnValue(true);

      const result = transformManager.fileExists('/path/to/my.special.component.d.ts');

      expect(result).toBe(true);
      expect(mockDocumentCache.documentExists).toHaveBeenCalledWith('/path/to/my.special.component.gts');
      expect(mockDocumentCache.documentExists).toHaveBeenCalledWith('/path/to/my.special.component.gjs');
      expect(mockTS.sys.fileExists).toHaveBeenCalledWith('/path/to/my.special.component.gjs.d.ts');
    });

    test('handles empty alternative extensions list', () => {
      // Override the mock config to have no alternative extensions
      mockGlintConfig.environment = {
        typedScriptExtensions: ['.ts'],
        untypedScriptExtensions: ['.js'],
      };
      
      // Re-create transform manager with new config
      transformManager = new TransformManager(mockGlintConfig, mockDocumentCache);
      
      mockDocumentCache.documentExists.mockReturnValue(false);

      const result = transformManager.fileExists('/path/to/component.d.ts');

      expect(result).toBe(false);
      // Should only check the normal existence, no alternative checks
      expect(mockDocumentCache.documentExists).toHaveBeenCalledTimes(1);
      expect(mockDocumentCache.documentExists).toHaveBeenCalledWith('/path/to/component.d.ts');
    });

    test('handles readTransformedFile with encoding parameter', () => {
      vi.spyOn(transformManager as any, 'getTransformInfo').mockReturnValue(null);
      mockDocumentCache.documentExists.mockReturnValue(true); // component.gts exists
      mockTS.sys.fileExists.mockReturnValue(true); // component.gts.d.ts exists
      mockTS.sys.readFile.mockReturnValue('utf16 encoded contents');

      const result = transformManager.readTransformedFile('/path/to/component.d.ts', 'utf16');

      expect(result).toBe('utf16 encoded contents');
      expect(mockTS.sys.readFile).toHaveBeenCalledWith('/path/to/component.gts.d.ts', 'utf16');
    });

    test('readTransformedFile returns undefined when file system returns undefined', () => {
      vi.spyOn(transformManager as any, 'getTransformInfo').mockReturnValue(null);
      mockDocumentCache.documentExists.mockReturnValue(true); // component.gts exists
      mockTS.sys.fileExists.mockReturnValue(true); // component.gts.d.ts exists
      mockTS.sys.readFile.mockReturnValue(undefined); // File read returns undefined

      const result = transformManager.readTransformedFile('/path/to/component.d.ts');

      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    test('fileExists handles very short filenames', () => {
      mockDocumentCache.documentExists.mockReturnValue(false);

      const result = transformManager.fileExists('a.d.ts');

      expect(result).toBe(false);
      expect(mockDocumentCache.documentExists).toHaveBeenCalledWith('a.d.ts');
    });

    test('fileExists handles filenames that are exactly .d.ts', () => {
      mockDocumentCache.documentExists.mockReturnValue(false);

      const result = transformManager.fileExists('.d.ts');

      expect(result).toBe(false);
      // Should check for alternatives with empty base name
      expect(mockDocumentCache.documentExists).toHaveBeenCalledWith('.d.ts');
    });

    test('findAlternativeDeclarationFile handles case where source exists but different extension .d.ts does not', () => {
      mockDocumentCache.documentExists.mockReturnValue(true); // component.gts exists
      mockTS.sys.fileExists.mockReturnValue(false); // component.gts.d.ts doesn't exist

      const result = (transformManager as any).findAlternativeDeclarationFile('/path/to/component.d.ts');

      expect(result).toBeNull();
      expect(mockTS.sys.fileExists).toHaveBeenCalledWith('/path/to/component.gts.d.ts');
    });
  });
});
