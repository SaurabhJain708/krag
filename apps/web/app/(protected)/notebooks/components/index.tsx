import { useState, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Settings,
  User,
  LayoutGrid,
  LayoutList,
} from "lucide-react";
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
import type { Notebook, ViewType } from "@/app/(protected)/notebooks/types";

// Mock data - all notebooks
const allNotebooks: Notebook[] = [
  {
    id: "1",
    name: "How to Build a Life, from The Atlantic",
    description: "A comprehensive guide to living well",
    createdAt: new Date("2025-04-23"),
    sourceCount: 46,
  },
  {
    id: "2",
    name: "The science fan's guide to visiting...",
    description: "Exploring scientific destinations",
    createdAt: new Date("2025-05-12"),
    sourceCount: 17,
  },
  {
    id: "3",
    name: "Trends in health, wealth and happiness",
    description: "Understanding modern life patterns",
    createdAt: new Date("2025-04-15"),
    sourceCount: 24,
  },
  {
    id: "4",
    name: "Introduction to NotebookLM",
    description: "Getting started with your AI notebook",
    createdAt: new Date("2023-12-06"),
    sourceCount: 27,
  },
  {
    id: "5",
    name: "Archive 1945",
    description: "Historical documents and analysis",
    createdAt: new Date("2025-09-29"),
    sourceCount: 27,
  },
  {
    id: "6",
    name: "Uber Technologies 2021 Annual Report...",
    description: "Financial analysis and insights",
    createdAt: new Date("2026-01-17"),
    sourceCount: 1,
  },
  {
    id: "7",
    name: "Austrian Liability Law: Railway and Motor...",
    description: "Legal research and case studies",
    createdAt: new Date("2026-01-05"),
    sourceCount: 1,
  },
  {
    id: "8",
    name: "Untitled notebook",
    description: "",
    createdAt: new Date("2026-01-05"),
    sourceCount: 0,
  },
  {
    id: "9",
    name: "voestalpine AG: Enterprise Data and...",
    description: "Business intelligence report",
    createdAt: new Date("2025-11-27"),
    sourceCount: 1,
  },
];

export default function NotebooksPage() {
  const [view, setView] = useState<ViewType>("grid");
  const [sortBy, setSortBy] = useState("recent");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Sort notebooks based on selected filter
  const sortedNotebooks = useMemo(() => {
    const notebooks = [...allNotebooks];

    switch (sortBy) {
      case "recent":
        return notebooks.sort((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
      case "oldest":
        return notebooks.sort((a, b) => {
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
      case "name":
        return notebooks.sort((a, b) => {
          return a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          });
        });
      default:
        return notebooks;
    }
  }, [sortBy]);

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="border-border/40 bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 border-b shadow-sm backdrop-blur-md">
        <div className="container mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="group flex items-center gap-3">
              <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-linear-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="cursor-pointer bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-xl font-bold text-transparent transition-all group-hover:from-blue-700 group-hover:to-purple-700">
                  Krag
                </h1>
                <span className="text-muted-foreground -mt-1 hidden text-[10px] sm:block">
                  AI Notebook
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-accent/50 rounded-lg"
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
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
      </div>
      <CreateNotebookModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
