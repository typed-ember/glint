// import { stripIndent } from 'common-tags';
// import stripAnsi from 'strip-ansi';
// import os from 'os';
import Project from '../utils/project';
import { describe, beforeEach, afterEach, test } from 'vitest';

describe('CLI: watched build mode typechecking', () => {
  let project!: Project;
  beforeEach(async () => {
    jest.setTimeout(20_000);
    project = await Project.create();
  });

  afterEach(async () => {
    await project.destroy();
  });
});
