import { BrowserWindow, app, screen } from 'electron';
import path from 'node:path';
import { getHomeWorkArea } from './displayBounds';

const PRELOAD_PATH = path.join(__dirname, '../preload/index.js');
const RENDERER_DEV_URL = process.env.VITE_DEV_SERVER_URL;
const RENDERER_HTML_PATH = path.join(__dirname, '../renderer/index.html');

export class PetWindowManager {
  private window: BrowserWindow | null = null;

  create(): BrowserWindow {
    const workArea = getHomeWorkArea();
    const displayId = screen.getDisplayMatching(workArea).id;

    const window = new BrowserWindow({
      x: workArea.x,
      y: workArea.y,
      width: workArea.width,
      height: workArea.height,
      transparent: true,
      backgroundColor: '#00000000',
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      focusable: true,
      webPreferences: {
        backgroundThrottling: false,
        preload: PRELOAD_PATH,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    window.setAlwaysOnTop(true, 'screen-saver');
    window.setIgnoreMouseEvents(true, { forward: true });
    const onDisplayChange = () => {
      const display = screen.getAllDisplays().find((item) => item.id === displayId) ?? screen.getPrimaryDisplay();
      if (!window.isDestroyed()) window.setBounds(display.workArea);
    };
    screen.on('display-metrics-changed', onDisplayChange);
    screen.on('display-removed', onDisplayChange);
    window.once('closed', () => {
      screen.removeListener('display-metrics-changed', onDisplayChange);
      screen.removeListener('display-removed', onDisplayChange);
    });

    if (process.platform === 'darwin') {
      window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      app.dock?.hide();
    }

    if (RENDERER_DEV_URL) {
      void window.loadURL(RENDERER_DEV_URL);
    } else {
      void window.loadFile(RENDERER_HTML_PATH);
    }

    this.window = window;
    return window;
  }

  getWindow(): BrowserWindow {
    if (!this.window) throw new Error('PetWindowManager: window not created yet');
    return this.window;
  }

  setClickThrough(ignore: boolean): void {
    this.window?.setIgnoreMouseEvents(ignore, { forward: true });
  }

  toggleVisibility(): boolean {
    if (!this.window) return false;
    const next = !this.window.isVisible();
    if (next) this.window.show();
    else this.window.hide();
    return next;
  }

  isVisible(): boolean {
    return this.window?.isVisible() ?? false;
  }
}
