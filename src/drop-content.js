/* Read drag data synchronously, before the browser clears DataTransfer. */
globalThis.MemoDrop = {
  files(transfer) {
    if (!transfer) return [];
    const files = Array.from(transfer.files || []);
    if (files.length) return files;
    return Array.from(transfer.items || []).filter(item => item.kind === 'file').map(item => item.getAsFile()).filter(Boolean);
  },
  accepts(transfer) {
    return !!transfer && (Array.from(transfer.items || []).some(item => item.kind === 'file') || Array.from(transfer.types).some((type) =>
      ['files', 'text/plain', 'text/html', 'text/uri-list', 'text', 'url', 'public.utf8-plain-text'].includes(type.toLowerCase())));
  },
  content(transfer) {
    const template = document.createElement('template');
    template.innerHTML = transfer.getData('text/html');
    const fragment = template.content;
    const text = (transfer.getData('text/plain') || transfer.getData('public.utf8-plain-text') || transfer.getData('text')).trim();
    const uri = transfer.getData('text/uri-list').split(/\r?\n/).find((line) => line && !line.startsWith('#')) || '';
    const image = fragment.querySelector('img');
    const src = image?.getAttribute('src') || '';
    const imageUrl = /^(?:https?:\/\/|data:image\/)/i.test(src) ? src :
      /^(?:https?:\/\/.*\.(?:png|jpe?g|gif|webp|avif|bmp)(?:[?#]|$)|data:image\/)/i.test(uri) ? uri : '';
    return { imageUrl, text: (text || uri || fragment.textContent || '').trim().slice(0, 100000) };
  },
};
