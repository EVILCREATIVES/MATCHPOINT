"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Attachment {
  file: File;
  preview: string;
  kind: "image" | "video";
}

export default function NewProNotePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [skillLevel, setSkillLevel] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFiles(files: FileList | File[]) {
    const next: Attachment[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) continue;
      next.push({
        file: f,
        preview: URL.createObjectURL(f),
        kind: f.type.startsWith("video/") ? "video" : "image",
      });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, 8));
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => {
      const next = [...prev];
      const removed = next.splice(idx, 1)[0];
      if (removed) URL.revokeObjectURL(removed.preview);
      return next;
    });
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!body.trim() && attachments.length === 0) {
      setError("Add some text or at least one attachment");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("author", author.trim());
      fd.append("body", body.trim());
      fd.append("tags", tags.trim());
      if (skillLevel) fd.append("skillLevel", skillLevel);
      attachments.forEach((a) => fd.append("files", a.file));

      const res = await fetch("/api/pro-notes", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);

      router.push("/admin/sources");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create pro note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="New Pro Note"
        description="Coaching insights, drills, training plans, mental cues — text and media from a pro / coach. Indexed into the RAG knowledge base."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Note details</CardTitle>
          <CardDescription>Body text is chunked and embedded; images and short clips are stored as figures.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Title *</label>
              <Input
                placeholder="e.g. Federer's split-step timing on return"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Author / Source</label>
              <Input
                placeholder="e.g. Coach Patrick Mouratoglou"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Skill Level</label>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Any</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="elite">Elite</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tags</label>
            <Input
              placeholder="forehand, return, mental, comma-separated"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Body</label>
            <Textarea
              rows={8}
              placeholder="Notes, drills, training plan, observations, key cues…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Markdown-friendly. Headings (## …), bullets (- …), and paragraphs are preserved by the chunker.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Attachments (images / short videos · max 8 · 25 MB each)
            </label>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
              }}
            >
              <p className="text-sm font-medium">📎 Drop files here or click to browse</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                JPG · PNG · WebP · MP4 · MOV · WebM
              </p>
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {attachments.map((a, i) => (
                  <div key={i} className="relative rounded-md overflow-hidden border bg-muted">
                    {a.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.preview}
                        alt={a.file.name}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <video
                        src={a.preview}
                        muted
                        className="w-full h-24 object-cover bg-black"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="absolute top-1 right-1 bg-black/70 text-white text-[10px] rounded px-1.5 py-0.5"
                    >
                      ×
                    </button>
                    <p className="text-[10px] text-muted-foreground p-1 truncate">
                      {a.file.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => router.back()} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving…" : "Save & Index"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
