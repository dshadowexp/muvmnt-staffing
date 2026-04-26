"use client";

import { useSearchParams } from "next/navigation";

export function useAuthParams() {
  const searchParams = useSearchParams();

  function withAuthParams(href: string): string {
    if (!searchParams.size) return href;
    const params = new URLSearchParams(searchParams.toString());
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}${params.toString()}`;
  }

  return { withAuthParams };
}