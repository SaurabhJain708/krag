"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/server/trpc/react";
import { toast } from "sonner";

export default function CreateNotebookModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
    image?: string;
  }>({});

  const MAX_NAME_LENGTH = 100;
  const MAX_DESCRIPTION_LENGTH = 500;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

  const utils = trpc.useUtils();
  const createNotebook = trpc.notebookRouter.createNotebook.useMutation({
    onSuccess: () => {
      toast.success("Notebook created successfully!", {
        id: "create-notebook",
      });
      utils.notebookRouter.getNotebooks.invalidate();
      // Reset form
      setName("");
      setDescription("");
      setImage(null);
      setImagePreview(null);
      setErrors({});
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create notebook", {
        id: "create-notebook",
      });
    },
  });

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith("image/")) {
      return "Please upload an image file (PNG, JPG, GIF)";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
    }
    return null;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        setErrors((prev) => ({ ...prev, image: error }));
        return;
      }
      setErrors((prev) => ({ ...prev, image: undefined }));
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        setErrors((prev) => ({ ...prev, image: error }));
        return;
      }
      setErrors((prev) => ({ ...prev, image: undefined }));
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_NAME_LENGTH) {
      setName(value);
      setErrors((prev) => ({ ...prev, name: undefined }));
    } else {
      setErrors((prev) => ({
        ...prev,
        name: `Name must be ${MAX_NAME_LENGTH} characters or less`,
      }));
    }
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(value);
      setErrors((prev) => ({ ...prev, description: undefined }));
    } else {
      setErrors((prev) => ({
        ...prev,
        description: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`,
      }));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (!reader.result || typeof reader.result !== "string") {
          reject(new Error("Failed to read file"));
          return;
        }
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: typeof errors = {};
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }
    if (name.length > MAX_NAME_LENGTH) {
      newErrors.name = `Name must be ${MAX_NAME_LENGTH} characters or less`;
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`;
    }
    if (image) {
      const imageError = validateFile(image);
      if (imageError) {
        newErrors.image = imageError;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    toast.loading("Creating notebook...", { id: "create-notebook" });

    try {
      const payload: {
        name: string;
        description?: string;
        imageBase64?: string;
        imageType?: string;
      } = {
        name: name.trim(),
      };

      if (description.trim()) {
        payload.description = description.trim();
      }

      if (image) {
        // Convert File to base64
        const base64 = await fileToBase64(image);
        payload.imageBase64 = base64;
        payload.imageType = image.type;
      }

      await createNotebook.mutateAsync(payload);
      // Success is handled by onSuccess callback
    } catch {
      // Error is handled by onError callback
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName("");
      setDescription("");
      setImage(null);
      setImagePreview(null);
      setErrors({});
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">
                Create New Notebook
              </DialogTitle>
              <DialogDescription className="mt-1">
                Start organizing your knowledge with a new AI-powered notebook
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="name" className="text-sm font-medium">
                Notebook Name <span className="text-destructive">*</span>
              </Label>
              <span className="text-muted-foreground text-xs">
                {name.length}/{MAX_NAME_LENGTH}
              </span>
            </div>
            <Input
              id="name"
              placeholder="e.g., Research Notes, Project Ideas, Learning Journal"
              value={name}
              onChange={handleNameChange}
              required
              disabled={isSubmitting}
              className="h-11"
              maxLength={MAX_NAME_LENGTH}
            />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description" className="text-sm font-medium">
                Description{" "}
                <span className="text-muted-foreground text-xs">
                  (optional)
                </span>
              </Label>
              <span className="text-muted-foreground text-xs">
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </span>
            </div>
            <Textarea
              id="description"
              placeholder="Add a brief description to help you remember what this notebook is for..."
              value={description}
              onChange={handleDescriptionChange}
              rows={4}
              disabled={isSubmitting}
              className="resize-none"
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            {errors.description && (
              <p className="text-destructive text-xs">{errors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Cover Image{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            {imagePreview ? (
              <div className="group relative">
                <div className="border-border bg-muted/30 relative h-48 w-full overflow-hidden rounded-xl border-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={handleRemoveImage}
                      disabled={isSubmitting}
                      className="cursor-pointer rounded-full"
                    >
                      <X className="h-4 w-4 cursor-pointer" />
                    </Button>
                  </div>
                </div>
                <p className="text-muted-foreground mt-2 text-center text-xs">
                  Click the image to remove
                </p>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "relative rounded-xl border-2 border-dashed p-8 transition-all",
                  isDragging
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-muted-foreground/40 hover:border-primary/50 bg-muted/20",
                  isSubmitting && "cursor-not-allowed opacity-50"
                )}
              >
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isSubmitting}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                    <Upload className="text-primary h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Drop an image here or click to upload
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      PNG, JPG, GIF up to {MAX_FILE_SIZE / (1024 * 1024)}MB
                    </p>
                    {errors.image && (
                      <p className="text-destructive mt-2 text-xs">
                        {errors.image}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full cursor-pointer sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full cursor-pointer bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Notebook
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
