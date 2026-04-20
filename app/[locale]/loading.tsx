import { CircleDashedIcon } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <CircleDashedIcon className="size-10 animate-spin" />
    </div>
  );
}
