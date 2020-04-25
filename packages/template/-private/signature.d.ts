/**
 * This module contains types pertaining to defining and working with
 * template signatures, which are functions that generally take the form:
 *
 *     (args: NamedArgs, ...positional: PositionalArgs)
 *       => (blocks: BlocksWithParamTypes)
 *       => CompletionType
 *
 * Signature definitions will typically use one of the three utility
 * types `ReturnsValue<T>`, `CreatesModifier` or `AcceptsBlocks<Blocks>`
 * to dictate the environment the associated entity expects to be invoked
 * in.
 *
 * For instance, the `concat` helper's signature would be:
 *
 *     (named: {}, ...strings: string[]) => ReturnsValue<string[]>
 *
 * While the `each` helper's would be:
 *
 *     <T>(named: { key?: string }, items: T[]) => AcceptsBlocks<{
 *       default(item: T, index: number): BlockResult;
 *       inverse?(): BlockResult;
 *     }>
 */
declare const ModuleDocs: void;

import { BlockResult } from './blocks';

declare const Modifier: unique symbol;
declare const Return: unique symbol;
declare const Blocks: unique symbol;

/** The loosest shape of a "blocks hash" */
export type AnyBlocks = Record<string, (...params: any) => BlockResult>;

/** The loosest shape of a template signature */
export type AnySignature = (...args: any) => (blocks: any) => any;

/** Denotes that the associated entity returns a value when invoked */
export type ReturnsValue<T> = () => { [Return]: T };

/** Denotes that the associated entity should be invoked as a modifier */
export type CreatesModifier = () => { [Modifier]: true };

/**
 * Denotes that the associated entity may be invoked with the given
 * blocks, yielding params of the appropriate type.
 */
export type AcceptsBlocks<BlockImpls extends Partial<AnyBlocks>> = (
  blocks: BlockImpls
) => { [Blocks]: true };
