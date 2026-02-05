// Utility functions used across multiple components

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (!reader.result || typeof reader.result !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      const base64 = reader.result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to extract base64 data"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const getProcessingStatusInfo = (status: string) => {
  const statusLabels: Record<string, string> = {
    uploading: "Uploading",
    queued: "Queued",
    processing: "Processing",
    starting: "Starting",
    vision: "Analyzing vision",
    extracting: "Extracting content",
    images: "Processing images",
    chunking: "Chunking",
    completed: "Completed",
    failed: "Failed",
  };

  const isProcessing =
    status !== "completed" && status !== "failed" && status !== "uploading";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isUploading = status === "uploading";

  return {
    label: statusLabels[status] || status,
    isProcessing,
    isCompleted,
    isFailed,
    isUploading,
  };
};
