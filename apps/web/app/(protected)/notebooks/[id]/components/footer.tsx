"use client";

export function Footer() {
  return (
    <footer className="bg-background/80 border-border/50 z-10 flex h-10 shrink-0 items-center justify-center border-t backdrop-blur-sm">
      <p className="text-muted-foreground/70 text-xs">
        NotebookLM can be inaccurate; please double-check its responses.
      </p>
    </footer>
  );
}
