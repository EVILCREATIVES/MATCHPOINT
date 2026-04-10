"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { categories } from "@/lib/mock-data";
import type { SourceType } from "@/types";

const sourceTypes: { type: SourceType; label: string; icon: string; description: string }[] = [
  { type: "pdf", label: "PDF Document", icon: "📄", description: "Upload a PDF book, paper, or guide" },
  { type: "website", label: "Website", icon: "🌐", description: "Add a website URL to scrape and ingest" },
  { type: "youtube", label: "YouTube Video", icon: "▶️", description: "Add a YouTube video for transcript extraction" },
  { type: "manual", label: "Manual Entry", icon: "✏️", description: "Write or paste text content directly" },
];

export default function NewSourcePage() {
  const [selectedType, setSelectedType] = useState<SourceType | null>(null);

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Add New Source"
        description="Add a new knowledge source to the MATCHPOINT knowledge base"
      />

      {/* Source Type Selection */}
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

      {/* Source Form */}
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
              <CardTitle className="text-base">Source Details</CardTitle>
              <CardDescription>Provide information about this knowledge source</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title *</label>
                <Input placeholder="e.g., Modern Forehand Biomechanics" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Author</label>
                <Input placeholder="e.g., Coach Mike Trent" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Brief description of the content…"
                  rows={3}
                />
              </div>

              {selectedType === "pdf" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload PDF *</label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <div className="text-3xl mb-2">📄</div>
                    <p className="text-sm font-medium">Drop your PDF here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">Max 50 MB · PDF files only</p>
                  </div>
                </div>
              )}

              {selectedType === "website" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website URL *</label>
                  <Input placeholder="https://example.com/tennis-guide" type="url" />
                </div>
              )}

              {selectedType === "youtube" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">YouTube URL *</label>
                  <Input placeholder="https://youtube.com/watch?v=…" type="url" />
                </div>
              )}

              {selectedType === "manual" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content *</label>
                  <Textarea
                    placeholder="Paste or write the content here…"
                    rows={10}
                  />
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select category…</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Skill Level</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select level…</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="elite">Elite</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <Input placeholder="Enter tags separated by commas…" />
                <p className="text-xs text-muted-foreground">
                  e.g., forehand, technique, biomechanics
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visibility</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Trust Level</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="unreviewed">Unreviewed</option>
                    <option value="trusted">Trusted</option>
                    <option value="untrusted">Untrusted</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setSelectedType(null)}>
              Cancel
            </Button>
            <Button>Add Source & Start Ingestion</Button>
          </div>
        </div>
      )}
    </div>
  );
}
