"use client";

import { Upload, Link, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FileUploadAreaProps {
  isDragging: boolean;
  isUploading: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (files: FileList | null) => void;
}

function FileUploadArea({
  isDragging,
  isUploading,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: FileUploadAreaProps) {
  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-lg border-2 border-dashed p-12 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/60 hover:border-border",
          isUploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => {
          if (!isUploading) {
            const input = document.getElementById("file-upload-input");
            input?.click();
          }
        }}
      >
        <input
          id="file-upload-input"
          type="file"
          multiple
          className="hidden"
          onChange={(e) => onFileSelect(e.target.files)}
          disabled={isUploading}
        />
        <div className="flex flex-col items-center gap-4">
          <div className="bg-muted/50 flex h-16 w-16 items-center justify-center rounded-full">
            <Upload className="text-muted-foreground h-8 w-8" />
          </div>
          <div className="space-y-2">
            <p className="text-foreground text-sm font-medium">
              Drop your files here or click to browse
            </p>
            <p className="text-muted-foreground text-xs">
              Supports PDFs, documents, images, and more
            </p>
          </div>
          <Button
            variant="outline"
            className="mt-2 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (!isUploading) {
                const input = document.getElementById("file-upload-input");
                input?.click();
              }
            }}
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? "Uploading..." : "Select files"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface UrlUploadAreaProps {
  websiteUrl: string;
  isUploading: boolean;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
}

function UrlUploadArea({
  websiteUrl,
  isUploading,
  onUrlChange,
  onSubmit,
}: UrlUploadAreaProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="website-url">Website URL</Label>
        <Input
          id="website-url"
          type="url"
          placeholder="https://example.com"
          value={websiteUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          disabled={isUploading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isUploading) {
              onSubmit();
            }
          }}
        />
        <p className="text-muted-foreground text-xs">
          Enter a valid website URL to extract and process its content
        </p>
      </div>
      <Button
        onClick={onSubmit}
        disabled={isUploading || !websiteUrl.trim()}
        className="w-full cursor-pointer"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Link className="mr-2 h-4 w-4" />
            Add Website
          </>
        )}
      </Button>
    </div>
  );
}

interface AddSourceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  uploadMode: "file" | "url";
  onModeChange: (mode: "file" | "url") => void;
  isUploading: boolean;
  isDragging: boolean;
  websiteUrl: string;
  onWebsiteUrlChange: (url: string) => void;
  onFileSelect: (files: FileList | null) => void;
  onUrlSubmit: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function AddSourceDialog({
  isOpen,
  onOpenChange,
  uploadMode,
  onModeChange,
  isUploading,
  isDragging,
  websiteUrl,
  onWebsiteUrlChange,
  onFileSelect,
  onUrlSubmit,
  onDragOver,
  onDragLeave,
  onDrop,
}: AddSourceDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left text-xl">Add source</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          <div className="border-border/60 flex gap-2 border-b">
            <button
              type="button"
              onClick={() => onModeChange("file")}
              className={cn(
                "-mb-px cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                uploadMode === "file"
                  ? "border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              )}
              disabled={isUploading}
            >
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload File
              </div>
            </button>
            <button
              type="button"
              onClick={() => onModeChange("url")}
              className={cn(
                "-mb-px cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                uploadMode === "url"
                  ? "border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              )}
              disabled={isUploading}
            >
              <div className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Website URL
              </div>
            </button>
          </div>

          {uploadMode === "file" && (
            <FileUploadArea
              isDragging={isDragging}
              isUploading={isUploading}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onFileSelect={onFileSelect}
            />
          )}

          {uploadMode === "url" && (
            <UrlUploadArea
              websiteUrl={websiteUrl}
              isUploading={isUploading}
              onUrlChange={onWebsiteUrlChange}
              onSubmit={onUrlSubmit}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
