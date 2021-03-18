import { CreatesModifier } from './signature';

declare const Element: unique symbol;
export type HasElement<El extends Element | null | undefined> = { [Element]: El };

export type ElementForTagName<Name extends string> = Name extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[Name]
  : Element;

export type ElementForComponent<T extends Constructor<HasElement<any>>> = T extends Constructor<
  HasElement<infer El>
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
