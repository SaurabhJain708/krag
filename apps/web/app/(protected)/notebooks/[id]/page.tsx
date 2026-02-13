"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { trpc } from "@/server/trpc/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Header } from "./components/header";
import { ErrorState } from "./components/error-state";
import { SourcesPane } from "./components/sources-pane";
import { ChatPane, type ActiveCitation } from "./components/chat-pane";
import { ViewerPane } from "./components/viewer-pane";
import { AddSourceDialog } from "./components/add-source-dialog";
import { Footer } from "./components/footer";
import { fileToBase64 } from "./components/utils";

const ENCRYPTION_KEY_STORAGE =
  process.env.ENCRYPTION_KEY_STORAGE || "encryption_key";

// Main Component
export default function NotebookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: notebookId } = use(params);
  const [sourcesCollapsed, setSourcesCollapsed] = useState(false);
  const [isAddSourceDialogOpen, setIsAddSourceDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [deletingSourceIds, setDeletingSourceIds] = useState<Set<string>>(
    new Set()
  );
  const [activeCitation, setActiveCitation] = useState<ActiveCitation | null>(
    null
  );
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
    data: notebook,
    isLoading: isLoadingNotebook,
    error: notebookError,
  } = trpc.notebookRouter.getNotebook.useQuery(
    {
      id: notebookId,
    },
    {
      retry: false,
    }
  );

  const { data: sources = [], isLoading: isLoadingSources } =
    trpc.sourcesRouter.getSources.useQuery({
      notebookId,
    });

  const sourcesNeedingPolling = sources
    .filter(
      (source) =>
        source.processingStatus !== "completed" &&
        source.processingStatus !== "failed"
    )
    .map((source) => source.id);

  const { data: liveStatuses } = trpc.sourcesRouter.pollStatus.useQuery(
    { sourceIds: sourcesNeedingPolling },
    {
      enabled: sourcesNeedingPolling.length > 0,
      refetchInterval: 2000,
    }
  );

  const sourceCount = sources.length;

  const utils = trpc.useUtils();
  const uploadFile = trpc.sourcesRouter.uploadFile.useMutation({
    onSuccess: (_, variables) => {
      if (variables.websiteUrl) {
        toast.success("Website uploaded successfully!", {
          id: "upload-url",
        });
      } else {
        toast.success("File uploaded successfully!", {
          id: "upload-file",
        });
      }
      utils.sourcesRouter.getSources.invalidate({ notebookId });
    },
    onError: (error, variables) => {
      if (variables.websiteUrl) {
        toast.error(error.message || "Failed to upload website", {
          id: "upload-url",
        });
      } else {
        toast.error(error.message || "Failed to upload file", {
          id: "upload-file",
        });
      }
    },
  });

  const deleteSource = trpc.sourcesRouter.deleteSource.useMutation({
    onSuccess: () => {
      toast.success("Source deleted successfully!", {
        id: "delete-source",
      });
      utils.sourcesRouter.getSources.invalidate({ notebookId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete source", {
        id: "delete-source",
      });
    },
    onSettled: (_, __, variables) => {
      setDeletingSourceIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.sourceId);
        return next;
      });
    },
  });

  const handleDeleteSource = async (sourceId: string) => {
    setDeletingSourceIds((prev) => new Set(prev).add(sourceId));
    await deleteSource.mutateAsync({ sourceId });
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    toast.loading("Uploading file...", { id: "upload-file" });

    try {
      // Read encryption key from localStorage at upload time to ensure we have the latest value
      const rawKey =
        typeof window !== "undefined"
          ? localStorage.getItem(ENCRYPTION_KEY_STORAGE)
          : null;
      const currentEncryptionKey = rawKey?.trim() || undefined;

      console.log(
        "Upload file - localStorage key:",
        rawKey ? "found" : "not found"
      );
      console.log(
        "Upload file - encryptionKey to send:",
        currentEncryptionKey ? "present" : "missing"
      );

      for (const file of Array.from(files)) {
        const fileBase64 = await fileToBase64(file);
        await uploadFile.mutateAsync({
          fileBase64,
          fileName: file.name,
          notebookId,
          encryptionKey: currentEncryptionKey,
        });
      }
      setIsAddSourceDialogOpen(false);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleUrlSubmit = async () => {
    if (!websiteUrl.trim()) {
      toast.error("Please enter a valid URL", {
        id: "upload-url",
      });
      return;
    }

    try {
      new URL(websiteUrl);
    } catch {
      toast.error("Please enter a valid URL", {
        id: "upload-url",
      });
      return;
    }

    setIsUploading(true);
    toast.loading("Uploading website...", { id: "upload-url" });

    try {
      // Read encryption key from localStorage at upload time to ensure we have the latest value
      const rawKey =
        typeof window !== "undefined"
          ? localStorage.getItem(ENCRYPTION_KEY_STORAGE)
          : null;
      const currentEncryptionKey = rawKey?.trim() || undefined;

      console.log(
        "Upload URL - localStorage key:",
        rawKey ? "found" : "not found"
      );
      console.log(
        "Upload URL - encryptionKey to send:",
        currentEncryptionKey ? "present" : "missing"
      );

      await uploadFile.mutateAsync({
        fileBase64: "",
        fileName: websiteUrl,
        notebookId,
        websiteUrl: websiteUrl.trim(),
        encryptionKey: currentEncryptionKey,
      });
      setIsAddSourceDialogOpen(false);
      setWebsiteUrl("");
      setUploadMode("file");
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const router = useRouter();

  const handleSignout = () => {
    signOut().then(() => {
      router.push("/");
    });
  };

  if (notebookError) {
    return <ErrorState />;
  }

  return (
    <div className="bg-muted/20 flex h-screen flex-col overflow-hidden">
      <Header
        notebookName={notebook?.name}
        isLoadingNotebook={isLoadingNotebook}
        sourceCount={sourceCount}
        isLoadingSources={isLoadingSources}
        encryption={notebook?.encryption}
        onSignOut={handleSignout}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-3 pt-3 pb-3 lg:flex-row lg:gap-4 lg:px-4 lg:pt-4 lg:pb-4">
        <SourcesPane
          sources={sources}
          isLoadingSources={isLoadingSources}
          liveStatuses={liveStatuses}
          sourcesCollapsed={sourcesCollapsed}
          onToggleCollapse={() => setSourcesCollapsed(!sourcesCollapsed)}
          onAddSource={() => setIsAddSourceDialogOpen(true)}
          isUploading={isUploading}
          onDeleteSource={handleDeleteSource}
          deletingSourceIds={deletingSourceIds}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          <div
            className={cn(
              "flex min-h-0 flex-1",
              !sourcesCollapsed ? "hidden lg:flex" : "flex",
              activeCitation ? "hidden lg:flex" : ""
            )}
          >
            <ChatPane
              sourcesCollapsed={sourcesCollapsed}
              onShowSources={() => setSourcesCollapsed(false)}
              onAddSource={() => setIsAddSourceDialogOpen(true)}
              sourceCount={sourceCount}
              notebookId={notebookId}
              onCitationClick={setActiveCitation}
            />
          </div>
          {activeCitation && (
            <div
              className={cn(
                "flex min-h-0",
                !sourcesCollapsed ? "hidden lg:flex" : "flex"
              )}
            >
              <ViewerPane
                activeCitation={activeCitation}
                onClear={() => setActiveCitation(null)}
              />
            </div>
          )}
        </div>
      </div>

      <Footer />

      <AddSourceDialog
        isOpen={isAddSourceDialogOpen}
        onOpenChange={(open) => {
          setIsAddSourceDialogOpen(open);
          if (!open) {
            setWebsiteUrl("");
            setUploadMode("file");
          }
        }}
        uploadMode={uploadMode}
        onModeChange={setUploadMode}
        isUploading={isUploading}
        isDragging={isDragging}
        websiteUrl={websiteUrl}
        onWebsiteUrlChange={setWebsiteUrl}
        onFileSelect={handleFileSelect}
        onUrlSubmit={handleUrlSubmit}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />
    </div>
  );
}
