export type StorageAdapter = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export const readJson = <T>(
  storage: StorageAdapter,
  key: string,
  fallback: T,
  guard: (value: unknown) => value is T,
): T => {
  try {
    const rawValue = storage.getItem(key);
    if (rawValue === null) {
      return fallback;
    }

    const parsedValue: unknown = JSON.parse(rawValue);
    return guard(parsedValue) ? parsedValue : fallback;
  } catch {
    return fallback;
  }
};

export const writeJson = <T>(
  storage: StorageAdapter,
  key: string,
  value: T,
): void => {
  storage.setItem(key, JSON.stringify(value));
};

export const removeStorageItem = (
  storage: StorageAdapter,
  key: string,
): void => {
  storage.removeItem(key);
};
