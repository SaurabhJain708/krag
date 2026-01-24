export type ViewType = "grid" | "list";

export interface Notebook {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  sourceCount: number;
}
