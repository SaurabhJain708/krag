"use client";

import { Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProcessingStatusInfo } from "./utils";

interface SourceItemProps {
  source: { id: string; name: string; type: string };
  statusInfo: ReturnType<typeof getProcessingStatusInfo>;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function SourceItem({
  source,
  statusInfo,
  onDelete,
  isDeleting,
}: SourceItemProps) {
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
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-6 w-6 shrink-0 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
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
