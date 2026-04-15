import type { ArchiveItem, Folder } from "../../../types";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
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
  Folder as FolderIcon,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { flattenFolders } from "../lib";
import TakeLogo from "@/assets/icon.png";

interface FolderSidebarProps {
  folders: Folder[];
  archives: ArchiveItem[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  onOpenCreateDialog: (parentId: string | null) => void;
  onOpenRenameDialog: (folder: Folder) => void;
  onDeleteFolder: (id: string) => void;
}

export function FolderSidebar({
  folders,
  archives,
  selectedFolderId,
  onSelectFolder,
  onOpenCreateDialog,
  onOpenRenameDialog,
  onDeleteFolder,
}: FolderSidebarProps) {
  const flatFolders = flattenFolders(folders);
  const archiveCountFor = (folderId: string) =>
    archives.filter((a) => (a.folderId ?? null) === folderId).length;

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="flex flex-row items-center border-b border-border px-4 py-4 font-bold text-base">
        <img src={TakeLogo} alt="Take" className="size-5" />
        Take
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={selectedFolderId === null}
                  onClick={() => onSelectFolder(null)}
                >
                  <FolderOpen className="size-3.5 text-muted-foreground" />
                  <span className="text-xs">All Archives</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{archives.length}</SidebarMenuBadge>
              </SidebarMenuItem>

              {flatFolders.map(({ folder, depth }) => (
                <SidebarMenuItem
                  key={folder.id}
                  style={{ paddingLeft: `${depth * 12}px` }}
                >
                  <SidebarMenuButton
                    isActive={selectedFolderId === folder.id}
                    onClick={() => onSelectFolder(folder.id)}
                  >
                    <FolderIcon className="size-3.5 text-muted-foreground" />
                    <span className="text-xs">{folder.name}</span>
                  </SidebarMenuButton>

                  <SidebarMenuBadge className="group-hover/menu-item:opacity-0">
                    {archiveCountFor(folder.id)}
                  </SidebarMenuBadge>

                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuAction showOnHover asChild>
                          <DropdownMenuTrigger>
                            <MoreHorizontal className="size-3.5" />
                          </DropdownMenuTrigger>
                        </SidebarMenuAction>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        Folder actions
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent
                      side="right"
                      align="start"
                      className="text-xs w-40"
                    >
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCreateDialog(folder.id);
                        }}
                      >
                        <Plus className="size-3.5 mr-2" />
                        Add subfolder
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenRenameDialog(folder);
                        }}
                      >
                        <Pencil className="size-3.5 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFolder(folder.id);
                        }}
                      >
                        <Trash2 className="size-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2 bottom-0">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground text-xs"
          onClick={() => onOpenCreateDialog(null)}
        >
          <Plus className="size-3.5" />
          New Folder
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
