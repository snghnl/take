import type { ArchiveItem, Folder } from "../../../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarInset, useSidebar } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FolderOpen,
  Plus,
  Trash2,
  MoreHorizontal,
  Search,
  ExternalLink,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { flattenFolders, formatDate } from "../lib";

interface ArchiveListProps {
  archives: ArchiveItem[];
  folders: Folder[];
  selectedFolderId: string | null;
  currentFolderName: string;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenCreateDialog: (parentId: string | null) => void;
  onMoveArchive: (archiveId: string, folderId: string | null) => void;
  onDeleteArchive: (id: string) => void;
}

function SidebarToggle() {
  const { toggleSidebar, open } = useSidebar();
  return (
    <Button onClick={toggleSidebar} variant="ghost">
      {open ? <ChevronsLeft /> : <ChevronsRight />}
    </Button>
  );
}

export function ArchiveList({
  archives,
  folders,
  selectedFolderId,
  currentFolderName,
  search,
  onSearchChange,
  onOpenCreateDialog,
  onMoveArchive,
  onDeleteArchive,
}: ArchiveListProps) {
  const flatFolders = flattenFolders(folders);

  return (
    <SidebarInset className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border shrink-0">
        <SidebarToggle />
        <span className="font-semibold">{currentFolderName}</span>
        <Badge variant="secondary">{archives.length}</Badge>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 w-52 text-xs"
            placeholder="Search archives..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {selectedFolderId !== null && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => onOpenCreateDialog(selectedFolderId)}
          >
            <Plus className="size-3.5" />
            New Subfolder
          </Button>
        )}
      </div>

      {/* Archive list */}
      <ScrollArea className="flex-1">
        {archives.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs gap-1.5">
            <FolderOpen className="size-8 opacity-30" />
            <span>No archives here</span>
          </div>
        ) : (
          <div className="p-3 flex flex-col gap-1">
            {archives.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-accent/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-primary hover:underline truncate"
                    title={item.title}
                  >
                    <span className="truncate">{item.title || item.url}</span>
                    <ExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </a>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {item.url}
                  </p>
                </div>

                <span className="text-[11px] text-muted-foreground shrink-0">
                  {formatDate(item.date)}
                </span>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="size-6 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="top">Move to</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end" className="text-xs w-44">
                      <DropdownMenuItem
                        onClick={() => onMoveArchive(item.id, null)}
                        className={!item.folderId ? "font-medium" : ""}
                      >
                        No folder (root)
                      </DropdownMenuItem>
                      {folders.length > 0 && <DropdownMenuSeparator />}
                      {flatFolders.map(({ folder, depth }) => (
                        <DropdownMenuItem
                          key={folder.id}
                          onClick={() => onMoveArchive(item.id, folder.id)}
                          className={item.folderId === folder.id ? "font-medium" : ""}
                          style={{ paddingLeft: `${8 + depth * 12}px` }}
                        >
                          {folder.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="size-6 text-muted-foreground hover:text-destructive"
                        onClick={() => onDeleteArchive(item.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Delete</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </SidebarInset>
  );
}
