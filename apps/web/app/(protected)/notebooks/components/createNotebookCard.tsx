import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import type { ViewType } from "@/app/(protected)/notebooks/types";

export default function CreateNotebookCard({
  view,
  onClick,
}: {
  view: ViewType;
  onClick: () => void;
}) {
  if (view === "list") {
    return (
      <Card
        onClick={onClick}
        className="border-muted-foreground/40 hover:border-primary/50 bg-muted/30 cursor-pointer border-2 border-dashed transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div className="border-muted-foreground/40 hover:border-primary/50 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-dashed transition-colors">
            <Plus className="text-muted-foreground group-hover:text-primary h-7 w-7 transition-colors" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Create new notebook</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Start a new AI-powered notebook
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      className="border-muted-foreground/40 hover:border-primary/50 from-muted/50 to-muted/30 group flex h-full cursor-pointer items-center justify-center border-2 border-dashed bg-linear-to-br transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
    >
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="border-muted-foreground/40 group-hover:border-primary/50 mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 group-hover:scale-110">
          <Plus className="text-muted-foreground group-hover:text-primary h-10 w-10 transition-colors" />
        </div>
        <h3 className="group-hover:text-primary mb-2 text-base font-semibold transition-colors">
          Create new notebook
        </h3>
        <p className="text-muted-foreground text-sm">
          Start a new AI-powered notebook
        </p>
      </CardContent>
    </Card>
  );
}
