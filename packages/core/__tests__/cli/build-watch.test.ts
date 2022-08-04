// import { stripIndent } from 'common-tags';
// import stripAnsi from 'strip-ansi';
// import os from 'os';
import Project from '../utils/project';
import { describe, beforeEach, afterEach, test } from 'vitest';

describe('CLI: watched build mode typechecking', () => {
  let project!: Project;
  beforeEach(async () => {
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });

  test.todo('add tests for watch mode');
});
