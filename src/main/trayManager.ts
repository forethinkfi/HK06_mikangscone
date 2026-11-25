import { app, Menu, Tray, nativeImage, shell } from 'electron';
import { getLocalSpeciesRoot } from './speciesLoader';
import path from 'node:path';
import type { SpeciesListing } from './speciesLoader';
import type { SceneCommand } from '../shared/ipcContract';

/**
 * build-resources/ is only used by electron-builder's own icon config at
 * build time by default — it is NOT bundled into a packaged app's
 * resources unless explicitly listed (see electron-builder.yml's
 * extraResources), so this can't just use a path relative to __dirname
 * the way dev mode happens to get away with (dist/ and build-resources/
 * are siblings in the repo, but not in a packaged app's layout).
 */
function getBuildResourcesRoot(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'build-resources')
    : path.join(app.getAppPath(), 'build-resources');
}

export class TrayManager {
  private tray: Tray | null = null;
  private rebuildMenu?: () => void;

  create(options: {
    onToggleVisibility: () => void;
    isVisible: () => boolean;
    onQuit: () => void;
    listSpecies: () => SpeciesListing[];
    isSpeciesDismissed: (id: string) => boolean;
    getSelectedSpeciesId: () => string;
    onSelectSpecies: (id: string) => void;
    onSceneCommand: (command: SceneCommand) => void;
  }): Tray {
    const iconPath = path.join(getBuildResourcesRoot(), 'tray-icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    tray.setToolTip('PCpet · 데스크톱 친구들');

    const rebuildMenu = () => {
      const selectedId = options.getSelectedSpeciesId();
      const speciesSubmenu = options.listSpecies().map((species) => ({
        label: `${species.displayName} (${species.source})${options.isSpeciesDismissed(species.id) ? ' · 불러오기' : ''}`,
        type: 'radio' as const,
        checked: species.id === selectedId,
        click: () => options.onSelectSpecies(species.id),
      }));

      const menu = Menu.buildFromTemplate([
        {
          label: options.isVisible() ? '펫 숨기기' : '펫 보이기',
          click: () => {
            options.onToggleVisibility();
            rebuildMenu();
          },
        },
        { type: 'separator' },
        {
          label: '주인공 바꾸기',
          submenu:
            speciesSubmenu.length > 0
              ? speciesSubmenu
              : [{ label: 'No species found', enabled: false }],
        },
        { type: 'separator' },
        { label: '지금 대화하기', click: () => options.onSceneCommand('demo') },
        { label: '말풍선 끄기 / 켜기', click: () => options.onSceneCommand('quiet') },
        { label: '이미지·대사 폴더 열기', click: () => { void shell.openPath(getLocalSpeciesRoot()); } },
        { label: `About Window Pet (v${app.getVersion()})`, enabled: false },
        { label: '종료', click: () => options.onQuit() },
      ]);
      tray.setContextMenu(menu);
    };

    rebuildMenu();
    this.rebuildMenu = rebuildMenu;
    this.tray = tray;
    return tray;
  }

  refresh() { this.rebuildMenu?.(); }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
    this.rebuildMenu = undefined;
  }
}
