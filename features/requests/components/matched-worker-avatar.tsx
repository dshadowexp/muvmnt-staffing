"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveMatchWorkerPhotoUrlAction } from "../server/actions";

function initialsFromDisplayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (
    parts[0]![0]! + parts[parts.length - 1]!.replace(/\.$/, "")[0]!
  ).toUpperCase();
}

type MatchedWorkerAvatarProps = {
  photoUrl: string | null;
  displayName: string;
  className?: string;
  size?: "default" | "sm" | "lg";
};

export function MatchedWorkerAvatar({
  photoUrl,
  displayName,
  className,
  size = "lg",
}: MatchedWorkerAvatarProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (photoUrl == null || photoUrl === "") {
        if (!cancelled) setSrc(null);
        return;
      }
      if (/^https?:\/\//i.test(photoUrl)) {
        if (!cancelled) setSrc(photoUrl);
        return;
      }
      const { url } = await resolveMatchWorkerPhotoUrlAction(photoUrl);
      if (!cancelled) setSrc(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [photoUrl]);

  return (
    <Avatar size={size} className={className}>
      {src ? <AvatarImage src={src} alt={displayName} /> : null}
      <AvatarFallback>{initialsFromDisplayName(displayName)}</AvatarFallback>
    </Avatar>
  );
}
