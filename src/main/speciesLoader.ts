import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { isSpeciesConfig, type SpeciesConfig } from '../shared/speciesSchema';

export const ASSET_PROTOCOL = 'pet-asset';

export type SpeciesSource = 'bundled' | 'local';

export interface SpeciesListing {
  id: string;
  displayName: string;
  source: SpeciesSource;
}

/** Repo-tracked species, shipped with the app. */
export function getBundledSpeciesRoot(): string {
  // Dev: assets/ lives at the project root. Packaged: electron-builder copies it
  // next to resources (see electron-builder.yml extraResources).
  const assetsRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(app.getAppPath(), 'assets');
  return path.join(assetsRoot, 'species');
}

/**
 * User-imported species, entirely outside the git repo (this directory
 * has no relationship to the project checkout at all, unlike a
 * .gitignore'd folder inside it) — the sanctioned place for personal art
 * that should never be uploaded. See docs/setup.md.
 */
export function getLocalSpeciesRoot(): string {
  return process.env.PET_LOCAL_SPECIES_ROOT ?? path.join(app.getPath('userData'), 'species');
}

/** Call once at startup so the local species folder exists to drop files into. */
export function ensureLocalSpeciesRoot(): void {
  fs.mkdirSync(getLocalSpeciesRoot(), { recursive: true });
}

function listSpeciesInRoot(root: string, source: SpeciesSource): SpeciesListing[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const listings: SpeciesListing[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const configPath = path.join(root, entry.name, 'species.json');
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(configPath, 'utf-8').replace(/^\uFEFF/, ''));
      if (isSpeciesConfig(parsed)) {
        listings.push({ id: parsed.id, displayName: parsed.displayName, source });
      }
    } catch {
      // Not a valid species folder — skip it silently rather than crash the tray.
    }
  }
  return listings;
}

/** Bundled + local species, local-overrides-bundled on a matching id. */
export function listAvailableSpecies(): SpeciesListing[] {
  const bundled = listSpeciesInRoot(getBundledSpeciesRoot(), 'bundled');
  const local = listSpeciesInRoot(getLocalSpeciesRoot(), 'local');

  const byId = new Map<string, SpeciesListing>();
  for (const listing of bundled) byId.set(listing.id, listing);
  for (const listing of local) byId.set(listing.id, listing); // local wins
  return [...byId.values()];
}

function findSpeciesDir(id: string): { dir: string; source: SpeciesSource } {
  const localDir = path.join(getLocalSpeciesRoot(), id);
  if (fs.existsSync(path.join(localDir, 'species.json'))) {
    return { dir: localDir, source: 'local' };
  }
  const bundledDir = path.join(getBundledSpeciesRoot(), id);
  return { dir: bundledDir, source: 'bundled' };
}

const WATCH_DEBOUNCE_MS = 300;

/**
 * Watches a loaded species' own directory (recursively, so sprite edits
 * under sprites/ are caught too) and calls onChange (debounced — editors
 * often fire several fs events per save) whenever anything in it changes.
 * Returns an unwatch function. Directory-level (not per-file) watching
 * specifically so it survives editors that save via replace-the-file
 * rather than in-place write, which can silently orphan a watch on the
 * old file handle.
 *
 * Node's recursive fs.watch is only supported on macOS/Windows — fine for
 * now given this project is only verified on Windows (see docs/bugs.md),
 * but a Linux dev would need per-subdirectory watches instead.
 */
export function watchSpecies(id: string, onChange: () => void): () => void {
  const { dir } = findSpeciesDir(id);
  let debounceTimer: NodeJS.Timeout | null = null;

  const watcher = fs.watch(dir, { recursive: true }, () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onChange, WATCH_DEBOUNCE_MS);
  });

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    watcher.close();
  };
}

/**
 * Loads <root>/<id>/species.json (local root takes precedence over
 * bundled on a matching id), validates it, and resolves each animation's
 * sprite-sheet path to a pet-asset:// URL the renderer can load directly.
 */
export function loadSpecies(id: string): SpeciesConfig {
  const { dir, source } = findSpeciesDir(id);
  const configPath = path.join(dir, 'species.json');

  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed: unknown = JSON.parse(raw.replace(/^\uFEFF/, ''));

  if (!isSpeciesConfig(parsed)) {
    throw new Error(`Invalid species config at ${configPath}`);
  }

  // Cache-busting query param: without it, re-loading the same species
  // (see watchSpecies) would produce byte-identical sheet URLs, and an
  // <img> whose src is set to the exact same string again doesn't
  // re-fetch — the renderer would keep showing the pre-edit sprite. The
  // query string is otherwise ignored (assetProtocol.ts resolves purely
  // from the URL's host+pathname).
  const cacheBust = Date.now();
  const assetUrl = (sheet: string) => `${ASSET_PROTOCOL}://${source}/${id}/${sheet}?v=${cacheBust}`;
  const resolveSheets = <T extends SpeciesConfig['animations'] | SpeciesConfig['motions']>(definitions: T): T => {
    if (!definitions) return definitions;
    return Object.fromEntries(Object.entries(definitions).map(([key, def]) => [
      key, { ...def, sheet: assetUrl(def.sheet), leftSheet: def.leftSheet && assetUrl(def.leftSheet) },
    ])) as T;
  };

  const resolved: SpeciesConfig = {
    ...parsed,
    animations: resolveSheets(parsed.animations),
    motions: resolveSheets(parsed.motions),
    fishingToy: parsed.fishingToy && { handle: assetUrl(parsed.fishingToy.handle), fish: assetUrl(parsed.fishingToy.fish) },
  };

  const dialoguePath = path.join(dir, 'dialogue.json');
  if (fs.existsSync(dialoguePath)) {
    const dialogue = JSON.parse(fs.readFileSync(dialoguePath, 'utf8'));
    if (Array.isArray(dialogue?.solo) && dialogue.solo.every((line: unknown) => typeof line === 'string') &&
        Array.isArray(dialogue.dialogues) && dialogue.dialogues.every((pair: unknown) =>
          Array.isArray(pair) && pair.length === 2 && pair.every((line) => typeof line === 'string'))) {
      resolved.dialogue = dialogue;
    }
  }
  return resolved;
}
