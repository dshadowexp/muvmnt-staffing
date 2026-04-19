"use client";

import { env } from "@/data/env/client";
import { cn } from "@/lib/utils";

interface AddressMapProps {
  lat: number;
  lng: number;
  className?: string;
}

export function AddressMap({ lat, lng, className }: AddressMapProps) {
  const key = env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: "15",
    size: "640x240",
    scale: "2",
    markers: `color:0x0D9488|${lat},${lng}`,
    key,
  });

  const src = `https://maps.googleapis.com/maps/api/staticmap?${params}`;

  return (
    <img
      src={src}
      alt="Address location"
      className={cn(
        "h-60 w-full rounded-lg border border-border object-cover",
        className
      )}
    />
  );
}
