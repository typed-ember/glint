export function debounce(threshold: number, f: () => void): () => void {
  let pending: NodeJS.Timeout | undefined;
  return () => {
    if (pending) {
      clearTimeout(pending);
    }

    pending = setTimeout(f, threshold);
  };
}
