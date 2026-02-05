"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Home, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState() {
  const router = useRouter();

  return (
    <div className="bg-muted/20 flex h-screen flex-col overflow-hidden">
      <header className="bg-background/80 border-border/50 z-10 flex shrink-0 flex-col border-b px-4 py-2 shadow-sm backdrop-blur-sm sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-gray-800 to-gray-900 shadow-md">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-foreground text-sm leading-tight font-semibold sm:text-base">
              Notebook not found
            </h1>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-0 sm:flex-nowrap">
          <Button
            variant="ghost"
            size="sm"
            className="text-foreground hover:bg-muted/80 h-8 cursor-pointer rounded-lg px-2.5 text-xs transition-colors sm:h-9 sm:px-3 sm:text-sm"
            onClick={() => router.push("/notebooks")}
          >
            <Home className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
            <span className="xs:inline hidden sm:inline">Home</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
            <AlertCircle className="text-destructive h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-foreground text-lg font-semibold">
              Notebook not found
            </h2>
            <p className="text-muted-foreground text-sm">
              The notebook you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have permission to access it.
            </p>
          </div>
          <Button
            className="mt-4 cursor-pointer"
            onClick={() => router.push("/notebooks")}
          >
            <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
            Back to Notebooks
          </Button>
        </div>
      </div>
    </div>
  );
}
