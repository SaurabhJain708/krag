"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Settings, Home, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  notebookName?: string;
  isLoadingNotebook: boolean;
  sourceCount: number;
  isLoadingSources: boolean;
  onSignOut: () => void;
}

export function Header({
  notebookName,
  isLoadingNotebook,
  sourceCount,
  isLoadingSources,
  onSignOut,
}: HeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-background/80 border-border/50 z-10 flex shrink-0 flex-col border-b px-4 py-2 shadow-sm backdrop-blur-sm sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-0">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-gray-800 to-gray-900 shadow-md">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-foreground text-sm leading-tight font-semibold sm:text-base">
            {isLoadingNotebook
              ? "Loading..."
              : notebookName || "Untitled notebook"}
          </h1>
          <p className="text-muted-foreground text-[11px] sm:text-xs">
            {isLoadingSources ? "Loading..." : `${sourceCount} sources`}
          </p>
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
        <div className="bg-border mx-1 hidden h-6 w-px sm:block" />
        <Button
          variant="ghost"
          size="sm"
          className="text-foreground hover:bg-muted/80 h-8 cursor-pointer rounded-lg px-2.5 text-xs transition-colors sm:h-9 sm:px-3 sm:text-sm"
          onClick={() => router.push("/settings")}
        >
          <Settings className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
          <span className="xs:inline hidden sm:inline">Settings</span>
        </Button>
        <div className="bg-border mx-1 hidden h-6 w-px sm:block" />
        <Badge
          variant="secondary"
          className="cursor-pointer rounded-lg border-0 bg-linear-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase shadow-sm transition-all hover:shadow-md sm:px-2.5 sm:py-1 sm:text-xs"
        >
          PRO
        </Badge>
        <div className="bg-border mx-1 hidden h-6 w-px sm:block" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-muted/80 h-9 w-9 cursor-pointer rounded-full p-0 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-gray-800 to-gray-900 shadow-sm">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/settings")}
              className="cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onSignOut}
              className="text-destructive cursor-pointer"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
