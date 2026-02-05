"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Upload,
  ArrowRight,
  Loader2,
  Bot,
  Send,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/server/trpc/react";
import { toast } from "sonner";
import { ChatMessage } from "./chat-message";

interface ChatPaneProps {
  sourcesCollapsed: boolean;
  onShowSources: () => void;
  onAddSource: () => void;
  sourceCount: number;
  notebookId: string;
  onCitationClick: (citation: ActiveCitation) => void;
}

export interface ActiveCitation {
  exactText: string;
  sourceId: string;
  chunkId: string;
  summary: string;
  citationNumber: string;
}

export function ChatPane({
  sourcesCollapsed,
  onShowSources,
  onAddSource,
  sourceCount,
  notebookId,
  onCitationClick,
}: ChatPaneProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hasSources = sourceCount > 0;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const { data: messages = [], isLoading: isLoadingMessages } =
    trpc.messagesRouter.getMessages.useQuery({
      notebookId,
    });

  const createMessage = trpc.messagesRouter.createMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      setIsLoading(false);
      utils.messagesRouter.getMessages.invalidate({ notebookId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message", {
        id: "create-message",
      });
      setIsLoading(false);
    },
  });

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    toast.loading("Sending message...", { id: "create-message" });

    try {
      await createMessage.mutateAsync({
        notebookId,
        content: message.trim(),
      });
      // Success is handled by onSuccess callback
    } catch {
      // Error is handled by onError callback
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      } else if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    };

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading, isLoadingMessages]);

  const handleCitationClick = (citation: ActiveCitation) => {
    onCitationClick(citation);
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

      {hasSources || messages.length > 0 || isLoadingMessages ? (
        <>
          {/* Messages Area */}
          <div className="flex flex-1 flex-col gap-4 overflow-hidden px-3 py-4 lg:px-4 lg:py-6">
            <div
              ref={messagesContainerRef}
              className="flex flex-1 flex-col overflow-y-auto"
            >
              {isLoadingMessages ? (
                <div className="flex flex-1 items-center justify-center py-12">
                  <div className="flex items-center gap-2">
                    <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                    <span className="text-muted-foreground text-sm">
                      Loading messages...
                    </span>
                  </div>
                </div>
              ) : messages.length === 0 ? (
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
                    <ChatMessage
                      key={msg.id}
                      role={msg.role}
                      content={msg.content}
                      onCitationClick={handleCitationClick}
                    />
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
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
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
