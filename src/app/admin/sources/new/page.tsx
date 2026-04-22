"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { SourceType, SkillLevel, TrustLevel } from "@/types";

const sourceTypes: { type: SourceType; label: string; icon: string; description: string }[] = [
  { type: "pdf", label: "PDF Document", icon: "📄", description: "Upload a PDF book, paper, or guide" },
  { type: "website", label: "Website", icon: "🌐", description: "Add a website URL to scrape and ingest" },
  { type: "youtube", label: "YouTube Video", icon: "▶️", description: "Add a YouTube video for transcript extraction" },
  { type: "manual", label: "Manual Entry", icon: "✏️", description: "Write or paste text content directly" },
];

export default function NewSourcePage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<SourceType | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{ url: string; filename: string; size: number; sourceId?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [skillLevel, setSkillLevel] = useState<SkillLevel | "">("");
  const [tagsInput, setTagsInput] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [trustLevel, setTrustLevel] = useState<TrustLevel>("unreviewed");

  const handleUpload = useCallback(async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      setUploadedFile({ url: data.url, filename: data.filename, size: data.size, sourceId: data.sourceId });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleSubmit = async () => {
    if (!selectedType) return;

    // PDFs are now fully auto-ingested by /api/upload (source row + ingestion
    // are kicked off server-side). Just navigate back to the sources list.
    if (selectedType === "pdf") {
      if (!uploadedFile?.sourceId) {
        setSubmitError("Upload a PDF before continuing");
        return;
      }
      router.push("/admin/sources");
      return;
    }

    if (!title.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const sourceRes = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          sourceType: selectedType,
          author: author.trim() || undefined,
          description: description.trim() || undefined,
          sourceUrl:
            selectedType === "website" ? websiteUrl.trim()
            : selectedType === "youtube" ? youtubeUrl.trim()
            : undefined,
          skillLevel: skillLevel || undefined,
          tags,
          visibility,
          trustLevel,
          content: selectedType === "manual" ? manualContent.trim() : undefined,
        }),
      });

      if (!sourceRes.ok) {
        const data = await sourceRes.json();
        throw new Error(data.error || "Failed to create source");
      }

      router.push("/admin/sources");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create source");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Add New Source"
        description="Add a new knowledge source to the MATCHPOINT knowledge base"
      />

      {!selectedType && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sourceTypes.map((st) => (
            <Card
              key={st.type}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedType(st.type)}
            >
              <CardContent className="p-6 flex items-start gap-4">
                <span className="text-3xl">{st.icon}</span>
                <div>
                  <h3 className="font-semibold text-sm">{st.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{st.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedType && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {sourceTypes.find((st) => st.type === selectedType)?.icon}{" "}
              {sourceTypes.find((st) => st.type === selectedType)?.label}
            </Badge>
            <button
              onClick={() => setSelectedType(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Change type
            </button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedType === "pdf" ? "Upload PDF" : "Source Details"}
              </CardTitle>
              <CardDescription>
                {selectedType === "pdf"
                  ? "Drop a PDF — title, author, summary, tags, skill level and structured tennis knowledge will be extracted automatically by the AI ingestion pipeline."
                  : "Provide information about this knowledge source"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedType !== "pdf" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title *</label>
                    <Input placeholder="e.g., Modern Forehand Biomechanics" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Author</label>
                    <Input placeholder="e.g., Coach Mike Trent" value={author} onChange={(e) => setAuthor(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Brief description of the content…"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </>
              )}

              {selectedType === "pdf" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload PDF *</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={onFileChange}
                  />
                  {!uploadedFile ? (
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                        dragOver ? "border-primary bg-primary/5" : "hover:border-primary/50"
                      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={onDrop}
                    >
                      <div className="text-3xl mb-2">{uploading ? "⏳" : "📄"}</div>
                      <p className="text-sm font-medium">
                        {uploading ? "Uploading…" : "Drop your PDF here or click to browse"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Max 50 MB · PDF files only</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 flex items-center justify-between bg-muted/30">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">✅</span>
                        <div>
                          <p className="text-sm font-medium">{uploadedFile.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB · Uploaded
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => { setUploadedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {uploadError && (
                    <p className="text-xs text-destructive">{uploadError}</p>
                  )}
                </div>
              )}

              {selectedType === "website" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website URL *</label>
                  <Input placeholder="https://example.com/tennis-guide" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
                </div>
              )}

              {selectedType === "youtube" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">YouTube URL *</label>
                  <Input placeholder="https://youtube.com/watch?v=…" type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
                </div>
              )}

              {selectedType === "manual" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content *</label>
                  <Textarea
                    placeholder="Paste or write the content here…"
                    rows={10}
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                  />
                </div>
              )}

              {selectedType !== "pdf" && <Separator />}

              {selectedType !== "pdf" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select category…</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Skill Level</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value as SkillLevel | "")}
                  >
                    <option value="">Select level…</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="elite">Elite</option>
                  </select>
                </div>
                </div>
              )}

              {selectedType !== "pdf" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <Input
                    placeholder="Enter tags separated by commas…"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g., forehand, technique, biomechanics
                  </p>
                </div>
              )}

              {selectedType !== "pdf" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visibility</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as "public" | "private")}
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Trust Level</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={trustLevel}
                    onChange={(e) => setTrustLevel(e.target.value as TrustLevel)}
                  >
                    <option value="unreviewed">Unreviewed</option>
                    <option value="trusted">Trusted</option>
                    <option value="untrusted">Untrusted</option>
                  </select>
                </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <div>
              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setSelectedType(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  (selectedType === "pdf"
                    ? !uploadedFile?.sourceId || uploading
                    : !title.trim())
                }
              >
                {submitting
                  ? "Creating…"
                  : selectedType === "pdf"
                  ? "Done — view sources"
                  : "Add Source & Start Ingestion"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
