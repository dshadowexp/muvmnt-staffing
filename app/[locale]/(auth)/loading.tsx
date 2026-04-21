import { CircleDashedIcon } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <CircleDashedIcon className="size-10 animate-spin" />
    </div>
  );
}

