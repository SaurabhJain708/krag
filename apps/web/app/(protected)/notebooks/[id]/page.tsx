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
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
  Link,
  AlertCircle,
  Home,
  Send,
  Bot,
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
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { trpc } from "@/server/trpc/react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Utility functions
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (!reader.result || typeof reader.result !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      const base64 = reader.result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to extract base64 data"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

const getProcessingStatusInfo = (status: string) => {
  const statusLabels: Record<string, string> = {
    uploading: "Uploading",
    queued: "Queued",
    processing: "Processing",
    starting: "Starting",
    vision: "Analyzing vision",
    extracting: "Extracting content",
    images: "Processing images",
    chunking: "Chunking",
    completed: "Completed",
    failed: "Failed",
  };

  const isProcessing =
    status !== "completed" && status !== "failed" && status !== "uploading";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isUploading = status === "uploading";

  return {
    label: statusLabels[status] || status,
    isProcessing,
    isCompleted,
    isFailed,
    isUploading,
  };
};

// Header Component
function Header({
  notebookName,
  isLoadingNotebook,
  sourceCount,
  isLoadingSources,
  onSignOut,
}: {
  notebookName?: string;
  isLoadingNotebook: boolean;
  sourceCount: number;
  isLoadingSources: boolean;
  onSignOut: () => void;
}) {
  const router = useRouter();

  return (
    <header className="bg-background/80 border-border/50 z-10 flex shrink-0 flex-col border-b px-4 py-2 shadow-sm backdrop-blur-sm sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-0">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-gray-800 to-gray-900 shadow-md">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-foreground text-sm leading-tight font-semibold sm:text-base">
            {isLoadingNotebook
              ? "Loading..."
              : notebookName || "Untitled notebook"}
          </h1>
          <p className="text-muted-foreground text-[11px] sm:text-xs">
            {isLoadingSources ? "Loading..." : `${sourceCount} sources`}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0 sm:flex-nowrap">
        <Button
          variant="ghost"
          size="sm"
          className="text-foreground hover:bg-muted/80 h-8 cursor-pointer rounded-lg px-2.5 text-xs transition-colors sm:h-9 sm:px-3 sm:text-sm"
          onClick={() => router.push("/notebooks")}
        >
          <Home className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
          <span className="xs:inline hidden sm:inline">Home</span>
        </Button>
        <div className="bg-border mx-1 hidden h-6 w-px sm:block" />
        <Button
          variant="ghost"
          size="sm"
          className="text-foreground hover:bg-muted/80 h-8 cursor-pointer rounded-lg px-2.5 text-xs transition-colors sm:h-9 sm:px-3 sm:text-sm"
          onClick={() => router.push("/settings")}
        >
          <Settings className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
          <span className="xs:inline hidden sm:inline">Settings</span>
        </Button>
        <div className="bg-border mx-1 hidden h-6 w-px sm:block" />
        <Badge
          variant="secondary"
          className="cursor-pointer rounded-lg border-0 bg-linear-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase shadow-sm transition-all hover:shadow-md sm:px-2.5 sm:py-1 sm:text-xs"
        >
          PRO
        </Badge>
        <div className="bg-border mx-1 hidden h-6 w-px sm:block" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-muted/80 h-9 w-9 cursor-pointer rounded-full p-0 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-gray-800 to-gray-900 shadow-sm">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onSignOut}
              className="text-destructive cursor-pointer"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// Error State Component
function ErrorState() {
  const router = useRouter();

  return (
    <div className="bg-muted/20 flex h-screen flex-col overflow-hidden">
      <header className="bg-background/80 border-border/50 z-10 flex shrink-0 flex-col border-b px-4 py-2 shadow-sm backdrop-blur-sm sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-gray-800 to-gray-900 shadow-md">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-foreground text-sm leading-tight font-semibold sm:text-base">
              Notebook not found
            </h1>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0 sm:flex-nowrap">
          <Button
            variant="ghost"
            size="sm"
            className="text-foreground hover:bg-muted/80 h-8 cursor-pointer rounded-lg px-2.5 text-xs transition-colors sm:h-9 sm:px-3 sm:text-sm"
            onClick={() => router.push("/notebooks")}
          >
            <Home className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
            <span className="xs:inline hidden sm:inline">Home</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
            <AlertCircle className="text-destructive h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-foreground text-lg font-semibold">
              Notebook not found
            </h2>
            <p className="text-muted-foreground text-sm">
              The notebook you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have permission to access it.
            </p>
          </div>
          <Button
            className="mt-4 cursor-pointer"
            onClick={() => router.push("/notebooks")}
          >
            <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
            Back to Notebooks
          </Button>
        </div>
      </div>
    </div>
  );
}

// Source Item Component
function SourceItem({
  source,
  statusInfo,
  onDelete,
  isDeleting,
}: {
  source: { id: string; name: string; type: string };
  statusInfo: ReturnType<typeof getProcessingStatusInfo>;
  onDelete: () => void;
  isDeleting?: boolean;
}) {
  const isActive = statusInfo.isProcessing || statusInfo.isUploading;

  return (
    <div className="bg-background border-border/60 hover:bg-muted/50 group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-lg border p-3 transition-colors">
      {/* Animated gradient bar */}
      {isActive && (
        <div className="absolute right-0 bottom-0 left-0 h-0.5 overflow-hidden rounded-b-lg">
          <div
            className="h-full w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #3b82f6 20%, #60a5fa 50%, #3b82f6 80%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2s infinite linear",
            }}
          />
        </div>
      )}
      {statusInfo.isProcessing || statusInfo.isUploading ? (
        <Loader2 className="text-primary h-5 w-5 shrink-0 animate-spin" />
      ) : statusInfo.isCompleted ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
      ) : statusInfo.isFailed ? (
        <XCircle className="text-destructive h-5 w-5 shrink-0" />
      ) : (
        <FileText className="text-muted-foreground h-5 w-5 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-medium">
          {source.name}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-xs">{source.type}</p>
          <span className="text-muted-foreground">•</span>
          <p
            className={cn(
              "text-xs",
              statusInfo.isProcessing || statusInfo.isUploading
                ? "text-primary"
                : statusInfo.isCompleted
                  ? "text-green-500"
                  : statusInfo.isFailed
                    ? "text-destructive"
                    : "text-muted-foreground"
            )}
          >
            {statusInfo.label}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={isDeleting || isActive}
        title="Delete source"
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// Sources Pane Component
function SourcesPane({
  sources,
  isLoadingSources,
  liveStatuses,
  sourcesCollapsed,
  onToggleCollapse,
  onAddSource,
  isUploading,
  onDeleteSource,
  deletingSourceIds,
}: {
  sources: Array<{
    id: string;
    name: string;
    type: string;
    processingStatus: string;
  }>;
  isLoadingSources: boolean;
  liveStatuses?: Array<{ id: string; status: string }>;
  sourcesCollapsed: boolean;
  onToggleCollapse: () => void;
  onAddSource: () => void;
  isUploading: boolean;
  onDeleteSource: (sourceId: string) => void;
  deletingSourceIds: Set<string>;
}) {
  return (
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
          className="hover:bg-muted/80 h-7 w-7 cursor-pointer rounded-md transition-colors"
          onClick={onToggleCollapse}
          title="Hide Sources"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-5 pt-0 pb-5">
        <Button
          className="bg-background text-foreground border-border/60 hover:bg-muted/60 mb-4 h-12 w-full cursor-pointer rounded-lg border shadow-sm transition-all hover:shadow-md"
          size="lg"
          onClick={onAddSource}
          disabled={isUploading}
        >
          <Plus className="mr-2 h-5 w-5" />
          Add sources
        </Button>

        {isLoadingSources ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : sources.length > 0 ? (
          <div className="space-y-2">
            {sources.map((source) => {
              const statusInfo = getProcessingStatusInfo(
                liveStatuses?.find((status) => status.id === source.id)
                  ?.status || source.processingStatus
              );
              return (
                <SourceItem
                  key={source.id}
                  source={source}
                  statusInfo={statusInfo}
                  onDelete={() => onDeleteSource(source.id)}
                  isDeleting={deletingSourceIds.has(source.id)}
                />
              );
            })}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}

// Message type
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

// Chat Pane Component
function ChatPane({
  sourcesCollapsed,
  onShowSources,
  onAddSource,
  sourceCount,
}: {
  sourcesCollapsed: boolean;
  onShowSources: () => void;
  onAddSource: () => void;
  sourceCount: number;
}) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasSources = sourceCount > 0;

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Based on your sources, here's a comprehensive answer to your question: "${userMessage.content}". This is a dummy response that demonstrates how the AI chat interface will work. The actual implementation will connect to your AI backend to provide real answers based on the content from your uploaded sources.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-card border-border/40 relative flex flex-1 flex-col overflow-hidden rounded-lg border shadow-sm">
      <button
        onClick={onShowSources}
        className={cn(
          "bg-card border-border hover:bg-muted group absolute top-1/2 left-0 z-10 flex h-12 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-md border-t border-r border-b shadow-md transition-all duration-300 ease-in-out hover:shadow-lg",
          sourcesCollapsed
            ? "translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-full opacity-0"
        )}
        title="Show Sources"
      >
        <ChevronRight className="text-muted-foreground group-hover:text-foreground h-4 w-4 transition-colors" />
      </button>

      <div className="border-border/50 bg-background/50 flex h-14 items-center justify-between border-b px-5">
        <span className="text-foreground text-sm font-semibold">Chat</span>
        {hasSources && (
          <span className="text-muted-foreground text-xs">
            {sourceCount} {sourceCount === 1 ? "source" : "sources"}
          </span>
        )}
      </div>

      {hasSources ? (
        <>
          {/* Messages Area */}
          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
            {messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-12">
                <div className="flex max-w-sm flex-col items-center gap-4 text-center">
                  <div className="bg-primary/10 ring-primary/20 flex h-14 w-14 items-center justify-center rounded-full ring-1">
                    <FileText className="text-primary h-7 w-7" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-foreground text-sm font-medium">
                      Start a conversation
                    </p>
                    <p className="text-muted-foreground px-4 text-xs leading-relaxed">
                      Ask questions about your sources and get AI-powered
                      answers
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="bg-primary/10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                        <Bot className="text-primary h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground border-border/50 border"
                      )}
                    >
                      <p className="wrap-break-word whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                    {msg.role === "user" && (
                      <div className="bg-muted mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                        <User className="text-muted-foreground h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start gap-3">
                    <div className="bg-primary/10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                      <Bot className="text-primary h-4 w-4" />
                    </div>
                    <div className="bg-muted border-border/50 rounded-lg border px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
                        <span className="text-muted-foreground text-sm">
                          Thinking...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="bg-background/95 border-border/50 border-t px-4 py-3 backdrop-blur-sm">
            <div className="flex items-end gap-2.5">
              <div className="relative flex-1">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your sources..."
                  className="border-border/60 focus-visible:border-primary/50 max-h-[120px] min-h-[44px] resize-none py-2.5 pr-12 text-sm leading-relaxed"
                  rows={1}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={!message.trim() || isLoading}
                size="icon"
                className="h-[44px] w-[44px] shrink-0 rounded-lg transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-muted-foreground/70 mt-2.5 flex items-center gap-1.5 text-[10px] leading-tight">
              <span>Press</span>
              <kbd className="bg-muted/80 border-border/50 rounded border px-1.5 py-0.5 font-mono text-[10px] shadow-sm">
                Enter
              </kbd>
              <span>to send,</span>
              <kbd className="bg-muted/80 border-border/50 rounded border px-1.5 py-0.5 font-mono text-[10px] shadow-sm">
                Shift+Enter
              </kbd>
              <span>for new line</span>
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="relative flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-8">
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
              <ChevronDown className="text-muted-foreground/40 h-5 w-5" />
            </div>

            <div className="flex flex-col items-center gap-4 text-center">
              <ChevronUp className="text-muted-foreground/40 h-12 w-12" />
              <p className="text-foreground text-sm font-medium">
                Add a source to get started
              </p>
              <Button
                className="bg-background text-foreground border-border/60 hover:bg-muted/60 cursor-pointer rounded-md border shadow-sm"
                onClick={onAddSource}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload a source
              </Button>
            </div>
          </div>

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
        </>
      )}
    </div>
  );
}

// File Upload Area Component
function FileUploadArea({
  isDragging,
  isUploading,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: {
  isDragging: boolean;
  isUploading: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (files: FileList | null) => void;
}) {
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

// URL Upload Area Component
function UrlUploadArea({
  websiteUrl,
  isUploading,
  onUrlChange,
  onSubmit,
}: {
  websiteUrl: string;
  isUploading: boolean;
  onUrlChange: (url: string) => void;
  onSubmit: () => void;
}) {
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

// Add Source Dialog Component
function AddSourceDialog({
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
}: {
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
}) {
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

// Footer Component
function Footer() {
  return (
    <footer className="bg-background/80 border-border/50 z-10 flex h-10 shrink-0 items-center justify-center border-t backdrop-blur-sm">
      <p className="text-muted-foreground/70 text-xs">
        NotebookLM can be inaccurate; please double-check its responses.
      </p>
    </footer>
  );
}

// Main Component
export default function NotebookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: notebookId } = use(params);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [isAddSourceDialogOpen, setIsAddSourceDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [deletingSourceIds, setDeletingSourceIds] = useState<Set<string>>(
    new Set()
  );

  const {
    data: notebook,
    isLoading: isLoadingNotebook,
    error: notebookError,
  } = trpc.notebookRouter.getNotebook.useQuery(
    {
      id: notebookId,
    },
    {
      retry: false,
    }
  );

  const { data: sources = [], isLoading: isLoadingSources } =
    trpc.sourcesRouter.getSources.useQuery({
      notebookId,
    });

  const sourcesNeedingPolling = sources
    .filter(
      (source) =>
        source.processingStatus !== "completed" &&
        source.processingStatus !== "failed"
    )
    .map((source) => source.id);

  const { data: liveStatuses } = trpc.sourcesRouter.pollStatus.useQuery(
    { sourceIds: sourcesNeedingPolling },
    {
      enabled: sourcesNeedingPolling.length > 0,
      refetchInterval: 2000,
    }
  );

  const sourceCount = sources.length;

  const utils = trpc.useUtils();
  const uploadFile = trpc.sourcesRouter.uploadFile.useMutation({
    onSuccess: () => {
      toast.success("File uploaded successfully!", {
        id: "upload-file",
      });
      // Dismiss and show success for website upload toast
      toast.success("Website uploaded successfully!", {
        id: "upload-url",
      });
      utils.sourcesRouter.getSources.invalidate({ notebookId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload file", {
        id: "upload-file",
      });
      // Dismiss and show error for website upload toast
      toast.error(error.message || "Failed to upload website", {
        id: "upload-url",
      });
    },
  });

  const deleteSource = trpc.sourcesRouter.deleteSource.useMutation({
    onSuccess: () => {
      toast.success("Source deleted successfully!", {
        id: "delete-source",
      });
      utils.sourcesRouter.getSources.invalidate({ notebookId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete source", {
        id: "delete-source",
      });
    },
    onSettled: (_, __, variables) => {
      setDeletingSourceIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.sourceId);
        return next;
      });
    },
  });

  const handleDeleteSource = async (sourceId: string) => {
    setDeletingSourceIds((prev) => new Set(prev).add(sourceId));
    await deleteSource.mutateAsync({ sourceId });
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    toast.loading("Uploading file...", { id: "upload-file" });

    try {
      for (const file of Array.from(files)) {
        const fileBase64 = await fileToBase64(file);
        await uploadFile.mutateAsync({
          fileBase64,
          fileName: file.name,
          notebookId,
        });
      }
      setIsAddSourceDialogOpen(false);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
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

  const handleUrlSubmit = async () => {
    if (!websiteUrl.trim()) {
      toast.error("Please enter a valid URL", {
        id: "upload-url",
      });
      return;
    }

    try {
      new URL(websiteUrl);
    } catch {
      toast.error("Please enter a valid URL", {
        id: "upload-url",
      });
      return;
    }

    setIsUploading(true);
    toast.loading("Uploading website...", { id: "upload-url" });

    try {
      await uploadFile.mutateAsync({
        fileBase64: "",
        fileName: websiteUrl,
        notebookId,
        websiteUrl: websiteUrl.trim(),
      });
      setIsAddSourceDialogOpen(false);
      setWebsiteUrl("");
      setUploadMode("file");
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const router = useRouter();

  const handleSignout = () => {
    signOut().then(() => {
      router.push("/");
    });
  };

  if (notebookError) {
    return <ErrorState />;
  }

  return (
    <div className="bg-muted/20 flex h-screen flex-col overflow-hidden">
      <Header
        notebookName={notebook?.name}
        isLoadingNotebook={isLoadingNotebook}
        sourceCount={sourceCount}
        isLoadingSources={isLoadingSources}
        onSignOut={handleSignout}
      />

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden px-4 pt-4 pb-4">
        <SourcesPane
          sources={sources}
          isLoadingSources={isLoadingSources}
          liveStatuses={liveStatuses}
          sourcesCollapsed={sourcesCollapsed}
          onToggleCollapse={() => setSourcesCollapsed(!sourcesCollapsed)}
          onAddSource={() => setIsAddSourceDialogOpen(true)}
          isUploading={isUploading}
          onDeleteSource={handleDeleteSource}
          deletingSourceIds={deletingSourceIds}
        />

        <ChatPane
          sourcesCollapsed={sourcesCollapsed}
          onShowSources={() => setSourcesCollapsed(false)}
          onAddSource={() => setIsAddSourceDialogOpen(true)}
          sourceCount={sourceCount}
        />
      </div>

      <Footer />

      <AddSourceDialog
        isOpen={isAddSourceDialogOpen}
        onOpenChange={(open) => {
          setIsAddSourceDialogOpen(open);
          if (!open) {
            setWebsiteUrl("");
            setUploadMode("file");
          }
        }}
        uploadMode={uploadMode}
        onModeChange={setUploadMode}
        isUploading={isUploading}
        isDragging={isDragging}
        websiteUrl={websiteUrl}
        onWebsiteUrlChange={setWebsiteUrl}
        onFileSelect={handleFileSelect}
        onUrlSubmit={handleUrlSubmit}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />
    </div>
  );
}
