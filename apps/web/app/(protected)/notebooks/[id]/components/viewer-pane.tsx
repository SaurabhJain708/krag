"use client";

import { useMemo, useEffect, useRef } from "react";
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

  // Convert img tags to markdown image syntax for Streamdown
  const convertImgTagsToMarkdown = (content: string): string => {
    // Match img tags with src attribute: <img id={...} src="..." /> or <img src="..." id={...} />
    const imgTagRegex = /<img\s+([^>]*?)\s*\/?>/gi;

    return content.replace(imgTagRegex, (match, attributes) => {
      // Extract src attribute
      const srcMatch = attributes.match(/src=["']([^"']+)["']/i);
      if (!srcMatch) return match; // If no src, return original tag

      const src = srcMatch[1];

      // Extract alt attribute if present, otherwise use empty string
      const altMatch = attributes.match(/alt=["']([^"']*)["']/i);
      const alt = altMatch ? altMatch[1] : "";

      // Convert to markdown image syntax: ![alt](url)
      return `![${alt}](${src})`;
    });
  };

  const combinedContent = useMemo(() => {
    if (!source?.content) return "";

    const raw = source.content as unknown;
    let content = "";

    if (Array.isArray(raw)) {
      const blocks = raw as Array<{
        id?: string | number;
        type?: "text" | "table";
        content?: string;
      }>;
      content = blocks.map((block) => block.content ?? "").join("\n\n");
    } else if (typeof raw === "string") {
      content = raw;
    }

    // Convert img tags to markdown syntax
    return convertImgTagsToMarkdown(content);
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
    <div className="bg-card border-border/40 flex w-full flex-col overflow-hidden rounded-lg border shadow-sm lg:w-[500px] xl:w-[600px] 2xl:w-[720px]">
      {hasCitation ? (
        <div className="border-border/50 bg-background/50 flex h-14 items-center justify-between border-b px-5">
          <div className="flex min-w-0 flex-1 items-center">
            {isLoading ? (
              <div className="bg-muted h-4 w-32 animate-pulse rounded" />
            ) : (
              <span className="text-foreground truncate text-sm font-semibold">
                {source?.name || "Source"}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7 shrink-0"
            onClick={onClear}
            title="Close viewer"
          >
            ✕
          </Button>
        </div>
      ) : (
        <div className="border-border/50 bg-background/50 flex h-14 items-center justify-between border-b px-5">
          <span className="text-foreground text-sm font-semibold">Viewer</span>
        </div>
      )}

      {!hasCitation ? (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-4 px-8 py-12 text-center">
          <div className="bg-muted/50 flex h-12 w-12 items-center justify-center rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-foreground text-sm font-medium">
              No selection yet
            </p>
            <p className="text-xs leading-relaxed">
              Select a citation in the chat to see the original source content
              here.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-background flex h-full flex-col">
          <div
            ref={contentRef}
            className="text-foreground/90 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_li]:text-foreground/80 [&_blockquote]:border-border [&_blockquote]:text-muted-foreground flex-1 overflow-x-hidden overflow-y-auto px-6 py-5 text-sm leading-relaxed wrap-break-word **:max-w-full [&_.highlighted-chunk]:rounded-md [&_.highlighted-chunk]:border [&_.highlighted-chunk]:border-yellow-400 [&_.highlighted-chunk]:bg-yellow-200/80 [&_.highlighted-chunk]:px-1.5 [&_.highlighted-chunk]:py-0.5 [&_.highlighted-chunk]:dark:border-yellow-600 [&_.highlighted-chunk]:dark:bg-yellow-900/40 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:text-lg [&_h1]:font-semibold [&_h1:first-child]:mt-0 [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_ol]:mb-3 [&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:space-y-1 [&.highlighted-chunk]:rounded-md [&.highlighted-chunk]:border [&.highlighted-chunk]:border-yellow-400 [&.highlighted-chunk]:bg-yellow-200/80 [&.highlighted-chunk]:px-1.5 [&.highlighted-chunk]:py-0.5 [&.highlighted-chunk]:dark:border-yellow-600 [&.highlighted-chunk]:dark:bg-yellow-900/40"
          >
            {isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <p className="text-sm">Loading source…</p>
              </div>
            ) : error ? (
              <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
                <p className="text-destructive text-sm font-medium">
                  Failed to load source content.
                </p>
              </div>
            ) : combinedContent ? (
              <Streamdown
                components={
                  {
                    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
                      return (
                        <img
                          {...props}
                          className="border-border/50 my-4 max-w-full rounded-lg border shadow-sm"
                          loading="lazy"
                          alt={props.alt || "Image"}
                        />
                      );
                    },
                    table: (props: React.HTMLAttributes<HTMLTableElement>) => {
                      return (
                        <div className="-mx-6 my-6 overflow-x-auto">
                          <div className="inline-block min-w-full px-6">
                            <table
                              {...props}
                              className="border-border/60 min-w-full border-collapse rounded-lg border shadow-sm"
                            />
                          </div>
                        </div>
                      );
                    },
                    thead: (
                      props: React.HTMLAttributes<HTMLTableSectionElement>
                    ) => {
                      return (
                        <thead
                          {...props}
                          className="bg-muted/80 border-border/60 border-b"
                        />
                      );
                    },
                    tbody: (
                      props: React.HTMLAttributes<HTMLTableSectionElement>
                    ) => {
                      return <tbody {...props} />;
                    },
                    tr: (props: React.HTMLAttributes<HTMLTableRowElement>) => {
                      return (
                        <tr
                          {...props}
                          className="border-border/40 hover:bg-muted/30 even:bg-muted/20 border-b transition-colors"
                        />
                      );
                    },
                    th: (
                      props: React.ThHTMLAttributes<HTMLTableCellElement>
                    ) => {
                      return (
                        <th
                          {...props}
                          className="border-border/40 text-foreground/70 border-r px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase last:border-r-0"
                        />
                      );
                    },
                    td: (
                      props: React.TdHTMLAttributes<HTMLTableCellElement>
                    ) => {
                      return (
                        <td
                          {...props}
                          className="border-border/40 text-foreground/80 border-r px-4 py-3 last:border-r-0"
                        />
                      );
                    },
                    pre: (props: React.HTMLAttributes<HTMLPreElement>) => {
                      return (
                        <pre
                          {...props}
                          className="border-border/50 bg-muted/50 my-4 overflow-x-auto rounded-lg border p-4 text-xs leading-relaxed"
                        />
                      );
                    },
                    code: (props: React.HTMLAttributes<HTMLElement>) => {
                      return (
                        <code
                          {...props}
                          className="bg-muted/70 text-foreground rounded-md px-1.5 py-0.5 font-mono text-xs"
                        />
                      );
                    },
                  } as unknown as Parameters<typeof Streamdown>[0]["components"]
                }
              >
                {combinedContent}
              </Streamdown>
            ) : (
              <p className="text-muted-foreground text-xs">
                No content available for this source.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
