"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
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
  Search,
  Filter,
  Layers,
  FileSearch,
  Sparkles,
  Database,
  Settings,
  CheckCircle2,
  X,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/server/trpc/react";
import { toast } from "sonner";
import { ChatMessage } from "./chat-message";

const ENCRYPTION_KEY_STORAGE =
  process.env.ENCRYPTION_KEY_STORAGE || "encryption_key";

interface ChatPaneProps {
  sourcesCollapsed: boolean;
  onShowSources: () => void;
  onAddSource: () => void;
  sourceCount: number;
  notebookId: string;
  onCitationClick: (citation: ActiveCitation) => void;
}

export interface ActiveCitation {
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
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [statusHistory, setStatusHistory] = useState<string[]>([]);
  const [encryptionKey, setEncryptionKey] = useState<string | undefined>(
    undefined
  );
  const [subscriptionInput, setSubscriptionInput] = useState<{
    notebookId: string;
    content: string;
    encryptionKey?: string;
  } | null>(null);

  // Load encryption key from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
      setEncryptionKey(storedKey || undefined);
    }
  }, []);

  // Status configuration with icons and friendly messages
  const statusConfig: Record<
    string,
    { message: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    preparing_question: {
      message: "Preparing your question",
      icon: Settings,
    },
    retrieving_chunks: {
      message: "Searching through your sources",
      icon: Search,
    },
    filtering_chunks: {
      message: "Filtering relevant information",
      icon: Filter,
    },
    getting_parent_chunks: {
      message: "Gathering context",
      icon: Layers,
    },
    extracting_content: {
      message: "Extracting key information",
      icon: FileSearch,
    },
    summarizing_content: {
      message: "Summarizing findings",
      icon: Sparkles,
    },
    generating_response: {
      message: "Generating response",
      icon: Bot,
    },
    saving_to_db: {
      message: "Saving response",
      icon: Database,
    },
    preparing_context: {
      message: "Preparing context",
      icon: Settings,
    },
    cleaning_up: {
      message: "Finalizing",
      icon: CheckCircle2,
    },
  };
  const hasSources = sourceCount > 0;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  const { data: messages = [], isLoading: isLoadingMessages } =
    trpc.messagesRouter.getMessages.useQuery({
      notebookId,
      encryptionKey: encryptionKey,
    });

  // Subscription for streaming status updates
  trpc.messagesRouter.createMessage.useSubscription(
    subscriptionInput || {
      notebookId: "",
      content: "",
      encryptionKey: undefined,
    },
    {
      enabled: subscriptionInput !== null,
      onData: (status: string) => {
        // Update status as we receive streaming updates
        setCurrentStatus(status);
        setStatusHistory((prev) => {
          if (!prev.includes(status)) {
            return [...prev, status];
          }
          return prev;
        });
        const config = statusConfig[status];
        const friendlyMessage = config?.message || status;
        toast.loading(friendlyMessage, { id: "create-message" });
      },
      onError: (error) => {
        console.error("Subscription error:", error);
        toast.error(error.message || "Failed to process message", {
          id: "create-message",
        });
        setIsLoading(false);
        setCurrentStatus(null);
        setStatusHistory([]);
        setSubscriptionInput(null);
        // Rollback optimistic update
        utils.messagesRouter.getMessages.invalidate({ notebookId });
      },
      onComplete: () => {
        toast.success("Message processed successfully", {
          id: "create-message",
        });
        setIsLoading(false);
        setCurrentStatus(null);
        setStatusHistory([]);
        setSubscriptionInput(null);
        // Refresh messages to get the final result
        utils.messagesRouter.getMessages.invalidate({ notebookId });
      },
    }
  );

  const handleSend = () => {
    if (!message.trim() || isLoading) return;

    const messageContent = message.trim();
    setMessage("");
    setIsLoading(true);
    setCurrentStatus(null);
    setStatusHistory([]);
    toast.loading("Sending message...", { id: "create-message" });

    // Optimistically add user message
    const optimisticUserMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "", // Will be filled by server
      notebookId,
      role: "user" as const,
      summary: null,
      failed: false,
    };

    utils.messagesRouter.getMessages.setData({ notebookId }, (old) => [
      ...(old ?? []),
      optimisticUserMessage,
    ]);

    // Start subscription by setting input
    setSubscriptionInput({
      notebookId,
      content: messageContent,
      encryptionKey: encryptionKey,
    });
  };

  const handleCancel = () => {
    // Cancel the subscription by clearing the input
    setSubscriptionInput(null);
    setIsLoading(false);
    setCurrentStatus(null);
    setStatusHistory([]);
    toast.dismiss("create-message");
    toast.info("Message cancelled");
    // Refresh messages to get the current state (removes optimistic update)
    utils.messagesRouter.getMessages.invalidate({ notebookId });
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
                      content={msg.content || ""}
                      failed={msg.failed}
                      onCitationClick={handleCitationClick}
                    />
                  ))}
                  {isLoading && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 ml-0 flex justify-start gap-3 duration-500 sm:ml-2 sm:gap-4">
                      <div className="from-primary/20 to-primary/5 ring-primary/30 z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br shadow-lg ring-2 sm:h-12 sm:w-12">
                        <Image
                          src="/favicon.ico"
                          alt="Loading"
                          width={24}
                          height={24}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="from-muted/80 to-muted/40 border-border/60 w-full rounded-xl border-2 bg-linear-to-br px-4 py-4 shadow-lg backdrop-blur-sm sm:max-w-[480px] sm:min-w-[320px] sm:px-6 sm:py-5">
                        <div className="flex flex-col gap-3 sm:gap-4">
                          {/* Current Status - Larger and More Prominent */}
                          <div className="flex items-center gap-2 sm:gap-3">
                            {currentStatus && statusConfig[currentStatus] ? (
                              <>
                                <div className="from-primary/20 to-primary/10 text-primary ring-primary/20 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br shadow-sm ring-1 sm:h-10 sm:w-10">
                                  {(() => {
                                    const Icon =
                                      statusConfig[currentStatus].icon;
                                    return (
                                      <Icon className="h-4 w-4 animate-pulse drop-shadow-sm sm:h-5 sm:w-5" />
                                    );
                                  })()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-foreground text-sm leading-tight font-semibold sm:text-base">
                                    {statusConfig[currentStatus].message}
                                  </p>
                                </div>
                                <Loader2 className="text-primary h-4 w-4 shrink-0 animate-spin sm:h-5 sm:w-5" />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleCancel}
                                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0 cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <div className="from-primary/20 to-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br shadow-sm sm:h-10 sm:w-10">
                                  <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-foreground text-sm font-semibold sm:text-base">
                                    Thinking...
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleCancel}
                                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>

                          {/* Progress Steps - Enhanced Design */}
                          {statusHistory.length > 0 && (
                            <div className="border-border/40 space-y-2 border-t pt-3">
                              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase sm:text-xs">
                                Progress
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                {statusHistory.map((status, idx) => {
                                  const config = statusConfig[status];
                                  const Icon = config?.icon || CheckCircle2;
                                  const isCurrent = status === currentStatus;
                                  const currentIndex = currentStatus
                                    ? statusHistory.indexOf(currentStatus)
                                    : -1;
                                  const isCompleted =
                                    currentIndex !== -1 && idx < currentIndex;

                                  return (
                                    <div
                                      key={status}
                                      className="group flex items-center gap-1.5 sm:gap-2"
                                    >
                                      <div
                                        className={cn(
                                          "flex h-7 w-7 items-center justify-center rounded-lg shadow-sm transition-all duration-300 sm:h-8 sm:w-8",
                                          isCurrent
                                            ? "from-primary to-primary/90 text-primary-foreground ring-primary/50 scale-110 bg-linear-to-br shadow-md ring-2"
                                            : isCompleted
                                              ? "from-primary/25 to-primary/15 text-primary ring-primary/30 bg-linear-to-br ring-1"
                                              : "from-muted/80 to-muted/60 text-muted-foreground ring-border/50 bg-linear-to-br ring-1"
                                        )}
                                      >
                                        <Icon
                                          className={cn(
                                            "h-3.5 w-3.5 drop-shadow-sm transition-all sm:h-4 sm:w-4",
                                            isCurrent && "animate-pulse"
                                          )}
                                        />
                                      </div>
                                      {idx < statusHistory.length - 1 && (
                                        <div className="relative flex items-center">
                                          <div
                                            className={cn(
                                              "relative h-[2px] w-3 overflow-hidden rounded-full transition-all duration-300 sm:w-4",
                                              isCompleted
                                                ? "from-primary/60 via-primary/40 to-primary/20 bg-linear-to-r"
                                                : isCurrent
                                                  ? "from-primary/40 via-primary/20 to-border/30 bg-linear-to-r"
                                                  : "from-border/40 to-border/20 bg-linear-to-r"
                                            )}
                                          >
                                            {isCompleted && (
                                              <div className="bg-primary/30 absolute inset-0 animate-pulse" />
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
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
                onClick={isLoading ? handleCancel : handleSend}
                disabled={!isLoading && !message.trim()}
                size="icon"
                className="h-[44px] w-[44px] shrink-0 cursor-pointer rounded-lg transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? (
                  <Square className="h-4 w-4" />
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
