import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { DialogMode } from "../lib";

interface FolderDialogProps {
  dialog: DialogMode | null;
  dialogName: string;
  dialogError: string | null;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function FolderDialog({
  dialog,
  dialogName,
  dialogError,
  onNameChange,
  onSubmit,
  onClose,
}: FolderDialogProps) {
  const isRename = dialog?.type === "rename-folder";

  return (
    <Dialog
      open={dialog !== null}
      onOpenChange={(open) => { if (!open) onClose(); }}
    >
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{isRename ? "Rename Folder" : "New Folder"}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Folder name"
          value={dialogName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }}
          className={dialogError ? "border-destructive focus-visible:ring-destructive" : ""}
        />
        {dialogError && (
          <p className="text-xs text-destructive">{dialogError}</p>
        )}
        <DialogFooter>
          <Button onClick={onSubmit} disabled={!dialogName.trim()}>
            {isRename ? "Rename" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
