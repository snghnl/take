import { useState, useEffect } from "react";
import type { ArchiveItem, Folder } from "../../types";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FolderSidebar } from "./components/FolderSidebar";
import { ArchiveList } from "./components/ArchiveList";
import { FolderDialog } from "./components/FolderDialog";
import type { DialogMode } from "./lib";

export default function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [archives, setArchives] = useState<ArchiveItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const [dialogName, setDialogName] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [fRes, aRes] = await Promise.all([
      browser.runtime.sendMessage({ type: "GET_FOLDERS" }),
      browser.runtime.sendMessage({ type: "GET_ARCHIVES" }),
    ]);
    setFolders(fRes?.folders ?? []);
    setArchives(aRes?.archives ?? []);
  }

  async function handleCreateFolder() {
    const name = dialogName.trim();
    if (!name) return;
    const parentId = dialog?.type === "create-folder" ? dialog.parentId : null;
    const res = await browser.runtime.sendMessage({ type: "CREATE_FOLDER", name, parentId });
    if (!res?.ok) {
      setDialogError(res?.error ?? "Failed to create folder.");
      return;
    }
    closeDialog();
    await loadData();
  }

  async function handleRenameFolder() {
    const name = dialogName.trim();
    if (!name || dialog?.type !== "rename-folder") return;
    const res = await browser.runtime.sendMessage({ type: "RENAME_FOLDER", id: dialog.folder.id, name });
    if (!res?.ok) {
      setDialogError(res?.error ?? "Failed to rename folder.");
      return;
    }
    closeDialog();
    await loadData();
  }

  async function handleDeleteFolder(id: string) {
    const toDelete = new Set<string>();
    const collect = (fid: string) => {
      toDelete.add(fid);
      folders.filter((f) => f.parentId === fid).forEach((f) => collect(f.id));
    };
    collect(id);
    if (selectedFolderId && toDelete.has(selectedFolderId)) setSelectedFolderId(null);
    await browser.runtime.sendMessage({ type: "DELETE_FOLDER", id });
    await loadData();
  }

  async function handleMoveArchive(archiveId: string, folderId: string | null) {
    await browser.runtime.sendMessage({ type: "MOVE_ARCHIVE", id: archiveId, folderId });
    await loadData();
  }

  async function handleDeleteArchive(id: string) {
    await browser.runtime.sendMessage({ type: "DELETE_ARCHIVE", id });
    await loadData();
  }

  function openCreateDialog(parentId: string | null) {
    setDialogName("");
    setDialogError(null);
    setDialog({ type: "create-folder", parentId });
  }

  function openRenameDialog(folder: Folder) {
    setDialogName(folder.name);
    setDialogError(null);
    setDialog({ type: "rename-folder", folder });
  }

  function closeDialog() {
    setDialog(null);
    setDialogName("");
    setDialogError(null);
  }

  function handleDialogSubmit() {
    if (dialog?.type === "create-folder") handleCreateFolder();
    else if (dialog?.type === "rename-folder") handleRenameFolder();
  }

  const visibleArchives = archives.filter((a) => {
    const inFolder =
      selectedFolderId === null ? true : (a.folderId ?? null) === selectedFolderId;
    const matchesSearch =
      search.trim() === "" ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.url.toLowerCase().includes(search.toLowerCase());
    return inFolder && matchesSearch;
  });

  const currentFolderName =
    selectedFolderId === null
      ? "All Archives"
      : (folders.find((f) => f.id === selectedFolderId)?.name ?? "Archives");

  return (
    <TooltipProvider>
      <SidebarProvider>
        <FolderSidebar
          folders={folders}
          archives={archives}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onOpenCreateDialog={openCreateDialog}
          onOpenRenameDialog={openRenameDialog}
          onDeleteFolder={handleDeleteFolder}
        />
        <ArchiveList
          archives={visibleArchives}
          folders={folders}
          selectedFolderId={selectedFolderId}
          currentFolderName={currentFolderName}
          search={search}
          onSearchChange={setSearch}
          onOpenCreateDialog={openCreateDialog}
          onMoveArchive={handleMoveArchive}
          onDeleteArchive={handleDeleteArchive}
        />
        <FolderDialog
          dialog={dialog}
          dialogName={dialogName}
          dialogError={dialogError}
          onNameChange={(name) => { setDialogName(name); setDialogError(null); }}
          onSubmit={handleDialogSubmit}
          onClose={closeDialog}
        />
      </SidebarProvider>
    </TooltipProvider>
  );
}
