declare const Modifier: unique symbol;
declare const Blocks: unique symbol;

/** The loosest shape of a "blocks hash" */
export type AnyBlocks = Partial<Record<string, any[]>>;

/** Denotes that the associated entity should be invoked as a modifier */
export type CreatesModifier<El extends Element> = { [Modifier]: (el: El) => void };

// These shenanigans are necessary to get TS to report when named args
// are passed to a signature that doesn't expect any, because `{}` is
// special-cased in the type system not to trigger EPC.
export const EmptyObject: unique symbol;
export type EmptyObject = { [EmptyObject]?: void };

/** Indicates that a signature expects no named arguments. */
export type NoNamedArgs = EmptyObject;

/** Indicates that a signature never yields to blocks. */
export type NoYields = EmptyObject;

/**
 * Denotes that the associated entity may be invoked with the given
 * blocks, yielding params of the appropriate type.
 */
export type AcceptsBlocks<BlockImpls extends AnyBlocks> = (
  blocks: BlockImpls
) => { [Blocks]: true };
