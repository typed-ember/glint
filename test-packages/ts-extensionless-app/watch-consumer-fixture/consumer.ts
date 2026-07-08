// Imports the referenced project's source: with project references this
// resolves through a source-of-project-reference redirect (the shape that
// exercised the buildinfo-emit include-reasons edge under program reuse).
import { Util } from '../build-mode-fixture/util';

export function useUtil(): number {
	return new Util().v;
}
