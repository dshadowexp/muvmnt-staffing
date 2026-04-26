export function withAuthParams(
    href: string,
    params: Record<string, string | string[] | undefined>,
  ): string {
    const built = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") built.set(key, value);
    }
    if (!built.size) return href;
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}${built.toString()}`;
  }
  