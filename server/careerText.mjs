export const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
export const string = (value) => typeof value === 'string' ? value : '';
export const isoDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
};
export const plainText = (value) => string(value)
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => {
    const n = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
  })
  .replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, name) => ({ amp:'&', quot:'"', apos:"'", lt:'<', gt:'>', nbsp:' ' })[name])
  .replace(/\s+/g, ' ').trim();
export const safeUrl = (path, base) => {
  const url = new URL(path, base);
  if (url.origin !== base || url.protocol !== 'https:') throw new Error('Career site returned an unexpected job link.');
  return url.href;
};
