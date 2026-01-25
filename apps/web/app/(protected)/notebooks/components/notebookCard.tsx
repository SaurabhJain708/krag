import { format } from "date-fns";
import { BookOpen, Calendar, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  type Notebook,
  type ViewType,
} from "@/app/(protected)/notebooks/types";

function getGradientForNotebook(id: string) {
  const gradients = [
    "from-blue-500 via-purple-500 to-pink-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-orange-500 via-red-500 to-rose-500",
    "from-violet-500 via-purple-500 to-indigo-500",
    "from-amber-500 via-orange-500 to-red-500",
    "from-green-500 via-emerald-500 to-teal-500",
    "from-pink-500 via-rose-500 to-red-500",
    "from-indigo-500 via-blue-500 to-cyan-500",
    "from-yellow-500 via-amber-500 to-orange-500",
  ];
  const index = parseInt(id) % gradients.length;
  return gradients[index] || gradients[0];
}

// Generate icon gradient for list view
function getIconGradientForNotebook(id: string) {
  const gradients = [
    "from-blue-500 to-purple-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-violet-500 to-indigo-600",
    "from-amber-500 to-orange-600",
    "from-green-500 to-emerald-600",
    "from-pink-500 to-rose-600",
    "from-indigo-500 to-blue-600",
    "from-yellow-500 to-amber-600",
  ];
  const index = parseInt(id) % gradients.length;
  return gradients[index] || gradients[0];
}

export default function NotebookCard({
  notebook,
  view = "grid",
}: {
  notebook: Notebook;
  view?: ViewType;
}) {
  const iconGradient = getIconGradientForNotebook(notebook.id);
  const cardGradient = getGradientForNotebook(notebook.id);

  if (view === "list") {
    return (
      <Card className="cursor-pointer border-0 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg">
        <CardContent className="flex items-center gap-4 p-4">
          <div
            className={`h-14 w-14 shrink-0 rounded-xl bg-linear-to-br ${iconGradient} flex items-center justify-center shadow-md`}
          >
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="group-hover:text-primary truncate text-base font-semibold transition-colors">
              {notebook.name}
            </h3>
            {notebook.description && (
              <p className="text-muted-foreground mt-1 truncate text-sm">
                {notebook.description}
              </p>
            )}
            <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(notebook.createdAt, "d MMM yyyy")}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {notebook.sourceCount}{" "}
                {notebook.sourceCount === 1 ? "source" : "sources"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group flex h-full cursor-pointer flex-col gap-0 overflow-hidden rounded-xl border p-0 shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
      <CardContent className="flex h-full flex-col p-0">
        <div
          className={`relative h-40 overflow-hidden rounded-t-xl ${
            notebook.image ? "" : `bg-linear-to-br ${cardGradient}`
          }`}
        >
          {notebook.image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={notebook.image}
                alt={notebook.name}
                className="h-full w-full object-cover"
              />
              {/* Dark overlay for better text contrast */}
              <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent"></div>
            </>
          ) : (
            <>
              {/* Notebook Icon */}
              <div
                className={`absolute top-4 left-4 h-12 w-12 rounded-xl bg-linear-to-br ${iconGradient} z-10 flex items-center justify-center shadow-lg`}
              >
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              {/* Gradient overlay with pattern */}
              <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent"></div>
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                  backgroundSize: "24px 24px",
                }}
              ></div>
              {/* Decorative circles */}
              <div className="absolute top-4 right-4 h-20 w-20 rounded-full bg-white/10 blur-xl"></div>
              <div className="absolute bottom-4 left-4 h-16 w-16 rounded-full bg-white/10 blur-lg"></div>
            </>
          )}
        </div>
        <div className="bg-card flex flex-1 flex-col p-5">
          <h3 className="group-hover:text-primary mb-2 line-clamp-2 text-base font-semibold transition-colors">
            {notebook.name}
          </h3>
          {notebook.description && (
            <p className="text-muted-foreground mb-4 line-clamp-2 flex-1 text-sm">
              {notebook.description}
            </p>
          )}
          <div className="text-muted-foreground mt-auto flex items-center justify-between border-t pt-3 text-xs">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {format(notebook.createdAt, "d MMM yyyy")}
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {notebook.sourceCount}{" "}
              {notebook.sourceCount === 1 ? "source" : "sources"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
