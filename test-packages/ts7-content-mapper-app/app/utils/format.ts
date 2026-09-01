export function formatCount(count: number): string {
  return new Intl.NumberFormat().format(count);
}

export function shout(text: string): string {
  return `${text.toUpperCase()}!`;
}
