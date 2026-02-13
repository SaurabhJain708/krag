"use client";

import { useState, useMemo } from "react";
import { Plus, Settings, User, LayoutGrid, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import NotebookCard from "./notebookCard";
import CreateNotebookCard from "./createNotebookCard";
import CreateNotebookModal from "./createNotebookModal";
import type { ViewType } from "@/app/(protected)/notebooks/types";
import { trpc } from "@/server/trpc/react";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function NotebooksPage() {
  const [view, setView] = useState<ViewType>("grid");
  const [sortBy, setSortBy] = useState("recent");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: notebooks = [], isLoading } =
    trpc.notebookRouter.getNotebooks.useQuery();

  // Transform and sort notebooks based on selected filter
  const sortedNotebooks = useMemo(() => {
    const transformedNotebooks = notebooks.map((notebook) => ({
      id: notebook.id,
      name: notebook.name,
      description: notebook.description ?? undefined,
      createdAt: notebook.createdAt,
      sourceCount: notebook._count.sources,
      image: notebook.image ?? undefined,
      encryption: notebook.encryption,
    }));

    switch (sortBy) {
      case "recent":
        return transformedNotebooks.sort((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
      case "oldest":
        return transformedNotebooks.sort((a, b) => {
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
      case "name":
        return transformedNotebooks.sort((a, b) => {
          return a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          });
        });
      default:
        return transformedNotebooks;
    }
  }, [notebooks, sortBy]);

  const router = useRouter();

  const handleSignout = () => {
    signOut().then(() => {
      router.push("/");
    });
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="border-border/40 bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 border-b shadow-sm backdrop-blur-md">
        <div className="container mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="group flex items-center gap-3">
              <Image
                src="/favicon.ico"
                alt="Krag logo"
                width={45}
                height={45}
                className="cursor-pointer transition-transform duration-200 hover:scale-110"
              />
              <div className="flex flex-col">
                <h1 className="cursor-pointer bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent transition-all group-hover:from-blue-700 group-hover:to-purple-700">
                  Krag
                </h1>
                <span className="text-muted-foreground -mt-1 hidden text-[10px] sm:block">
                  Where retrieval meets privacy
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-accent/50 cursor-pointer rounded-lg"
                onClick={() => router.push("/settings")}
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Badge
                variant="secondary"
                className="cursor-pointer border-0 bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-sm transition-all hover:scale-105 hover:shadow-md"
              >
                PRO
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-accent/50 hover:border-primary/20 h-9 w-9 rounded-full border-2 border-transparent transition-all"
                  >
                    <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push("/settings")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push("/settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignout}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        {/* Controls */}
        <div className="mb-6 flex items-center justify-end">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-md border p-1">
              <Button
                variant={view === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setView("grid")}
                className="h-8 w-8"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setView("list")}
                className="h-8 w-8"
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              className="cursor-pointer"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create new
            </Button>
          </div>
        </div>

        {/* All Notebooks */}
        {isLoading ? (
          <div
            className={cn(
              "grid gap-4",
              view === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1"
            )}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "bg-card animate-pulse rounded-xl border shadow-md",
                  view === "list" ? "p-4" : "overflow-hidden"
                )}
              >
                {view === "list" ? (
                  <div className="flex items-center gap-4">
                    <div className="bg-muted h-14 w-14 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="bg-muted h-5 w-3/4 rounded" />
                      <div className="bg-muted h-4 w-full rounded" />
                      <div className="mt-2 flex gap-4">
                        <div className="bg-muted h-3 w-20 rounded" />
                        <div className="bg-muted h-3 w-16 rounded" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-muted h-40 w-full" />
                    <div className="space-y-3 p-5">
                      <div className="bg-muted h-5 w-3/4 rounded" />
                      <div className="bg-muted h-4 w-full rounded" />
                      <div className="bg-muted h-4 w-2/3 rounded" />
                      <div className="mt-4 flex justify-between">
                        <div className="bg-muted h-3 w-20 rounded" />
                        <div className="bg-muted h-3 w-16 rounded" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : sortedNotebooks.length === 0 ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center py-16">
            <div className="flex max-w-md flex-col items-center gap-6 text-center">
              <Image
                src="/favicon.ico"
                alt="Krag logo"
                width={200}
                height={200}
                className="opacity-90"
              />
              <div className="space-y-2">
                <h2 className="text-foreground text-xl font-semibold">
                  No notebooks yet
                </h2>
                <p className="text-muted-foreground text-sm">
                  Create your first notebook to get started
                </p>
              </div>
              <Button
                size="lg"
                className="mt-2 cursor-pointer"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="mr-2 h-5 w-5" />
                Create Notebook
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              view === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1"
            )}
          >
            <CreateNotebookCard
              view={view}
              onClick={() => setIsCreateModalOpen(true)}
            />
            {sortedNotebooks.map((notebook) => (
              <NotebookCard key={notebook.id} notebook={notebook} view={view} />
            ))}
          </div>
        )}
      </div>
      <CreateNotebookModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
