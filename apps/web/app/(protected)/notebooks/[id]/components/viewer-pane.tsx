"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/server/trpc/react";
import { Streamdown } from "streamdown";
import { X, FileText, Eye } from "lucide-react";
import type { ActiveCitation } from "./chat-pane";

const ENCRYPTION_KEY_STORAGE =
  process.env.ENCRYPTION_KEY_STORAGE || "encryption_key";

interface ViewerPaneProps {
  activeCitation: ActiveCitation | null;
  onClear: () => void;
}

export function ViewerPane({ activeCitation, onClear }: ViewerPaneProps) {
  const hasCitation = !!activeCitation;
  const contentRef = useRef<HTMLDivElement>(null);
  const [encryptionKey, setEncryptionKey] = useState<string | undefined>(
    undefined
  );

  // Load encryption key from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
      setEncryptionKey(storedKey || undefined);
    }
  }, []);

  const {
    data: source,
    isLoading,
    error,
  } = trpc.sourcesRouter.getSource.useQuery(
    {
      sourceId: activeCitation?.sourceId ?? "",
      encryptionKey: encryptionKey,
    },
    {
      enabled: !!activeCitation?.sourceId,
      retry: false, // Don't retry on 404 errors
      // Treat 404 as a non-error case (source might have been deleted)
      throwOnError: false,
    }
  );

  // Keep blocks separate so we can render them with data-chunk-id attributes
  const blocks = useMemo(() => {
    if (!source?.content) return [];

    const raw = source.content as unknown;
    if (Array.isArray(raw)) {
      return raw as Array<{
        id?: string | number;
        type?: "text" | "table";
        content?: string;
      }>;
    }
    return [];
  }, [source?.content]);

  // Fallback for string content (shouldn't happen with new structure, but kept for safety)
  const combinedContent = useMemo(() => {
    if (!source?.content || Array.isArray(source.content)) return "";
    return String(source.content);
  }, [source?.content]);

  // Shared Streamdown components to avoid duplication
  const streamdownComponents = {
    a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Prevent Streamdown's default modal behavior for links
        // Allow normal link navigation
        if (
          props.href &&
          (props.href.startsWith("http") || props.href.startsWith("https"))
        ) {
          // External links - open in new tab
          window.open(props.href, "_blank", "noopener,noreferrer");
          e.preventDefault();
        }
        // Internal links will use default behavior
        props.onClick?.(e);
      };

      return (
        <a
          {...props}
          onClick={handleClick}
          className="text-primary hover:text-primary/80 underline underline-offset-2"
          target={props.href?.startsWith("http") ? "_blank" : undefined}
          rel={
            props.href?.startsWith("http") ? "noopener noreferrer" : undefined
          }
        />
      );
    },
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
    thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => {
      return (
        <thead {...props} className="bg-muted/80 border-border/60 border-b" />
      );
    },
    tbody: (props: React.HTMLAttributes<HTMLTableSectionElement>) => {
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
    th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => {
      return (
        <th
          {...props}
          className="border-border/40 text-foreground/70 border-r px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase last:border-r-0"
        />
      );
    },
    td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => {
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
    p: (props: React.HTMLAttributes<HTMLParagraphElement>) => {
      // Render as div instead of p to avoid hydration errors when interactive elements (divs) are nested inside
      // This prevents the "div cannot be a descendant of p" error
      return (
        <div
          {...props}
          data-paragraph
          className={props.className}
          style={{ display: "block", ...props.style }}
        />
      );
    },
  } as unknown as Parameters<typeof Streamdown>[0]["components"];

  // Highlight and scroll to chunk after Streamdown renders
  useEffect(() => {
    if (!activeCitation?.chunkId || !contentRef.current) {
      return;
    }

    const container = contentRef.current;
    let hasHighlighted = false;

    // Clean up previous highlights
    const cleanup = () => {
      const existing = container.querySelector(".highlighted-chunk");
      if (existing) {
        existing.classList.remove("highlighted-chunk");
        existing.removeAttribute("id");
      }
    };

    const highlightAndScroll = () => {
      if (!container || hasHighlighted) return;

      // Clean up any previous highlights first
      cleanup();

      // Get the chunk ID as a string (for data attribute matching)
      const targetChunkId = String(activeCitation.chunkId);

      // Directly find the element with the matching data-chunk-id attribute
      const highlightedElement = container.querySelector(
        `[data-chunk-id="${targetChunkId}"]`
      ) as HTMLElement | null;

      // Apply highlighting and scroll
      if (highlightedElement) {
        highlightedElement.classList.add("highlighted-chunk");
        highlightedElement.id = "highlighted-chunk";
        hasHighlighted = true;

        // Scroll to the highlighted element
        setTimeout(() => {
          const containerRect = container.getBoundingClientRect();
          const elementRect = highlightedElement.getBoundingClientRect();

          // Calculate scroll position to center the element
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
        }, 50);
      }
    };

    // Use MutationObserver to wait for Streamdown to finish rendering
    let observer: MutationObserver | null = null;
    let observerTimeout: NodeJS.Timeout | null = null;

    const startObserver = () => {
      if (observer) return;

      observer = new MutationObserver(() => {
        // Clear any existing timeout
        if (observerTimeout) {
          clearTimeout(observerTimeout);
        }

        // Wait a bit for Streamdown to finish rendering
        observerTimeout = setTimeout(() => {
          if (!hasHighlighted && container.children.length > 0) {
            highlightAndScroll();
          }
        }, 150);
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    };

    startObserver();

    // Also try after delays as fallback
    const timers = [300, 600, 1200, 2000].map((delay) =>
      setTimeout(() => {
        if (!hasHighlighted) {
          highlightAndScroll();
        }
      }, delay)
    );

    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (observerTimeout) {
        clearTimeout(observerTimeout);
      }
      timers.forEach((timer) => clearTimeout(timer));
      cleanup();
    };
  }, [activeCitation?.chunkId]);

  return (
    <div className="bg-card border-border/40 flex w-full flex-col overflow-hidden rounded-lg border shadow-sm lg:w-[500px] xl:w-[600px] 2xl:w-[720px]">
      {hasCitation ? (
        <div className="border-border/50 bg-background/80 flex h-14 items-center justify-between border-b px-4 pt-3 pb-3 shadow-sm backdrop-blur-sm">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              {isLoading ? (
                <div className="bg-muted h-4 w-40 animate-pulse rounded" />
              ) : (
                <span className="text-foreground truncate text-sm font-semibold">
                  {source?.name || "Source"}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:bg-muted hover:text-foreground h-7 w-7 shrink-0 cursor-pointer transition-colors"
            onClick={onClear}
            title="Close viewer"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="border-border/50 bg-background/80 flex h-14 items-center justify-between border-b px-4 pt-3 pb-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="bg-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
              <Eye className="text-muted-foreground h-3.5 w-3.5" />
            </div>
            <span className="text-foreground text-sm font-semibold">
              Viewer
            </span>
          </div>
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
        <div className="bg-background viewer-pane-content flex h-full flex-col">
          <div
            ref={contentRef}
            className="text-foreground/90 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_li]:text-foreground/80 [&_blockquote]:border-border [&_blockquote]:text-muted-foreground flex-1 overflow-x-hidden overflow-y-auto px-6 py-5 text-sm leading-relaxed wrap-break-word **:max-w-full [&_.highlighted-chunk]:rounded-md [&_.highlighted-chunk]:border [&_.highlighted-chunk]:border-yellow-400 [&_.highlighted-chunk]:bg-yellow-200/80 [&_.highlighted-chunk]:px-1.5 [&_.highlighted-chunk]:py-0.5 [&_.highlighted-chunk]:dark:border-yellow-600 [&_.highlighted-chunk]:dark:bg-yellow-900/40 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_div[data-paragraph]]:mb-3 [&_div[data-paragraph]:last-child]:mb-0 [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:text-lg [&_h1]:font-semibold [&_h1:first-child]:mt-0 [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_ol]:mb-3 [&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:space-y-1 [&.highlighted-chunk]:rounded-md [&.highlighted-chunk]:border [&.highlighted-chunk]:border-yellow-400 [&.highlighted-chunk]:bg-yellow-200/80 [&.highlighted-chunk]:px-1.5 [&.highlighted-chunk]:py-0.5 [&.highlighted-chunk]:dark:border-yellow-600 [&.highlighted-chunk]:dark:bg-yellow-900/40"
          >
            {isLoading ? (
              <div className="text-muted-foreground flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <p className="text-sm">Loading source…</p>
              </div>
            ) : error ? (
              <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4">
                <p className="text-destructive text-sm font-medium">
                  Source not found
                </p>
                <p className="text-destructive/80 mt-1 text-xs">
                  The source referenced in this citation may have been deleted
                  or is no longer accessible.
                </p>
              </div>
            ) : blocks.length > 0 ? (
              <>
                {blocks.map((block, index) => {
                  const chunkId =
                    block.id !== undefined ? String(block.id) : undefined;
                  const blockContent = block.content ?? "";

                  return (
                    <div
                      key={index}
                      data-chunk-id={chunkId}
                      className="chunk-block"
                    >
                      <Streamdown components={streamdownComponents}>
                        {blockContent}
                      </Streamdown>
                    </div>
                  );
                })}
              </>
            ) : combinedContent ? (
              <Streamdown components={streamdownComponents}>
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
