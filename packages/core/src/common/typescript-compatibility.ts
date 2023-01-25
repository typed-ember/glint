import semver from 'semver';
import { TSLib } from '../transform/util.js';

export const MINIMUM_VERSION = '4.8.0';

export type ValidationResult = { valid: true; ts: TSLib } | { valid: false; reason: string };

/**
 * Ensures that the given copy of TypeScript is a) present, and
 * b) a supported version.
 */
export function validateTS(ts: TSLib | null): ValidationResult {
  if (!ts) {
    return { valid: false, reason: 'Unable to locate `typescript` library' };
  }

  if (!semver.gte(ts.version, MINIMUM_VERSION)) {
    return {
      valid: false,
      reason: `Expected TypeScript >= ${MINIMUM_VERSION}, but found ${ts.version}`,
    };
  }

  return { valid: true, ts };
}

/**
 * Validates the given copy of TypeScript as with `validateTS`,
 * logging an error message and exiting the process if validation
 * fails.
 */
export function validateTSOrExit(ts: TSLib | null): asserts ts {
  let result = validateTS(ts);
  if (!result.valid) {
    console.error(result.reason);
    process.exit(1);
  }
}
