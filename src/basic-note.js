(() => {
  'use strict';

  const FORMATS = [
    ['bold', '굵게', 'B'], ['italic', '기울임', 'I'], ['underline', '밑줄', 'U'],
    ['strikeThrough', '취소선', 'ab'],
    ['insertUnorderedList', '목록',
      '<svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5h10M7 10h10M7 15h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="3" cy="5" r="1.2" fill="currentColor"/><circle cx="3" cy="10" r="1.2" fill="currentColor"/><circle cx="3" cy="15" r="1.2" fill="currentColor"/></svg>'],
  ];
  const TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'UL', 'LI', 'BR', 'DIV', 'P']);

  function cleanHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    for (const element of [...template.content.querySelectorAll('*')].reverse()) {
      if (element.tagName === 'IMG' && /^\d+$/.test(element.dataset.photo ?? '')) {
        const marker = document.createElement('img');
        marker.dataset.photo = element.dataset.photo;
        element.replaceWith(marker);
        continue;
      }
      if (!TAGS.has(element.tagName)) {
        element.replaceWith(...element.childNodes);
        continue;
      }
      for (const attr of [...element.attributes]) element.removeAttribute(attr.name);
    }
    return template.innerHTML;
  }

  function editor(note, h, { onChange, onBlur, onImages, onView }) {
    let savedRange;
    const photos = () => [...el.querySelectorAll('img[data-photo]')];
    function selectionRange() {
      const selection = document.getSelection();
      const range = selection.rangeCount && selection.getRangeAt(0);
      return range && el.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
    }
    function insertionRange() {
      const range = selectionRange() || savedRange?.cloneRange();
      if (range && el.contains(range.commonAncestorContainer)) return range;
      const end = document.createRange();
      end.selectNodeContents(el);
      end.collapse(false);
      return end;
    }
    function photoElement(src) {
      return h('img', { src, 'data-photo': '', alt: '첨부 사진', tabindex: '0', draggable: 'false' });
    }
    const sync = () => {
      note.photos = photos().map((img, i) => {
        img.dataset.photo = String(i);
        return img.getAttribute('src');
      });
      note.text = el.innerText.trimEnd();
      const copy = el.cloneNode(true);
      copy.querySelectorAll('img').forEach(img => img.removeAttribute('src'));
      note.basicHtml = cleanHtml(copy.innerHTML);
      note.basicText = note.text;
      el.classList.toggle('is-empty', !note.text.trim() && !note.photos.length);
      onChange();
    };
    const el = h('div', {
      class: 'body basic-editor',
      role: 'textbox',
      contenteditable: 'true',
      'aria-multiline': 'true',
      'aria-label': '메모 내용',
      'data-placeholder': '메모를 작성하세요…',
      oninput: sync,
      onblur: () => { savedRange = selectionRange() || savedRange; onBlur(); },
      onkeyup: () => { savedRange = selectionRange(); },
      onpointerup: () => { savedRange = selectionRange(); },
      onkeydown: e => {
        if (e.target.matches('img[data-photo]') && ['Enter',' '].includes(e.key)) {
          e.preventDefault(); onView(photos().indexOf(e.target));
        }
      },
      onclick: e => { if (e.target.matches('img[data-photo]')) onView(photos().indexOf(e.target)); },
      ondrop: e => {
        if (e.dataTransfer.files.length) return;
        e.preventDefault();
        const text = e.dataTransfer.getData('text/plain');
        if (!text) return;
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (range && el.contains(range.commonAncestorContainer)) {
          const selection = document.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
        document.execCommand('insertText', false, text);
      },
      onpaste: (e) => {
        const images = [...(e.clipboardData?.files ?? [])];
        e.preventDefault();
        if (!onImages(images)) document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      },
    });
    if (note.basicText === note.text && typeof note.basicHtml === 'string') {
      el.innerHTML = cleanHtml(note.basicHtml);
    } else {
      el.textContent = note.text;
    }
    const shown = new Set();
    for (const marker of photos()) {
      const index = Number(marker.dataset.photo);
      if (!shown.has(index) && /^data:image\//.test(note.photos[index])) {
        marker.replaceWith(photoElement(note.photos[index]));
        shown.add(index);
      } else marker.remove();
    }
    note.photos.forEach((src, index) => {
      if (!shown.has(index) && /^data:image\//.test(src)) el.append(photoElement(src));
    });
    el.classList.toggle('is-empty', !note.text.trim() && !note.photos.length);
    function insertPhotos(sources, range) {
      if (!el.contains(range.commonAncestorContainer)) range = insertionRange();
      range.collapse(false);
      el.focus();
      const selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const markup = sources.map(src => photoElement(src).outerHTML).join('');
      document.execCommand('insertHTML', false, markup);
      savedRange = selectionRange();
      sync();
    }
    const toolbar = h('div', { class: 'basic-format', role: 'group', 'aria-label': '메모 서식' });
    const toggle = h('button', { class: 'basic-format-toggle', type: 'button', 'aria-label': '서식 도구',
      'aria-expanded': 'false', onmousedown: (e) => e.preventDefault(), onclick: () => {
        const expanded = toolbar.toggleAttribute('data-expanded');
        toggle.setAttribute('aria-expanded', String(expanded));
      } }, 'Aa');
    toolbar.append(toggle, ...
      FORMATS.map(([command, label, icon]) => h('button', {
        type: 'button',
        'data-format': true,
        class: 'basic-format-' + command,
        'aria-label': label,
        title: label,
        html: icon,
        onmousedown: (e) => e.preventDefault(),
        onclick: () => {
          el.focus();
          document.execCommand(command);
          sync();
        },
      })));
    function appendPhotos(sources) {
      el.append(...sources.map(photoElement));
      sync();
    }
    return { el, toolbar, insertionRange, insertPhotos, appendPhotos };
  }

  window.BasicNote = { editor };
})();
