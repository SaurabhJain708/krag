"use client";

import React from "react";
import { Bot, User } from "lucide-react";
import { Streamdown } from "streamdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CitationData {
  exactText: string;
  sourceId: string;
  chunkId: string;
  summary: string;
  citationNumber: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  onCitationClick?: (citation: CitationData) => void;
}

// Parse citation data from original message content by matching citation number
const parseCitationFromContent = (content: string, citationNumber: string) => {
  // Match the citation span with this number - use a flexible regex that handles any attribute order
  const spanPattern = new RegExp(
    `<span([^>]*)data-citation="true"([^>]*)>\\[${citationNumber}\\]</span>`,
    "i"
  );
  const spanMatch = content.match(spanPattern);

  if (!spanMatch) return null;

  // Combine all attribute strings
  const allAttrs = (spanMatch[1] || "") + (spanMatch[2] || "");

  // Extract individual attributes with flexible regex
  const getAttr = (name: string): string => {
    const attrPattern = new RegExp(`${name}="([^"]*)"`, "i");
    const match = allAttrs.match(attrPattern);
    return match?.[1] ?? "";
  };

  const decodeHtml = (str: string) => {
    if (!str) return "";
    return str
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  };

  const exactText = decodeHtml(getAttr("data-exact-text"));
  const sourceId = decodeHtml(getAttr("data-source-id"));
  const chunkId = decodeHtml(getAttr("data-chunk-id"));
  const summary = decodeHtml(getAttr("data-summary"));

  return {
    exactText,
    sourceId,
    chunkId,
    summary,
    citationNumber,
  };
};

const CitationButton = (
  props: React.HTMLAttributes<HTMLSpanElement> & {
    "data-citation-number"?: string;
    children?: React.ReactNode;
    __originalContent?: string;
    onCitationClick?: (citation: CitationData) => void;
  }
) => {
  // Get citation number from children (e.g., "[1]")
  const citationNumber =
    props["data-citation-number"] ||
    (typeof props.children === "string"
      ? props.children.match(/\[(\d+)\]/)?.[1]
      : null) ||
    "";

  // Get citation data from original content passed via custom prop
  const originalContent = props.__originalContent || "";
  const citationData = parseCitationFromContent(
    originalContent,
    citationNumber
  );

  if (!citationData) {
    // Fallback: just render as span if we can't find the data
    return <span {...props} />;
  }

  const { exactText, summary } = citationData;
  const children = props.children;
  const { onCitationClick } = props;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            onClick={() => {
              if (onCitationClick) {
                onCitationClick(citationData);
              }
            }}
            className={cn(
              "relative inline-flex cursor-pointer items-baseline",
              "text-sm leading-none font-semibold",
              "text-blue-600 underline decoration-blue-500/60 decoration-dotted underline-offset-2",
              "transition-all duration-200",
              "hover:text-blue-700 hover:decoration-blue-600",
              "active:scale-95",
              "focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-blue-400/40 focus-visible:ring-offset-1 focus-visible:outline-none",
              "dark:text-blue-400 dark:decoration-blue-400/70",
              "dark:hover:text-blue-300 dark:hover:decoration-blue-400",
              "mr-0.5 ml-0.5"
            )}
            style={{
              verticalAlign: "super",
              fontSize: "0.9em",
            }}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs p-4 text-xs shadow-lg"
          sideOffset={8}
        >
          <div className="space-y-2">
            <p className="text-background font-semibold">Summary:</p>
            <p className="text-background/80 leading-relaxed">{summary}</p>
            <div className="border-background/20 text-background/70 border-t pt-2 italic">
              &quot;{exactText.slice(0, 80)}...&quot;
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function ChatMessage({
  role,
  content,
  onCitationClick,
}: ChatMessageProps) {
  return (
    <div
      className={cn(
        "flex gap-3",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {role === "assistant" && (
        <div className="bg-primary/10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <Bot className="text-primary h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
          role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground border-border/50 border"
        )}
      >
        {role === "assistant" ? (
          <Streamdown
            components={
              {
                span: (
                  props: React.HTMLAttributes<HTMLSpanElement> & {
                    children?: React.ReactNode;
                    className?: string;
                  }
                ) => {
                  // Check if this span contains a citation number like [1], [2], etc.
                  const childrenStr =
                    typeof props.children === "string"
                      ? props.children
                      : Array.isArray(props.children)
                        ? props.children.join("")
                        : String(props.children || "");
                  const citationMatch = childrenStr.match(/\[(\d+)\]/);

                  // Check if this looks like a citation span by checking the original content
                  // We'll pass the original content through a custom prop
                  if (citationMatch) {
                    // This might be a citation - pass original content to parse it
                    const citationProps = {
                      ...props,
                      __originalContent: content,
                      onCitationClick,
                    };
                    return <CitationButton {...citationProps} />;
                  }
                  // Default span rendering
                  return <span {...props} />;
                },
              } as unknown as Parameters<typeof Streamdown>[0]["components"]
            }
          >
            {content}
          </Streamdown>
        ) : (
          <p className="wrap-break-word whitespace-pre-wrap">{content}</p>
        )}
      </div>
      {role === "user" && (
        <div className="bg-muted mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <User className="text-muted-foreground h-4 w-4" />
        </div>
      )}
    </div>
  );
}
