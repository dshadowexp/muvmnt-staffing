"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  ClipboardListIcon,
  CircleDashedIcon,
  MailPlusIcon,
  PaperclipIcon,
  UploadCloudIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  sendClientInviteAction,
  sendWorkerInvitesAction,
} from "@/features/admin/actions/invites";

export type AdminActionClient = {
  id: string;
  name: string;
};

const EMAIL_REGEX_GLOBAL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function isEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

function uniqueEmails(input: string): string[] {
  const matches = input.match(EMAIL_REGEX_GLOBAL) ?? [];
  const seen = new Set<string>();
  for (const m of matches) {
    seen.add(m.toLowerCase());
  }
  return [...seen];
}

// ---------- Action card shell ----------

function ActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left transition-opacity"
    >
      <Card
        className={cn(
          "border-3 hover:border-primary/50 group flex h-full flex-col items-start gap-3 border-dashed bg-transparent p-6 shadow-none",
          "transition-colors",
        )}
      >
        <span className="bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary flex size-10 items-center justify-center rounded-full transition-colors">
          {icon}
        </span>
        <div className="space-y-1">
          <h3 className="text-base font-medium">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </Card>
    </button>
  );
}

// ---------- Create request ----------

function CreateRequestDialog({
  open,
  onOpenChange,
  clients,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: AdminActionClient[];
}) {
  const t = useTranslations("dashboard.admin.createRequestDialog");
  const router = useRouter();
  const [selected, setSelected] = React.useState<AdminActionClient | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setSelected(null);
      setPickerOpen(false);
    }
  }, [open]);

  function handleContinue() {
    if (!selected) return;
    // TODO(admin): support an admin-side new request flow that accepts a
    // pre-selected client (e.g. /admin/requests/new?clientId=...).
    router.push(`/dashboard/requests/new?clientId=${selected.id}`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>{t("clientLabel")}</Label>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={pickerOpen}
                className="w-full justify-between font-normal"
              >
                {selected ? (
                  <span className="truncate">{selected.name}</span>
                ) : (
                  <span className="text-muted-foreground">
                    {t("searchPlaceholder")}
                  </span>
                )}
                <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] p-0"
            >
              <Command>
                <CommandInput placeholder={t("searchPlaceholder")} />
                <CommandList>
                  <CommandEmpty>{t("empty")}</CommandEmpty>
                  <CommandGroup>
                    {clients.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => {
                          setSelected(c);
                          setPickerOpen(false);
                        }}
                      >
                        <CheckIcon
                          className={cn(
                            "size-4",
                            selected?.id === c.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <span className="truncate">{c.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button type="button" disabled={!selected} onClick={handleContinue}>
            {t("continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Invite client ----------

function InviteClientFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("dashboard.admin.inviteClient");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setSubmitting(false);
    }
  }, [open]);

  const valid = name.trim().length > 0 && isEmail(email);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    try {
      const res = await sendClientInviteAction({
        name: name.trim(),
        email: email.trim(),
        segment: "organization",
      });
      if (res.sent > 0) {
        toast.success(t("toastQueued", { name: name.trim() }));
        onOpenChange(false);
      } else {
        toast.error(res.failed[0]?.error ?? t("toastFailed"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("descriptionOrganization")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-client-name">{t("nameLabel")}</Label>
            <Input
              id="invite-client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholderOrganization")}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-client-email">{t("email")}</Label>
            <Input
              id="invite-client-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@facility.com"
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!valid || submitting}>
              {submitting ? (
                <>
                  <CircleDashedIcon className="size-4 animate-spin" />
                  {t("sending")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Invite worker ----------

function InviteWorkerBulkDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("dashboard.admin.inviteWorker");

  // Single source of truth: the parsed email set. The textarea only seeds
  // it; chips can be removed individually.
  const [draft, setDraft] = React.useState("");
  const [emails, setEmails] = React.useState<string[]>([]);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      setDraft("");
      setEmails([]);
      setFileName(null);
      setFileError(null);
      setSubmitting(false);
    }
  }, [open]);

  function addEmails(input: string) {
    const next = uniqueEmails(input);
    if (next.length === 0) return;
    setEmails((prev) => Array.from(new Set([...prev, ...next])));
  }

  function commitDraft() {
    const text = draft.trim();
    if (!text) return;
    const extracted = uniqueEmails(text);
    if (extracted.length === 0) return; // keep the user's draft if nothing parses
    setEmails((prev) => Array.from(new Set([...prev, ...extracted])));
    setDraft("");
  }

  function removeEmail(target: string) {
    setEmails((prev) => prev.filter((e) => e !== target));
  }

  function handleDraftKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "," || e.key === " ") {
      // Soft-commit on separators so chip flow feels natural.
      if (isEmail(draft.trim())) {
        e.preventDefault();
        commitDraft();
      }
    }
  }

  async function handleFile(file: File) {
    setFileError(null);
    setFileName(file.name);
    if (/\.xlsx?$/i.test(file.name)) {
      // TODO(admin): add xlsx parsing (e.g. via the `xlsx` package) so admins
      // can drop spreadsheets directly. For now we hint to the user.
      setFileError(t("excelHint"));
      return;
    }
    try {
      addEmails(await file.text());
    } catch {
      setFileError(t("fileReadError"));
    }
  }

  function clearFile() {
    setFileName(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const canSubmit = emails.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await sendWorkerInvitesAction({ emails });
      if (res.sent > 0 && res.failed.length === 0) {
        toast.success(t("toastSent", { count: res.sent }));
        onOpenChange(false);
      } else if (res.sent > 0) {
        toast.warning(
          t("toastPartial", { sent: res.sent, failed: res.failed.length }),
        );
        onOpenChange(false);
      } else {
        toast.error(res.failed[0]?.error ?? t("toastFailed"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("toastFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-worker-emails">{t("emailsLabel")}</Label>
            <Textarea
              id="invite-worker-emails"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleDraftKeyDown}
              onBlur={commitDraft}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text");
                if (uniqueEmails(text).length > 1) {
                  e.preventDefault();
                  addEmails(text);
                  setDraft("");
                }
              }}
              placeholder={t("emailsPlaceholder")}
              rows={3}
              className="font-mono text-sm"
            />
            <p className="text-muted-foreground text-xs">{t("emailsHint")}</p>
          </div>

          {emails.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs">
                {t("recipientsCount", { count: emails.length })}
              </p>
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-md border p-2">
                {emails.map((e) => (
                  <Badge
                    key={e}
                    variant="secondary"
                    className="gap-1 pr-1 font-normal"
                  >
                    <span>{e}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail(e)}
                      className="hover:bg-muted-foreground/10 flex size-4 items-center justify-center rounded"
                      aria-label={t("removeAria", { email: e })}
                    >
                      <XIcon className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              "border-input hover:border-primary/40 hover:bg-muted/30 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-5 text-center transition-colors",
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
          >
            <UploadCloudIcon className="text-muted-foreground size-6" />
            <p className="text-sm">
              {t.rich("uploadCta", {
                browse: (chunks) => (
                  <button
                    type="button"
                    className="text-primary font-medium underline-offset-4 hover:underline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {chunks}
                  </button>
                ),
              })}
            </p>
            <p className="text-muted-foreground text-xs">{t("uploadHint")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </div>

          {fileName ? (
            <div className="bg-muted/40 flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <PaperclipIcon className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate">{fileName}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={clearFile}
                aria-label={t("removeFileAria")}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          ) : null}

          {fileError ? (
            <p className="text-destructive text-xs">{fileError}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("cancel")}
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? (
              <>
                <CircleDashedIcon className="size-4 animate-spin" />
                {t("sending")}
              </>
            ) : (
              t("submit", { count: emails.length })
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Public component ----------

export function AdminActions({ clients }: { clients: AdminActionClient[] }) {
  const t = useTranslations("dashboard.admin.actions");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [workerOpen, setWorkerOpen] = React.useState(false);
  const [clientOpen, setClientOpen] = React.useState(false);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          icon={<ClipboardListIcon className="size-5" />}
          title={t("createRequest.title")}
          description={t("createRequest.description")}
          onClick={() => setCreateOpen(true)}
        />
        <ActionCard
          icon={<UserPlusIcon className="size-5" />}
          title={t("inviteWorker.title")}
          description={t("inviteWorker.description")}
          onClick={() => setWorkerOpen(true)}
        />
        <ActionCard
          icon={<MailPlusIcon className="size-5" />}
          title={t("inviteClient.title")}
          description={t("inviteClient.description")}
          onClick={() => setClientOpen(true)}
        />
      </div>

      <CreateRequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        clients={clients}
      />
      <InviteWorkerBulkDialog open={workerOpen} onOpenChange={setWorkerOpen} />
      <InviteClientFormDialog open={clientOpen} onOpenChange={setClientOpen} />
    </>
  );
}
