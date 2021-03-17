import { CreatesModifier } from './signature';

declare const RootElement: unique symbol;
export type HasRootElement<El extends Element | null | undefined> = { [RootElement]: El };

export type ElementForTagName<Name extends string> = Name extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[Name]
  : Element;

export type ElementForComponent<T extends Constructor<HasRootElement<any>>> = T extends Constructor<
  HasRootElement<infer El>
>
  ? El
  : null;

type Constructor<T> = new (...args: any) => T;

// <div ...attributes>
export declare function applySplattributes<
  SourceElement extends Element,
  _TargetElement extends SourceElement
>(): void;

// <div foo="bar">
export declare function applyAttributes<_TargetElement extends Element>(
  attrs: Record<string, unknown>
): void;

// <div {{someModifier}}>
export declare function applyModifier<TargetElement extends Element>(
  modifier: CreatesModifier<TargetElement>
): void;
