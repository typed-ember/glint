import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, beforeEach, afterEach, test, expect } from 'vitest';
import { createTempConfigForFiles } from '@glint/core/config/loader';

describe('CLI: single file checking', () => {
  const testDir = `${os.tmpdir()}/glint-cli-test-${process.pid}`;

  beforeEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create a minimal tsconfig.json
    fs.writeFileSync(
      path.join(testDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2015',
          module: 'commonjs',
          strict: true
        },
        glint: {
          environment: 'ember-loose'
        }
      }, null, 2)
    );

    // Create a test file
    fs.writeFileSync(
      path.join(testDir, 'test.gts'),
      `import Component from '@glimmer/component';
      
export default class Test extends Component {
  <template>Hello World!</template>
}`
    );
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('creates temp config for single file', () => {
    const { tempConfigPath, cleanup } = createTempConfigForFiles(testDir, ['test.gts']);

    try {
      // Check temp config exists
      expect(fs.existsSync(tempConfigPath)).toBe(true);
      
      // Check temp config content
      const tempConfig = JSON.parse(fs.readFileSync(tempConfigPath, 'utf-8'));
      expect(tempConfig.files).toEqual(['test.gts']);
      expect(tempConfig.include).toBeUndefined();
      expect(tempConfig.exclude).toBeUndefined();
      expect(tempConfig.compilerOptions.target).toBe('ES2015');
      expect(tempConfig.glint.environment).toBe('ember-loose');
    } finally {
      cleanup();
    }

    // Check cleanup worked
    expect(fs.existsSync(tempConfigPath)).toBe(false);
  });

  test('creates temp config for multiple files', () => {
    // Create another test file
    fs.writeFileSync(
      path.join(testDir, 'test2.gts'),
      `import Component from '@glimmer/component';
      
export default class Test2 extends Component {
  <template>Hello Second!</template>
}`
    );

    const { tempConfigPath, cleanup } = createTempConfigForFiles(testDir, ['test.gts', 'test2.gts']);

    try {
      const tempConfig = JSON.parse(fs.readFileSync(tempConfigPath, 'utf-8'));
      expect(tempConfig.files).toEqual(['test.gts', 'test2.gts']);
    } finally {
      cleanup();
    }
  });

  test('handles missing tsconfig', () => {
    fs.unlinkSync(path.join(testDir, 'tsconfig.json'));
    
    expect(() => {
      createTempConfigForFiles(testDir, ['test.gts']);
    }).toThrow('No tsconfig.json found');
  });

  test('cleanup is fired', () => {
    const { tempConfigPath, cleanup } = createTempConfigForFiles(testDir, ['test.gts']);
    
    // Cleanup once
    cleanup();
    expect(fs.existsSync(tempConfigPath)).toBe(false);
    
    // Cleanup again - should not throw
    expect(() => cleanup()).not.toThrow();
  });
});
