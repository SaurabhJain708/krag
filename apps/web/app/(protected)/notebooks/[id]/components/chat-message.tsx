"use client";

import React from "react";
import { Bot, User } from "lucide-react";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
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
  };
};

const CitationButton = (
  props: React.HTMLAttributes<HTMLSpanElement> & {
    "data-citation-number"?: string;
    children?: React.ReactNode;
    __originalContent?: string;
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

  const { exactText, sourceId, summary } = citationData;
  const children = props.children;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={() => console.log("Navigate to source:", sourceId)}
            variant="outline"
            size="icon"
            className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border-blue-300 bg-blue-100 text-xs font-bold text-blue-600 hover:bg-blue-200"
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="w-64 p-3 text-xs">
          <p className="mb-1 font-semibold">Summary:</p>
          <p className="text-muted-foreground mb-2">{summary}</p>
          <div className="border-border text-muted-foreground border-t pt-2 italic">
            &quot;{exactText.slice(0, 80)}...&quot;
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export function ChatMessage({ role, content }: ChatMessageProps) {
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
