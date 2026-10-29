import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './ui/shared/styles/tokens.css';
import './ui/shared/styles/base.css';
import { App } from './ui/app/App';

// Режим «на экране Домой» на iOS: статус-бар прозрачный, интерфейсу нужен отступ сверху.
const standalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
document.documentElement.classList.toggle('is-standalone', standalone);

const root = document.getElementById('root');
if (!root) throw new Error('Нет элемента #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
