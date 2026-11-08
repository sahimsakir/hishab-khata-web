let pending = 0;
const listeners = new Set<() => void>();

export function subscribeLoading(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const isLoading = () => pending > 0;

export async function withLoading<T>(action: () => Promise<T>): Promise<T> {
  if (++pending === 1) listeners.forEach(listener => listener());
  try {
    return await action();
  } finally {
    if (--pending === 0) listeners.forEach(listener => listener());
  }
}
