"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import * as React from "react";
import {
  AdminFileReviewDialog,
  type AdminFileReviewOpen,
} from "./admin-file-review-dialog";

type AuthRow = {
  id: number;
  type: string;
  file_url: string;
  is_verified: boolean;
  created_at: string;
};

type ComplianceRow = {
  id: string;
  name: string;
  file_url: string;
  is_verified: boolean;
  created_at: string;
};

export function AdminWorkerProfilePhotoOpen({
  workerId,
  photoUrl,
  workerName,
  workerCreatedAt,
}: {
  workerId: string;
  photoUrl: string;
  workerName: string;
  workerCreatedAt: string;
}) {
  const [doc, setDoc] = React.useState<AdminFileReviewOpen | null>(null);

  return (
    <>
      <Button
        type="button"
        variant="link"
        className="text-primary h-auto p-0 text-sm underline-offset-4 hover:underline"
        onClick={() =>
          setDoc({
            fileUrl: photoUrl,
            headline: "Profile photo",
            subline: workerName,
            createdAt: workerCreatedAt,
            workerId,
            verifyKind: null,
          })
        }
      >
        View photo
      </Button>
      <AdminFileReviewDialog
        open={doc !== null}
        onOpenChange={(o) => {
          if (!o) setDoc(null);
        }}
        doc={doc}
      />
    </>
  );
}

export function AdminWorkerAuthorizationsFileOpen({
  workerId,
  items,
}: {
  workerId: string;
  items: AuthRow[];
}) {
  const [doc, setDoc] = React.useState<AdminFileReviewOpen | null>(null);

  return (
    <>
      <ul className="space-y-3">
        {items.map((a) => (
          <li
            key={a.id}
            className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{a.type}</p>
              <p className="text-muted-foreground text-xs">
                Added {format(new Date(a.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={a.is_verified ? "default" : "secondary"}>
                {a.is_verified ? "Verified" : "Unverified"}
              </Badge>
              <Button
                type="button"
                variant="link"
                className="text-primary h-auto p-0 text-sm underline-offset-4 hover:underline"
                onClick={() =>
                  setDoc({
                    fileUrl: a.file_url,
                    headline: "Work authorization",
                    subline: a.type,
                    createdAt: a.created_at,
                    workerId,
                    isVerified: a.is_verified,
                    verifyKind: "authorization",
                    recordId: a.id,
                  })
                }
              >
                View file
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <AdminFileReviewDialog
        open={doc !== null}
        onOpenChange={(o) => {
          if (!o) setDoc(null);
        }}
        doc={doc}
      />
    </>
  );
}

export function AdminWorkerCompliancesFileOpen({
  workerId,
  items,
}: {
  workerId: string;
  items: ComplianceRow[];
}) {
  const [doc, setDoc] = React.useState<AdminFileReviewOpen | null>(null);

  return (
    <>
      <ul className="space-y-3">
        {items.map((c) => (
          <li
            key={c.id}
            className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-muted-foreground text-xs">
                Added {format(new Date(c.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={c.is_verified ? "default" : "secondary"}>
                {c.is_verified ? "Verified" : "Unverified"}
              </Badge>
              {c.file_url ? (
                <Button
                  type="button"
                  variant="link"
                  className="text-primary h-auto p-0 text-sm underline-offset-4 hover:underline"
                  onClick={() =>
                    setDoc({
                      fileUrl: c.file_url as string,
                      headline: "Compliance document",
                      subline: c.name,
                      createdAt: c.created_at,
                      workerId,
                      isVerified: c.is_verified,
                      verifyKind: "compliance",
                      recordId: c.id,
                    })
                  }
                >
                  View file
                </Button>
              ) : (
                <span className="text-muted-foreground text-xs italic">
                  No document uploaded
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <AdminFileReviewDialog
        open={doc !== null}
        onOpenChange={(o) => {
          if (!o) setDoc(null);
        }}
        doc={doc}
      />
    </>
  );
}
