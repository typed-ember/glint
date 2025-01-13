export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitUntil(callback: () => unknown): Promise<void> {
  let start = Date.now();
  while (Date.now() - start < 300_000) {
    // while (Date.now() - start < 15_000) {
    if (await callback()) {
      return;
    }

    await sleep(500);
  }

  throw new Error(`waitUntil condition never came true`);
}
