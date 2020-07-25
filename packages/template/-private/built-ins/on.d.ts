import { CreatesModifier } from '../signature';

export default interface OnModifier {
  <K extends keyof HTMLElementEventMap>(
    args: AddEventListenerOptions,
    key: K,
    eventHandler: (event: HTMLElementEventMap[K]) => void
  ): CreatesModifier;
}
