declare module '@glimmer/validator' {
  export interface Tag {}
  export interface UpdatableTag extends Tag {}
  export interface ConstantTag extends Tag {}
  export interface DirtyableTag extends Tag {}
  export interface CombinatorTag extends Tag {}
  export const TagTypeSymbol: unique symbol;
  export const TagComputeSymbol: unique symbol;
  export type MonomorphicTagId = number;
}
