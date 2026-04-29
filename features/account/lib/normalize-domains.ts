/** Strip noise and lowercase a single email-domain / hostname segment. */
export function normalizeSingleDomain(raw: string): string | null {
  let s = raw.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "");
  s = s.split("/")[0] ?? "";
  s = s.replace(/^www\./, "");
  if (!s) return null;
  if (!isPlausibleEmailDomain(s)) return null;
  return s;
}

/** Split on newlines, commas, semicolons; normalize; dedupe preserving order. */
export function normalizeDomainList(rawParts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of rawParts) {
    const d = normalizeSingleDomain(raw);
    if (d && !seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out;
}

/** Parse a textarea / pasted blob into normalized unique domains. */
export function normalizeDomainsFromInput(raw: string): string[] {
  const parts = raw.split(/[\n,;]+/);
  return normalizeDomainList(parts);
}

export function mergeOptionalEmailDomain(
  domains: string[],
  emailDomain: string | null,
): string[] {
  const seen = new Set(domains);
  const out = [...domains];
  if (emailDomain) {
    const d = normalizeSingleDomain(emailDomain);
    if (d && !seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out;
}

/** Practical hostname check for email domains (ASCII / punycode-friendly subset). */
function isPlausibleEmailDomain(host: string): boolean {
  if (host.length > 253 || host.length < 3) return false;
  if (!host.includes(".")) return false;
  if (!/^[a-z0-9.-]+$/.test(host)) return false;
  const labels = host.split(".");
  if (labels.length < 2) return false;
  return labels.every((label) => {
    if (!label.length || label.length > 63) return false;
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label) || /^xn--[a-z0-9-]+$/.test(label);
  });
}
