"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Paperclip, Trash2, FileText } from "lucide-react";
import { FileUpload } from "@/components/ui/FileUpload";
import { listDocuments, deleteDocument, type UploadedDocument } from "@/lib/server/actions/documents";
import toast from "react-hot-toast";

interface AttachmentsProps {
  ownerType: string;
  ownerId: string;
  label?: string;
  compact?: boolean;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function Attachments({ ownerType, ownerId, label = "Attachments", compact }: AttachmentsProps) {
  const [docs, setDocs] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await listDocuments(ownerType, ownerId));
    } finally {
      setLoading(false);
    }
  }, [ownerType, ownerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount/owner change
    void refresh();
  }, [refresh]);

  async function remove(id: string) {
    const r = await deleteDocument(id);
    if (r.ok) {
      setDocs((d) => d.filter((x) => x.id !== id));
    } else {
      toast.error(r.error);
    }
  }

  return (
    <div className="space-y-2">
      {!compact && (
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">
          <Paperclip className="w-3 h-3" /> {label}
        </div>
      )}
      {loading ? (
        <p className="text-xs text-ud-text-faint">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-xs text-ud-text-faint">No files attached yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-ud-border bg-white text-xs">
              <FileText className="w-3.5 h-3.5 text-ud-text-muted flex-shrink-0" />
              <Link href={d.url} target="_blank" className="font-medium truncate hover:text-ud-primary hover:underline flex-1 min-w-0">
                {d.fileName}
              </Link>
              <span className="text-ud-text-faint flex-shrink-0">{fmtSize(d.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${d.fileName}`}
                onClick={() => void remove(d.id)}
                className="text-ud-text-faint hover:text-ud-danger transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <FileUpload
        purpose="document"
        ownerType={ownerType}
        ownerId={ownerId}
        label="Attach file"
        onUploaded={() => void refresh()}
      />
    </div>
  );
}
