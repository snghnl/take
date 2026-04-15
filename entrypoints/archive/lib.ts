import type { Folder } from "../../types";

export type DialogMode =
  | { type: "create-folder"; parentId: string | null }
  | { type: "rename-folder"; folder: Folder };

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function flattenFolders(
  folders: Folder[],
  parentId: string | null = null,
  depth = 0,
): { folder: Folder; depth: number }[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .flatMap((f) => [
      { folder: f, depth },
      ...flattenFolders(folders, f.id, depth + 1),
    ]);
}
