export function repeat(value: string, times: number): string {
  return Array(times).fill(value).join('');
}

export function shout(value: string): string {
  return `${value.toUpperCase()}!`;
}
