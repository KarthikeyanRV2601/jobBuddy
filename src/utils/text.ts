export const cleanText = (value: string): string => value.trim();

export const toSearchText = (values: readonly string[]): string =>
  values.join(" ").toLowerCase();
