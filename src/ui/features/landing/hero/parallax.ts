// Общий источник движения для всех слоёв параллакса: курсор, наклон телефона и прокрутка.
// Это изменяемый объект без React-состояния — слои читают его в своих rAF-циклах,
// поэтому движение не вызывает перерисовок компонентов.

export interface ParallaxInput {
  /** Куда «смотрит» пользователь: −1…1 по обеим осям. */
  readonly target: { x: number; y: number };
  /** Сглаженное значение, к которому плавно подтягиваются слои. */
  readonly smooth: { x: number; y: number };
  /** Прогресс прокрутки hero-секции: 0 — наверху, 1 — купюра долетела до копилки. */
  scroll: number;
  /** Куда купюра улетает при прокрутке. */
  dropTarget: HTMLElement | null;
  /** Время последнего шага сглаживания — его делают несколько циклов, а считать нужно один раз. */
  lastStep: number;
}

export function createParallaxInput(): ParallaxInput {
  return {
    target: { x: 0, y: 0 },
    smooth: { x: 0, y: 0 },
    scroll: 0,
    dropTarget: null,
    lastStep: 0,
  };
}

const clamp = (value: number, min = -1, max = 1) => Math.min(Math.max(value, min), max);

/** Экспоненциальное сглаживание, не зависящее от частоты кадров. */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

/** Продвигает сглаживание к моменту `now` (мс). Повторный вызов в том же кадре ничего не делает. */
export function advance(input: ParallaxInput, now: number) {
  const dt = input.lastStep === 0 ? 0 : Math.min((now - input.lastStep) / 1000, 0.05);
  if (dt === 0 && input.lastStep !== 0) return;
  input.lastStep = now;
  input.smooth.x = damp(input.smooth.x, input.target.x, 4, dt);
  input.smooth.y = damp(input.smooth.y, input.target.y, 4, dt);
}

export function listenPointer(input: ParallaxInput): () => void {
  const onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    input.target.x = clamp((event.clientX / window.innerWidth) * 2 - 1);
    input.target.y = clamp(-((event.clientY / window.innerHeight) * 2 - 1));
  };
  const onLeave = () => {
    input.target.x = 0;
    input.target.y = 0;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  return () => {
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
  };
}

type OrientationPermission = () => Promise<'granted' | 'denied'>;

const orientationApi = () =>
  typeof DeviceOrientationEvent === 'undefined'
    ? undefined
    : (DeviceOrientationEvent as unknown as { requestPermission?: OrientationPermission });

/** iOS требует явного разрешения на датчики — и только по жесту пользователя. */
export const tiltNeedsPermission = (): boolean =>
  typeof orientationApi()?.requestPermission === 'function';

export async function requestTiltPermission(): Promise<boolean> {
  const request = orientationApi()?.requestPermission;
  if (!request) return true;
  try {
    return (await request()) === 'granted';
  } catch {
    return false;
  }
}

export function listenTilt(input: ParallaxInput): () => void {
  const onOrientation = (event: DeviceOrientationEvent) => {
    if (event.gamma === null || event.beta === null) return;
    // Телефон обычно держат под ~40° к горизонту — это и есть «ноль».
    input.target.x = clamp(event.gamma / 25);
    input.target.y = clamp((event.beta - 40) / -25);
  };
  window.addEventListener('deviceorientation', onOrientation);
  return () => window.removeEventListener('deviceorientation', onOrientation);
}

export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Шрифт должен загрузиться до того, как его нарисуют на canvas-текстуре. */
export function loadArtFonts(): Promise<unknown> {
  if (!('fonts' in document)) return Promise.resolve();
  return Promise.allSettled([
    document.fonts.load("800 64px 'Inter Variable'"),
    document.fonts.load("600 64px 'Inter Variable'"),
  ]);
}
