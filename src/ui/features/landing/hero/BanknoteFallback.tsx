import { useEffect, useRef } from 'react';
import { drawBanknoteFront, NOTE_ASPECT } from './banknote-art';
import { loadArtFonts } from './parallax';

/**
 * Статичная купюра того же дизайна — для prefers-reduced-motion и браузеров без WebGL.
 * Рисуется теми же функциями, что и текстура 3D-модели.
 */
export function BanknoteFallback({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    void loadArtFonts().then(() => {
      const canvas = ref.current;
      const ctx = canvas?.getContext('2d');
      if (cancelled || !canvas || !ctx) return;
      drawBanknoteFront(ctx, canvas.width, canvas.height);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <canvas
      ref={ref}
      className={className}
      width={1600}
      height={Math.round(1600 / NOTE_ASPECT)}
      role="img"
      aria-label="Сувенирная купюра Копилки"
    />
  );
}
