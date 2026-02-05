"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/server/trpc/react";
import { Streamdown } from "streamdown";
import type { ActiveCitation } from "./chat-pane";

interface ViewerPaneProps {
  activeCitation: ActiveCitation | null;
  onClear: () => void;
}

export function ViewerPane({ activeCitation, onClear }: ViewerPaneProps) {
  const hasCitation = !!activeCitation;

  const {
    data: source,
    isLoading,
    error,
  } = trpc.sourcesRouter.getSource.useQuery(
    { sourceId: activeCitation?.sourceId ?? "" },
    {
      enabled: !!activeCitation?.sourceId,
    }
  );

  let combinedContent = "";

  if (source && source.content) {
    const raw = source.content as unknown;
    if (Array.isArray(raw)) {
      combinedContent = (raw as Array<{ content?: string }>)
        .map((block) => `<span>${block.content ?? ""}</span>`)
        .join("\n\n");
    } else if (typeof raw === "string") {
      combinedContent = `<span>${raw}</span>`;
    }
  }

  return (
    <div className="bg-card border-border/40 flex w-full flex-col overflow-hidden rounded-lg border shadow-sm lg:w-[420px] xl:w-[480px] 2xl:w-[560px]">
      <div className="border-border/50 bg-background/60 flex h-14 items-center justify-between border-b px-5">
        <span className="text-foreground text-sm font-semibold">Viewer</span>
        {hasCitation && (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7"
            onClick={onClear}
            title="Clear viewer"
          >
            ✕
          </Button>
        )}
      </div>

      {!hasCitation ? (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-xs">
          <p className="text-foreground text-sm font-medium">
            No selection yet
          </p>
          <p className="leading-relaxed">
            Select a citation in the chat to see the original source content
            here.
          </p>
        </div>
      ) : (
        <Card className="bg-background/80 flex h-full flex-col rounded-none border-none shadow-none">
          <CardHeader className="space-y-1 border-b px-4 py-3">
            <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Source content [{activeCitation.citationNumber}]
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto px-4 py-3 text-sm">
            {isLoading ? (
              <p className="text-muted-foreground text-xs">Loading source…</p>
            ) : error ? (
              <p className="text-destructive text-xs">
                Failed to load source content.
              </p>
            ) : combinedContent ? (
              <Streamdown>{combinedContent}</Streamdown>
            ) : (
              <p className="text-muted-foreground text-xs">
                No content available for this source.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
