"use client";
import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils/cn";
import type { UploadedDocument } from "@/lib/server/actions/documents";

interface UploadResult {
  url: string;
  document?: UploadedDocument;
}

interface FileUploadProps {
  purpose: "logo" | "avatar" | "document";
  ownerType?: string;
  ownerId?: string;
  accept?: string;
  label?: string;
  className?: string;
  onUploaded: (result: UploadResult) => void;
}

export function FileUpload({
  purpose,
  ownerType,
  ownerId,
  accept,
  label = "Upload file",
  className,
  onUploaded,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", purpose);
      if (ownerType) form.append("ownerType", ownerType);
      if (ownerId) form.append("ownerId", ownerId);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Upload failed");
        return;
      }
      const result = (await res.json()) as UploadResult;
      onUploaded(result);
      toast.success("Uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-ud-border bg-white text-sm font-medium hover:border-ud-primary hover:text-ud-primary transition-colors disabled:opacity-60 focus-visible:ring-2 ring-ud-primary ring-offset-2",
          className,
        )}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {busy ? "Uploading…" : label}
      </button>
    </>
  );
}
