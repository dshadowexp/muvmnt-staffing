"use client";

import {
  getAdminPresignedDownloadUrl,
  verifyAdminCompliance,
  verifyAdminWorkAuthorization,
} from "@/features/admin/mutations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLinkIcon, FileTextIcon, CircleDashedIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { format } from "date-fns";
import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ReviewBase = {
  fileUrl: string;
  headline: string;
  subline?: string;
  createdAt: string;
  workerId: string;
};

export type AdminFileReviewOpen =
  | (ReviewBase & { verifyKind: null })
  | (ReviewBase & {
      isVerified: boolean;
      verifyKind: "compliance";
      recordId: string;
    })
  | (ReviewBase & {
      isVerified: boolean;
      verifyKind: "authorization";
      recordId: number;
    });

function isVerifiable(
  d: AdminFileReviewOpen,
): d is Extract<
  AdminFileReviewOpen,
  { verifyKind: "compliance" | "authorization" }
> {
  return d.verifyKind !== null;
}

function previewKind(url: string): "image" | "pdf" | "unknown" {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (/\.(jpe?g|png|gif|webp|svg)$/.test(path)) return "image";
    if (/\.pdf$/i.test(path)) return "pdf";
  } catch {
    /* ignore */
  }
  if (/\.(jpe?g|png|gif|webp|svg)(\?|#|$)/i.test(url)) return "image";
  if (/\.pdf(\?|#|$)/i.test(url)) return "pdf";
  return "unknown";
}

function FilePreview({
  url,
  kindSource,
}: {
  url: string;
  kindSource: string;
}) {
  const kind = React.useMemo(() => previewKind(kindSource), [kindSource]);

  if (kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote upload URLs
      <img
        src={url}
        alt="Document preview"
        className="max-h-[min(70vh,560px)] w-full object-contain"
      />
    );
  }

  if (kind === "pdf") {
    return (
      <iframe
        title="Document preview"
        src={url}
        className="h-[min(70vh,560px)] w-full rounded-md border bg-background"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <FileTextIcon
        className="text-muted-foreground size-14 shrink-0"
        aria-hidden
      />
      <p className="text-muted-foreground max-w-xs text-sm">
        Preview isn&apos;t available for this file type. Open it in a new tab to
        review.
      </p>
      <Button variant="outline" size="sm" asChild>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLinkIcon className="mr-2 size-4" />
          Open in new tab
        </a>
      </Button>
    </div>
  );
}

function FilePreviewPane({
  storageKey,
  resolvedUrl,
  status,
}: {
  storageKey: string;
  resolvedUrl: string | null;
  status: "loading" | "ready" | "error";
}) {
  if (status === "loading") {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 md:min-h-[min(70vh,560px)]">
        <CircleDashedIcon
          className="text-muted-foreground size-10 animate-spin"
          aria-hidden
        />
        <p className="text-muted-foreground text-sm">Loading preview…</p>
      </div>
    );
  }
  if (status === "error" || !resolvedUrl) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center md:min-h-[min(70vh,560px)]">
        <p className="text-muted-foreground text-sm">
          Could not load this file for preview.
        </p>
      </div>
    );
  }
  return <FilePreview url={resolvedUrl} kindSource={storageKey} />;
}

type AdminFileReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: AdminFileReviewOpen | null;
};

export function AdminFileReviewDialog({
  open,
  onOpenChange,
  doc,
}: AdminFileReviewDialogProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [localVerified, setLocalVerified] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = React.useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  React.useEffect(() => {
    if (doc && isVerifiable(doc)) setLocalVerified(doc.isVerified);
  }, [doc]);

  React.useEffect(() => {
    if (!doc) {
      setPreviewUrl(null);
      setPreviewStatus("idle");
      return;
    }
    let cancelled = false;
    setPreviewStatus("loading");
    setPreviewUrl(null);
    void getAdminPresignedDownloadUrl(doc.fileUrl).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setPreviewUrl(res.url);
        setPreviewStatus("ready");
      } else {
        setPreviewStatus("error");
        toast.error(res.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [doc]);

  if (!doc) return null;

  const openDoc = doc;
  const verifiable = isVerifiable(openDoc);
  const canVerify = verifiable && !localVerified;

  async function handleVerify() {
    if (!isVerifiable(openDoc)) return;
    setPending(true);
    const res =
      openDoc.verifyKind === "compliance"
        ? await verifyAdminCompliance(openDoc.recordId, openDoc.workerId)
        : await verifyAdminWorkAuthorization(openDoc.recordId, openDoc.workerId);
    setPending(false);
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    toast.success("Marked as verified");
    setLocalVerified(true);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "max-h-[min(92vh,900px)] gap-0 overflow-y-auto p-0 sm:max-w-5xl",
          "md:grid md:max-h-[min(92vh,900px)] md:grid-cols-2 md:overflow-hidden md:overflow-y-hidden",
        )}
      >
        <div
          className={cn(
            "bg-muted/40 flex min-h-[220px] items-center justify-center border-b p-4 md:min-h-[min(70vh,560px)] md:border-r md:border-b-0",
          )}
        >
          <FilePreviewPane
            storageKey={openDoc.fileUrl}
            resolvedUrl={previewUrl}
            status={
              previewStatus === "ready"
                ? "ready"
                : previewStatus === "error"
                  ? "error"
                  : "loading"
            }
          />
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto p-6">
          <DialogHeader className="gap-2 text-left">
            <DialogTitle>{openDoc.headline}</DialogTitle>
            {openDoc.subline ? (
              <DialogDescription>{openDoc.subline}</DialogDescription>
            ) : null}
          </DialogHeader>

          <dl className="space-y-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Added
              </dt>
              <dd>
                {format(new Date(openDoc.createdAt), "MMMM d, yyyy · h:mm a")}
              </dd>
            </div>
            {verifiable ? (
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Verification
                </dt>
                <dd>
                  {localVerified ? (
                    <Badge>Verified</Badge>
                  ) : (
                    <Badge variant="secondary">Not verified</Badge>
                  )}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-auto flex flex-col gap-3 border-t pt-4">
            {canVerify ? (
              <Button
                type="button"
                disabled={pending}
                onClick={() => void handleVerify()}
              >
                {pending ? "Saving…" : "Mark as verified"}
              </Button>
            ) : null}
            {previewStatus === "ready" && previewUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon className="mr-2 size-4" />
                  Open in new tab
                </a>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ExternalLinkIcon className="mr-2 size-4" />
                Open in new tab
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
