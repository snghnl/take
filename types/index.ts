export interface HLData {
  id: string;
  text: string;
  bg: string;
  colorName: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface ArchiveItem {
  id: string;
  url: string;
  title: string;
  textContent: string;
  date: string;
  folderId?: string | null;
}
