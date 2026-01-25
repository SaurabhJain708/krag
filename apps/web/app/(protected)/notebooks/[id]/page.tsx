"use client";

import { useState, use } from "react";
import {
  BookOpen,
  Plus,
  Settings,
  User,
  Upload,
  FileText,
  ChevronUp,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function NotebookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: _id } = use(params);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [sourceCount] = useState(0); // Will be fetched from API
  const [isAddSourceDialogOpen, setIsAddSourceDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // TODO: Use _id to fetch notebook data

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      // TODO: Handle file upload
      console.log("Files selected:", files);
      setIsAddSourceDialogOpen(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="bg-muted/20 flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-background/80 border-border/50 z-10 flex h-16 shrink-0 items-center justify-between border-b px-8 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 shadow-md">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-foreground text-base leading-tight font-semibold">
              Untitled notebook
            </h1>
            <p className="text-muted-foreground text-xs">0 sources</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-foreground hover:bg-muted/80 h-9 rounded-lg px-3 transition-colors"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <div className="bg-border mx-1 h-6 w-px" />
          <Badge
            variant="secondary"
            className="cursor-pointer rounded-lg border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md"
          >
            PRO
          </Badge>
          <div className="bg-border mx-1 h-6 w-px" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-muted/80 h-9 w-9 rounded-full p-0 transition-colors"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-gray-800 to-gray-900 shadow-sm">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted/80 h-9 w-9 rounded-lg transition-colors"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden px-4 pt-4 pb-4">
        {/* Sources Pane */}
        <div
          className={cn(
            "bg-card border-border/40 flex flex-col overflow-hidden rounded-lg border shadow-sm transition-all duration-300 ease-in-out",
            sourcesCollapsed
              ? "mr-0 w-0 -translate-x-full opacity-0"
              : "mr-0 w-[400px] translate-x-0 opacity-100"
          )}
        >
          <div
            className={cn(
              "flex h-14 items-center justify-between px-5 transition-opacity duration-300",
              sourcesCollapsed ? "opacity-0" : "opacity-100"
            )}
          >
            <span className="text-foreground text-sm font-semibold whitespace-nowrap">
              Sources
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-muted/80 h-7 w-7 rounded-md transition-colors"
              onClick={() => setSourcesCollapsed(!sourcesCollapsed)}
              title="Hide Sources"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto px-5 pt-0 pb-5">
            {/* Add Sources Button */}
            <Button
              className="bg-background text-foreground border-border/60 hover:bg-muted/60 mb-4 h-12 w-full rounded-lg border shadow-sm transition-all hover:shadow-md"
              size="lg"
              onClick={() => setIsAddSourceDialogOpen(true)}
            >
              <Plus className="mr-2 h-5 w-5" />
              Add sources
            </Button>

            {/* Empty State */}
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
              <FileText className="text-muted-foreground/40 h-16 w-16" />
              <div className="space-y-2">
                <p className="text-foreground text-sm font-medium">
                  Saved sources will appear here
                </p>
                <p className="text-muted-foreground text-xs">
                  Click Add source above to add PDFs, websites, text, videos or
                  audio files. Or import a file directly from Google Drive.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Pane */}
        <div className="bg-card border-border/40 relative flex flex-1 flex-col overflow-hidden rounded-lg border shadow-sm">
          {/* Sidebar Toggle Button - Appears when collapsed */}
          <button
            onClick={() => setSourcesCollapsed(false)}
            className={cn(
              "bg-card border-border hover:bg-muted group absolute top-1/2 left-0 z-10 flex h-12 w-6 -translate-y-1/2 items-center justify-center rounded-r-md border-t border-r border-b shadow-md transition-all duration-300 ease-in-out hover:shadow-lg",
              sourcesCollapsed
                ? "translate-x-0 opacity-100"
                : "pointer-events-none -translate-x-full opacity-0"
            )}
            title="Show Sources"
          >
            <ChevronRight className="text-muted-foreground group-hover:text-foreground h-4 w-4 transition-colors" />
          </button>

          <div className="flex h-14 items-center justify-between px-5">
            <span className="text-foreground text-sm font-semibold">Chat</span>
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-8">
            {/* Downward Chevron */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
              <ChevronDown className="text-muted-foreground/40 h-5 w-5" />
            </div>

            {/* Empty State */}
            <div className="flex flex-col items-center gap-4 text-center">
              <ChevronUp className="text-muted-foreground/40 h-12 w-12" />
              <p className="text-foreground text-sm font-medium">
                Add a source to get started
              </p>
              <Button
                className="bg-background text-foreground border-border/60 hover:bg-muted/60 rounded-md border shadow-sm"
                onClick={() => setIsAddSourceDialogOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload a source
              </Button>
            </div>
          </div>

          {/* Bottom Input Area */}
          <div className="bg-card px-5 pt-0 pb-5">
            <div className="border-border/60 bg-background/50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-sm transition-all hover:shadow-md">
              <div className="text-muted-foreground flex-1 text-sm">
                Upload a source to get started
              </div>
              <div className="bg-muted/50 text-muted-foreground flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
                <span>{sourceCount} sources</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-background/80 border-border/50 z-10 flex h-10 shrink-0 items-center justify-center border-t backdrop-blur-sm">
        <p className="text-muted-foreground/70 text-xs">
          NotebookLM can be inaccurate; please double-check its responses.
        </p>
      </footer>

      {/* Add Source Dialog */}
      <Dialog
        open={isAddSourceDialogOpen}
        onOpenChange={setIsAddSourceDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-left text-xl">
              Upload files
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            {/* File Upload Area */}
            <div className="space-y-4">
              <div
                className={cn(
                  "cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border/60 hover:border-border"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => {
                  const input = document.getElementById("file-upload-input");
                  input?.click();
                }}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
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
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      const input =
                        document.getElementById("file-upload-input");
                      input?.click();
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Select files
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
