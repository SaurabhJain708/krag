"use client";

import React from "react";
import Image from "next/image";
import { User, AlertCircle, RefreshCw } from "lucide-react";
import { Streamdown } from "streamdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CitationData {
  sourceId: string;
  chunkId: string;
  summary: string;
  citationNumber: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
  onCitationClick?: (citation: CitationData) => void;
  onRetry?: () => void;
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

  const sourceId = decodeHtml(getAttr("data-source-id"));
  const chunkId = decodeHtml(getAttr("data-chunk-id"));
  const summary = decodeHtml(getAttr("data-summary"));

  return {
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

  const { summary } = citationData;
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
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function ChatMessage({
  role,
  content,
  failed = false,
  onCitationClick,
  onRetry,
}: ChatMessageProps) {
  const isFailed = failed && role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3",
        role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {role === "assistant" && (
        <div
          className={cn(
            "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            isFailed ? "bg-destructive/10" : "bg-primary/10"
          )}
        >
          {isFailed ? (
            <AlertCircle className="text-destructive h-4 w-4" />
          ) : (
            <Image
              src="/favicon.ico"
              alt="Assistant"
              width={24}
              height={24}
              className="h-full w-full"
            />
          )}
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
          role === "user"
            ? "bg-primary text-primary-foreground"
            : isFailed
              ? "bg-destructive/10 text-destructive border-destructive/20 border"
              : "bg-muted text-foreground border-border/50 border"
        )}
      >
        {isFailed ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Failed to generate response</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Something went wrong while processing your request. Please try
                  again.
                </p>
              </div>
            </div>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="w-fit"
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Retry
              </Button>
            )}
          </div>
        ) : role === "assistant" ? (
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
