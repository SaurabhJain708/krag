"use client";

import { useMemo, useEffect, useRef } from "react";
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
  const contentRef = useRef<HTMLDivElement>(null);

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

  // Store the target block content for highlighting after render
  const targetBlockContent = useMemo(() => {
    if (!source?.content || !activeCitation?.chunkId) return null;

    const raw = source.content as unknown;
    if (Array.isArray(raw)) {
      const blocks = raw as Array<{
        id?: string | number;
        type?: "text" | "table";
        content?: string;
      }>;
      const targetChunkId =
        typeof activeCitation.chunkId === "string"
          ? parseInt(activeCitation.chunkId, 10)
          : Number(activeCitation.chunkId);

      const matchingBlock = blocks.find((block) => {
        const blockIdNum =
          block.id !== undefined
            ? typeof block.id === "string"
              ? parseInt(block.id, 10)
              : Number(block.id)
            : null;
        return blockIdNum !== null && blockIdNum === targetChunkId;
      });

      return matchingBlock?.content ?? null;
    }
    return null;
  }, [source?.content, activeCitation?.chunkId]);

  const combinedContent = useMemo(() => {
    if (!source?.content) return "";

    const raw = source.content as unknown;
    if (Array.isArray(raw)) {
      const blocks = raw as Array<{
        id?: string | number;
        type?: "text" | "table";
        content?: string;
      }>;
      return blocks.map((block) => block.content ?? "").join("\n\n");
    } else if (typeof raw === "string") {
      return raw;
    }
    return "";
  }, [source?.content]);

  // Highlight and scroll to chunk after Streamdown renders
  useEffect(() => {
    if (!combinedContent || !targetBlockContent || !contentRef.current) {
      return;
    }

    const container = contentRef.current;
    let highlightedElement: Element | null = null;

    const highlightAndScroll = () => {
      if (!container) return;

      // Find the text node or element containing the target content
      // We'll search for a portion of the text to find the right element
      const searchText = targetBlockContent
        .substring(0, Math.min(50, targetBlockContent.length))
        .trim();

      if (!searchText) return;

      // Walk through all text nodes to find the one containing our content
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );

      let textNode: Node | null = null;
      while ((textNode = walker.nextNode())) {
        if (textNode.textContent?.includes(searchText)) {
          // Found the text node, get its parent element
          let parent = textNode.parentElement;
          while (parent && parent !== container) {
            // Check if this parent contains the full target content
            if (
              parent.textContent?.includes(targetBlockContent.substring(0, 100))
            ) {
              highlightedElement = parent;
              break;
            }
            parent = parent.parentElement;
          }
          if (highlightedElement) break;
        }
      }

      // If we found an element, add highlighting class directly
      if (highlightedElement) {
        highlightedElement.classList.add("highlighted-chunk");
        highlightedElement.id = "highlighted-chunk";
        console.log(
          "Highlighted element found:",
          highlightedElement.tagName,
          highlightedElement.className
        );
      }

      // Scroll to the highlighted element
      if (highlightedElement) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = highlightedElement.getBoundingClientRect();
        const scrollTop =
          container.scrollTop +
          elementRect.top -
          containerRect.top -
          containerRect.height / 2 +
          elementRect.height / 2;

        container.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        });
        console.log("Scrolled to highlighted element");
      } else {
        console.log(
          "Could not find element with content:",
          searchText.substring(0, 30)
        );
      }
    };

    // Use MutationObserver to wait for Streamdown to finish rendering
    const observer = new MutationObserver((mutations, obs) => {
      // Check if content has been added
      if (container.children.length > 0) {
        // Try to highlight after a short delay
        setTimeout(() => {
          highlightAndScroll();
          obs.disconnect();
        }, 100);
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    // Also try after delays as fallback
    const timers = [200, 500, 1000].map((delay) =>
      setTimeout(() => {
        if (!highlightedElement) {
          highlightAndScroll();
        }
      }, delay)
    );

    return () => {
      observer.disconnect();
      timers.forEach((timer) => clearTimeout(timer));
      // Clean up any added highlights
      const existing = container.querySelector(".highlighted-chunk");
      if (existing) {
        existing.classList.remove("highlighted-chunk");
        existing.removeAttribute("id");
      }
    };
  }, [combinedContent, targetBlockContent]);

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
          <CardContent
            ref={contentRef}
            className="flex-1 overflow-auto px-4 py-3 text-sm [&_.highlighted-chunk]:rounded [&_.highlighted-chunk]:border [&_.highlighted-chunk]:border-yellow-400 [&_.highlighted-chunk]:bg-yellow-200 [&_.highlighted-chunk]:px-1 [&_.highlighted-chunk]:py-0.5 [&_.highlighted-chunk]:dark:border-yellow-700 [&_.highlighted-chunk]:dark:bg-yellow-900/30 [&.highlighted-chunk]:rounded [&.highlighted-chunk]:border [&.highlighted-chunk]:border-yellow-400 [&.highlighted-chunk]:bg-yellow-200 [&.highlighted-chunk]:px-1 [&.highlighted-chunk]:py-0.5 [&.highlighted-chunk]:dark:border-yellow-700 [&.highlighted-chunk]:dark:bg-yellow-900/30"
          >
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
