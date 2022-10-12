#!/usr/bin/env node

import { autoNocheck } from './lib/_auto-nocheck.js';

try {
  await autoNocheck(process.argv.slice(2));
  process.exit(0);
} catch (error: any) {
  console.error(error?.message ?? error);
  process.exit(1);
}
