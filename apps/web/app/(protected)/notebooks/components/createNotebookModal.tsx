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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    if (file && file.type.startsWith("image/")) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement API call to create notebook
      console.log("Creating notebook:", { name, description, image });

      // Reset form
      setName("");
      setDescription("");
      setImage(null);
      setImagePreview(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating notebook:", error);
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
            <Label htmlFor="name" className="text-sm font-medium">
              Notebook Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Research Notes, Project Ideas, Learning Journal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Add a brief description to help you remember what this notebook is for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={isSubmitting}
              className="resize-none"
            />
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
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={handleRemoveImage}
                      disabled={isSubmitting}
                      className="rounded-full"
                    >
                      <X className="h-4 w-4" />
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
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 sm:w-auto"
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
