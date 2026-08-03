// This export is type-clean but produces a declaration-emit diagnostic
// (TS4094: property 'x' of exported anonymous class type may not be private).
// Declaration-emit diagnostics are invisible under `--noEmit`, but the
// incremental builder folds them (including their positions) into the file's
// shape signature.
export const withDeclEmitDiagnostic = class {
	private x = 1;

	getX(): number {
		return this.x;
	}
};

<template>hello</template>
