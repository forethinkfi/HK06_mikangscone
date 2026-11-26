import type { PetAPI } from '../shared/ipcContract';

declare global {
  interface Window {
    MemoDrop: { files(transfer: DataTransfer | null): File[]; accepts(transfer: DataTransfer | null): boolean; content(transfer: DataTransfer): { imageUrl: string; text: string } };
    petAPI: PetAPI;
  }
}

export {};
