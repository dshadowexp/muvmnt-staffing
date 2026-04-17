"use client";

import * as React from "react";
import { format } from "date-fns";
import { Loader2, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useTablePagination,
  TablePagination,
} from "@/components/table-pagination";
import { ComplianceForm } from "@/features/profile/components/compliance-form";
import { deleteComplianceAction } from "@/features/profile/actions/compliance-actions";

export type CompliancesRow = {
  id: string;
  name: string;
  fileUrl: string | null;
  isVerified: boolean;
  createdAt: string;
};

type Props = {
  compliancesPromise: Promise<CompliancesRow[]>;
};

export function CompliancesClient({ compliancesPromise }: Props) {
  const router = useRouter();
  const rows = React.use(compliancesPromise);

  const [addOpen, setAddOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<CompliancesRow | null>(null);
  const [isDeleting, startDelete] = React.useTransition();

  function handleAddChange(open: boolean) {
    setAddOpen(open);
    if (!open) router.refresh();
  }

  function handleConfirmDelete() {
    if (!toDelete) return;
    startDelete(async () => {
      const res = await deleteComplianceAction(toDelete.id);
      if (res.error) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      setToDelete(null);
      router.refresh();
    });
  }

  const existingNames = React.useMemo(() => rows.map((r) => r.name), [rows]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Compliance</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Upload and manage the documents an admin needs to verify you for
            shifts.
          </p>
        </div>
        <Button 
          type="button" 
          size="lg"
          className="text-muted-foreground hover:text-foreground inline-flex w-fit shrink-0 items-center gap-2 rounded-lg border border-dashed border-border bg-muted/15 px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted/30"
          onClick={() => setAddOpen(true)} 
        >
          <PlusIcon className="size-4" />
          Add compliance
        </Button>
      </div>

      <CompliancesTable rows={rows} onRequestDelete={setToDelete} />

      <Dialog open={addOpen} onOpenChange={handleAddChange}>
        <DialogContent
          className="flex max-h-[min(90vh,720px)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
          showCloseButton
        >
          <DialogHeader className="border-border shrink-0 border-b px-6 py-4">
            <DialogTitle>Add compliance document</DialogTitle>
            <DialogDescription>
              Pick a document type and upload a PDF or image. An admin will
              review it before it&apos;s marked verified.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <ComplianceForm
              existingNames={existingNames}
              onSaved={() => handleAddChange(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={toDelete != null}
        onOpenChange={(o) => {
          if (!o && !isDeleting) setToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isDeleting}>
          <DialogHeader>
            <DialogTitle>Remove compliance document?</DialogTitle>
            <DialogDescription>
              This deletes {toDelete?.name ?? "this document"} and its uploaded
              file. You can re-upload it any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CompliancesTable({
  rows,
  onRequestDelete,
}: {
  rows: CompliancesRow[];
  onRequestDelete: (row: CompliancesRow) => void;
}) {
  const pagination = useTablePagination(rows);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/15 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          No compliance documents yet. Use &quot;Add compliance&quot; to upload
          your first document.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>
                <Badge variant={r.isVerified ? "default" : "secondary"}>
                  {r.isVerified ? "Verified" : "Pending review"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(r.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Remove ${r.name}`}
                  disabled={r.isVerified}
                  title={
                    r.isVerified
                      ? "Verified documents can't be removed here"
                      : "Remove"
                  }
                  onClick={() => onRequestDelete(r)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination.pageCount > 1 && (
        <TablePagination
          totalRows={pagination.totalRows}
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          pageCount={pagination.pageCount}
          onPageChange={pagination.setPageIndex}
          onPageSizeChange={pagination.setPageSize}
        />
      )}
    </div>
  );
}
