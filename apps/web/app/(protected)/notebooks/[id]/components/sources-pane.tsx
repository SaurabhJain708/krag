"use client";

import { Plus, ChevronLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SourceItem } from "./source-item";
import { getProcessingStatusInfo } from "./utils";

interface SourcesPaneProps {
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
}

export function SourcesPane({
  sources,
  isLoadingSources,
  liveStatuses,
  sourcesCollapsed,
  onToggleCollapse,
  onAddSource,
  isUploading,
  onDeleteSource,
  deletingSourceIds,
}: SourcesPaneProps) {
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
