import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

interface PersistedSettings {
  selectedSpeciesId?: string;
  dismissedSpeciesIds?: string[];
}

export const DEFAULT_SPECIES_ID = 'basic-memoring';

/**
 * Small, generalized settings store — starts with just the selected
 * species id, but the shape is meant to grow (write-through on every
 * `set`, no interval timer, since settings change on discrete user
 * actions, not continuously like playtime).
 */
export class AppSettings {
  private settings: PersistedSettings = {};
  private readonly filePath = path.join(app.getPath('userData'), 'pet-settings.json');

  load(): void {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      this.settings = JSON.parse(raw.replace(/^\uFEFF/, '')) as PersistedSettings;
    } catch {
      this.settings = {}; // first run, or an unreadable/corrupt file
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings));
    } catch {
      // best-effort; settings aren't safety-critical
    }
  }

  getSelectedSpeciesId(): string {
    return this.settings.selectedSpeciesId ?? process.env.PET_DEFAULT_SPECIES_ID ?? DEFAULT_SPECIES_ID;
  }

  setSelectedSpeciesId(id: string): void {
    this.settings.selectedSpeciesId = id;
    this.settings.dismissedSpeciesIds = this.getDismissedSpeciesIds().filter((dismissed) => dismissed !== id);
    this.save();
  }

  getDismissedSpeciesIds(): string[] {
    const ids = this.settings.dismissedSpeciesIds;
    return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
  }

  dismissSpecies(id: string): void {
    this.settings.dismissedSpeciesIds = [...new Set([...this.getDismissedSpeciesIds(), id])];
    this.save();
  }
}
