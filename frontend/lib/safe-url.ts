export function safeUrl(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const value = input.trim();
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return value;
  } catch {
    if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;
    return undefined;
  }
}

export function safeUrlOrHash(input: unknown): string {
  return safeUrl(input) ?? "#";
}
