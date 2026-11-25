import type { PetMenuAction } from '../shared/ipcContract';
import type { Vec2 } from './types';
import { drawMenuIcon, menuIcons } from './petMenuIcons';
import { paperTexture } from './paperTexture';

export class PetQuickMenu {
  private readonly panel = document.createElement('section');
  private anchor: Vec2 = { x: 0, y: 0 };
  private hasToy = false;
  private toyEnabled = false;
  private empty = false;
  private page = 0;

  constructor(private toggleToy: () => void) {
    this.panel.className = 'pet-quick-menu';
    this.panel.style.setProperty('--paper-grain', paperTexture());
    this.panel.hidden = true;
    this.panel.tabIndex = -1;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', '펫 메뉴');
    this.panel.addEventListener('contextmenu', (event) => event.preventDefault());
    this.panel.addEventListener('animationend', (event) => {
      if (event.target === this.panel && event.animationName === 'pet-paper-open') this.panel.classList.remove('is-uncrumpling');
    });
    document.body.append(this.panel);
    document.addEventListener('pointerdown', (event) => {
      if (event.target instanceof Node && !this.panel.contains(event.target)) this.close();
    });
    document.addEventListener('keydown', (event) => {
      if (!this.isOpen || event.key !== 'Escape') return;
      event.preventDefault();
      this.close();
    });
    window.addEventListener('blur', () => this.close());
    window.addEventListener('resize', () => this.place());
  }

  get isOpen() { return !this.panel.hidden; }

  open(anchor: Vec2, hasToy: boolean, toyEnabled: boolean, empty = false) {
    this.anchor = anchor;
    this.hasToy = hasToy;
    this.toyEnabled = toyEnabled;
    this.empty = empty;
    this.panel.hidden = false;
    this.showActions();
    this.panel.classList.remove('is-uncrumpling');
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      void this.panel.offsetWidth;
      this.panel.classList.add('is-uncrumpling');
    }
  }

  close() {
    if (!this.isOpen) return;
    this.page++;
    this.panel.classList.remove('is-uncrumpling');
    this.panel.hidden = true;
  }

  private place() {
    if (!this.isOpen) return;
    const width = this.panel.offsetWidth;
    const height = this.panel.offsetHeight;
    const { x, y } = this.anchor;
    const left = Math.min(Math.max(10, x - width / 2), Math.max(10, window.innerWidth - width - 10));
    const above = y - height - 15;
    const top = Math.min(Math.max(10, above >= 10 ? above : y + 14), Math.max(10, window.innerHeight - height - 10));
    this.panel.style.left = `${left}px`;
    this.panel.style.top = `${top}px`;
    this.panel.style.transformOrigin = `${Math.max(8, Math.min(width - 8, x - left))}px ${y > top ? height : 0}px`;
  }

  private dispatch(action: PetMenuAction) {
    this.close();
    window.petAPI.runPetMenuAction(action);
  }

  private showActions() {
    this.page++;
    const grid = document.createElement('div');
    grid.className = 'pet-action-grid';
    grid.classList.toggle('has-fishing-action', this.hasToy);
    const tile = (icon: keyof typeof menuIcons, label: string, onClick: () => void) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pet-action-tile';
      const caption = document.createElement('span');
      caption.textContent = label;
      button.append(drawMenuIcon(icon), caption);
      button.addEventListener('click', onClick);
      grid.append(button);
      return button;
    };
    if (this.hasToy) tile('fish', this.toyEnabled ? '낚시대 넣기' : '낚시대 꺼내기', () => { this.close(); this.toggleToy(); });
    tile('cat', this.empty ? '캐릭터 추가' : '캐릭터 변경', () => { void this.showSpecies(); });
    tile('add', '일정 추가', () => this.dispatch({ kind: 'addSchedule' }));
    tile('today', '오늘 일정', () => this.dispatch({ kind: 'today' }));
    tile('exit', '펫 종료', () => this.dispatch({ kind: 'quit' }));
    this.panel.replaceChildren(grid);
    this.place();
    this.panel.focus({ preventScroll: true });
  }

  private async showSpecies() {
    const page = ++this.page;
    const view = document.createElement('div');
    view.className = 'pet-character-view';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'pet-menu-back';
    back.textContent = '‹';
    back.setAttribute('aria-label', '펫 메뉴로 돌아가기');
    back.addEventListener('click', () => this.showActions());
    const title = document.createElement('h2');
    title.textContent = this.empty ? '캐릭터 추가' : '캐릭터 변경';
    const list = document.createElement('div');
    list.className = 'pet-character-list';
    const importButton = document.createElement('button');
    importButton.type = 'button';
    importButton.className = 'pet-menu-import';
    importButton.textContent = '저장한 이미지 열기…';
    importButton.addEventListener('click', () => this.dispatch({ kind: 'openImage' }));
    view.append(back, title, list, importButton);
    this.panel.replaceChildren(view);
    this.place();
    back.focus({ preventScroll: true });
    try {
      const species = await window.petAPI.getPetMenuSpecies();
      if (page !== this.page) return;
      for (const { id, label, selected, visible, dismissed } of species) {
        const row = document.createElement('div');
        row.className = 'pet-character-row';
        row.classList.toggle('is-dismissed', dismissed);
        const option = document.createElement('button');
        option.type = 'button';
        option.textContent = label;
        if (dismissed) option.setAttribute('aria-label', `${label} 다시 불러오기`);
        if (selected) option.setAttribute('aria-current', 'true');
        option.addEventListener('click', () => this.dispatch({ kind: 'select', id }));
        row.append(option);
        if (visible || dismissed) {
          const action = document.createElement('button');
          action.type = 'button';
          action.className = 'pet-character-action';
          action.textContent = visible ? '퇴장' : '불러오기';
          action.setAttribute('aria-label', `${label} ${action.textContent}`);
          action.addEventListener('click', () => this.dispatch({ kind: visible ? 'dismiss' : 'select', id }));
          row.append(action);
        }
        list.append(row);
      }
    } catch {
      if (page !== this.page) return;
      list.textContent = '캐릭터 목록을 불러오지 못했어요.';
    }
    this.place();
  }
}
