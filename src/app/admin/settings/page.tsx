import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Settings"
        description="System configuration and preferences"
      />

      {/* AI Model Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Model Configuration</CardTitle>
          <CardDescription>Configure the AI model used for training plan generation and content processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Model Provider</label>
            <div className="flex items-center gap-3">
              <Badge variant="court" className="text-sm px-3 py-1">
                Google Gemini
              </Badge>
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <Input value="gemini-3.1-pro-preview" readOnly className="bg-muted" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <Input type="password" value="••••••••••••" readOnly className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              Set via GEMINI_API environment variable on Vercel
            </p>
          </div>
        </CardContent>
      </Card>

      {/* RAG Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">RAG Configuration</CardTitle>
          <CardDescription>Retrieval-Augmented Generation pipeline settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Chunk Size</label>
              <Input type="number" defaultValue={512} />
              <p className="text-xs text-muted-foreground">Tokens per chunk</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Chunk Overlap</label>
              <Input type="number" defaultValue={50} />
              <p className="text-xs text-muted-foreground">Overlap between chunks</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Top-K Results</label>
              <Input type="number" defaultValue={5} />
              <p className="text-xs text-muted-foreground">Number of chunks to retrieve</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Similarity Threshold</label>
              <Input type="number" defaultValue={0.75} step={0.05} />
              <p className="text-xs text-muted-foreground">Minimum relevance score</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Embedding Model</label>
            <Input value="text-embedding-004" readOnly className="bg-muted" />
          </div>
        </CardContent>
      </Card>

      {/* Ingestion Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ingestion Defaults</CardTitle>
          <CardDescription>Default settings for new source ingestion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Trust Level</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="unreviewed">Unreviewed</option>
                <option value="trusted">Trusted</option>
                <option value="untrusted">Untrusted</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Visibility</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Auto-Ingest on Upload</label>
            <div className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span className="text-sm text-muted-foreground">
                Automatically start ingestion when a new source is added
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prompt Policy</CardTitle>
          <CardDescription>System prompt configuration for AI-generated content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
              You are MATCHPOINT, an expert tennis coach AI. Generate structured,
              professional training plans based on the player&apos;s profile, goals,
              and available resources. Use knowledge from the provided context to give
              specific, actionable advice. Maintain a serious coaching tone — direct,
              clear, and encouraging without being generic or overly casual.
            </p>
          </div>
          <Button variant="outline" size="sm">
            Edit System Prompt
          </Button>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  );
}
