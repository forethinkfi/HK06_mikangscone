import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/jua';
import '@fontsource/gowun-dodum';
import '@fontsource/do-hyeon';
import 'pretendard/dist/web/static/pretendard.css';
import './index.css';
import { ThemeProvider } from './theme/ThemeProvider';
import App from './App';
import { NoteWindow } from './NoteWindow';
import { noteWindowId } from './desktop';

// 온글잎 박다현체 (VoyagerX): 라이선스 때문에 git에 올리지 않고 public/fonts/에 직접 넣는다.
// 파일이 없으면 조용히 넘어가고 Pretendard로 보인다. 손글씨체는 작게 보여서 118%로 키운다.
const handwriting = new FontFace('Ownglyph PDH', `url("${new URL('./fonts/onglip-parkdahyeon.ttf', document.baseURI)}")`, {
  display: 'swap',
  sizeAdjust: '118%',
} as FontFaceDescriptors);
handwriting
  .load()
  .then((f) => document.fonts.add(f))
  .catch(() => {});

// the same page runs as the bookmark panel, or (with ?note=ID) as one sticky-note window
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>{noteWindowId ? <NoteWindow id={noteWindowId} /> : <App />}</ThemeProvider>
  </StrictMode>,
);
