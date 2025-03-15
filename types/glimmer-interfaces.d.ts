declare module '@glimmer/interfaces' {
  export interface Tag {}
  export interface UpdatableTag extends Tag {}
  export interface ConstantTag extends Tag {}
  export interface DirtyableTag extends Tag {}
  export interface CombinatorTag extends Tag {}
  export type MonomorphicTagId = number;
  export const TagTypeSymbol: unique symbol;
  export const TagComputeSymbol: unique symbol;
}
