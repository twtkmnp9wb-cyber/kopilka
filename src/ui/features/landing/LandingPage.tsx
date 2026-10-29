import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ChartLine, Compass, PiggyBank, Smartphone, Target, Wallet } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useMode } from '@/ui/app/mode';
import { Button } from '@/ui/shared/components/Button';
import { useReducedMotion } from '@/ui/shared/lib/hooks';
import { BanknoteFallback } from './hero/BanknoteFallback';
import {
  advance,
  createParallaxInput,
  listenPointer,
  listenTilt,
  requestTiltPermission,
  supportsWebGL,
  tiltNeedsPermission,
} from './hero/parallax';
import styles from './LandingPage.module.css';

const BanknoteScene = lazy(() => import('./hero/BanknoteScene'));

const FEATURES = [
  {
    icon: Wallet,
    title: 'Можно тратить сегодня',
    text: 'Одна честная цифра на день. Сэкономил вчера — сегодня можно больше, перерасходовал — лимит сам уменьшится.',
    preview: 'allowance',
  },
  {
    icon: Target,
    title: 'Цели с дедлайном',
    text: 'Ноутбук к сессии или поездка летом: Копилка разложит сумму на ежемесячные взносы и подскажет, успеваешь ли ты.',
    preview: 'goal',
  },
  {
    icon: ChartLine,
    title: 'Прогноз на год вперёд',
    text: 'Сколько денег будет через 3, 6 или 24 месяца при нынешних доходах и тратах — с честным коридором ошибки.',
    preview: 'forecast',
  },
] as const;

function Preview({ kind }: { kind: (typeof FEATURES)[number]['preview'] }) {
  if (kind === 'allowance') {
    return (
      <div className={styles.previewAllowance} aria-hidden>
        <span className={styles.previewBig}>1 240 ₽</span>
        <span className={styles.previewTrack}>
          <span style={{ width: '38%' }} />
        </span>
        <span className={styles.previewCaption}>потрачено 470 ₽ из 1 710 ₽</span>
      </div>
    );
  }
  if (kind === 'goal') {
    return (
      <div className={styles.previewGoal} aria-hidden>
        <svg viewBox="0 0 64 64" width="64" height="64">
          <circle cx="32" cy="32" r="27" fill="none" stroke="var(--accent-soft)" strokeWidth="7" />
          <circle
            cx="32"
            cy="32"
            r="27"
            fill="none"
            stroke="var(--saving)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="169.6"
            strokeDashoffset="72"
            transform="rotate(-90 32 32)"
          />
          <text x="32" y="38" textAnchor="middle" fontSize="18">
            💻
          </text>
        </svg>
        <div>
          <span className={styles.previewBigSmall}>9 667 ₽ / мес</span>
          <span className={styles.previewCaption}>до ноутбука — 6 месяцев</span>
        </div>
      </div>
    );
  }
  return (
    <svg className={styles.previewForecast} viewBox="0 0 220 72" aria-hidden>
      <path
        d="M0 60 L40 52 L80 46 L110 40"
        fill="none"
        stroke="var(--cat-blue)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M110 40 L150 30 L190 20 L220 12 L220 30 L190 34 L150 40 L110 40 Z"
        fill="var(--cat-blue)"
        opacity="0.12"
      />
      <path
        d="M110 40 L150 32 L190 25 L220 18"
        fill="none"
        stroke="var(--cat-blue)"
        strokeWidth="2.5"
        strokeDasharray="5 5"
        strokeLinecap="round"
      />
      <circle
        cx="110"
        cy="40"
        r="4.5"
        fill="var(--cat-blue)"
        stroke="var(--surface)"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { enterDemo } = useMode();
  const reducedMotion = useReducedMotion();
  const input = useMemo(createParallaxInput, []);
  const heroRef = useRef<HTMLElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const piggyRef = useRef<HTMLDivElement>(null);
  const [webgl] = useState(supportsWebGL);
  const [sceneActive, setSceneActive] = useState(true);
  const [tiltState, setTiltState] = useState<'unavailable' | 'ask' | 'on'>(() =>
    tiltNeedsPermission() && window.matchMedia('(pointer: coarse)').matches ? 'ask' : 'unavailable',
  );
  const use3d = webgl && !reducedMotion;

  // Курсор и наклон телефона.
  useEffect(() => {
    if (reducedMotion) return;
    const stopPointer = listenPointer(input);
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const stopTilt = coarse && !tiltNeedsPermission() ? listenTilt(input) : () => {};
    return () => {
      stopPointer();
      stopTilt();
    };
  }, [input, reducedMotion]);

  // Прокрутка: прогресс полёта купюры и пауза рендера, когда hero ушёл с экрана.
  useEffect(() => {
    input.dropTarget = piggyRef.current;
    let active = true;
    const onScroll = () => {
      const hero = heroRef.current;
      if (!hero) return;
      const height = hero.offsetHeight;
      input.scroll = Math.min(Math.max(window.scrollY / (height * 0.85), 0), 1);
      piggyRef.current?.toggleAttribute('data-fed', input.scroll >= 0.97);
      const nextActive = window.scrollY < height * 1.6;
      if (nextActive !== active) {
        active = nextActive;
        setSceneActive(nextActive);
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [input]);

  // Ближний слой — текст — смещается против движения купюры.
  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const tick = (now: number) => {
      advance(input, now);
      const layer = layerRef.current;
      if (layer) {
        layer.style.transform = `translate3d(${(-input.smooth.x * 14).toFixed(2)}px, ${(input.smooth.y * 10).toFixed(2)}px, 0)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [input, reducedMotion]);

  const stopTilt = useRef<(() => void) | null>(null);
  useEffect(() => () => stopTilt.current?.(), []);
  const enableTilt = async () => {
    if (await requestTiltPermission()) {
      stopTilt.current = listenTilt(input);
      setTiltState('on');
    } else {
      setTiltState('unavailable');
    }
  };

  const startDemo = () => {
    enterDemo();
    navigate('/');
  };

  return (
    <div className={styles.page}>
      {use3d && (
        <Suspense fallback={null}>
          <BanknoteScene
            className={styles.canvas}
            input={input}
            active={sceneActive}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      )}

      <header className={styles.topbar}>
        <span className={styles.brand}>
          <PiggyBank size={24} aria-hidden /> Копилка
        </span>
        <Link to="/auth" className={styles.signIn}>
          Войти
        </Link>
      </header>

      <section ref={heroRef} className={styles.hero} aria-labelledby="hero-title">
        {!use3d && (
          <div className={styles.fallbackWrap}>
            <BanknoteFallback className={styles.fallback} />
          </div>
        )}
        <div ref={layerRef} className={styles.heroContent}>
          <p className={styles.kicker}>Личные финансы без таблиц</p>
          <h1 id="hero-title" className={styles.title}>
            Копи <span className={styles.accent}>осознанно</span>
          </h1>
          <p className={styles.lead}>
            Доходы и расходы на понятных графиках, цели с дедлайном и одна честная цифра — сколько
            можно потратить сегодня, чтобы всё успеть.
          </p>
          <div className={styles.ctas}>
            <Button size="lg" onClick={() => navigate('/auth?tab=sign-up')}>
              Начать бесплатно
            </Button>
            <Button size="lg" variant="secondary" onClick={startDemo}>
              Посмотреть демо
            </Button>
          </div>
          {use3d && tiltState === 'ask' && (
            <button type="button" className={styles.tilt} onClick={() => void enableTilt()}>
              <Smartphone size={16} aria-hidden /> Наклоняй телефон, чтобы вращать купюру
            </button>
          )}
        </div>
        <a
          href="#features"
          className={styles.scrollHint}
          onClick={(event) => {
            event.preventDefault();
            document
              .getElementById('features')
              ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
          }}
        >
          <ArrowDown size={18} aria-hidden /> Листай — купюра отправится в копилку
        </a>
      </section>

      <section id="features" className={styles.features} aria-labelledby="features-title">
        <div ref={piggyRef} className={styles.piggy} aria-hidden>
          <PiggyBank size={44} strokeWidth={1.6} />
        </div>
        <h2 id="features-title" className={styles.sectionTitle}>
          Три вещи, которые Копилка считает за тебя
        </h2>
        <div className={styles.cards}>
          {FEATURES.map(({ icon: Icon, title, text, preview }) => (
            <article key={title} className={styles.card}>
              <span className={styles.cardIcon} aria-hidden>
                <Icon size={20} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
              <div className={styles.preview}>
                <Preview kind={preview} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.formula} aria-labelledby="formula-title">
        <h2 id="formula-title" className={styles.sectionTitle}>
          Как считается бюджет
        </h2>
        <div className={styles.equation}>
          <span className={styles.term} style={{ ['--tone' as string]: 'var(--income)' }}>
            Доход
          </span>
          <span className={styles.op}>−</span>
          <span className={styles.term} style={{ ['--tone' as string]: 'var(--cat-blue)' }}>
            Обязательные
          </span>
          <span className={styles.op}>−</span>
          <span className={styles.term} style={{ ['--tone' as string]: 'var(--saving)' }}>
            Взносы в цели
          </span>
          <span className={styles.op}>−</span>
          <span className={styles.term} style={{ ['--tone' as string]: 'var(--cat-yellow)' }}>
            Подушка
          </span>
          <span className={styles.op}>=</span>
          <span className={styles.result}>Свободный лимит</span>
        </div>
        <p className={styles.formulaText}>
          Свободный лимит делится по категориям так, как ты тратишь обычно, и на оставшиеся дни
          месяца — так появляется «можно тратить сегодня».
        </p>
      </section>

      <section className={styles.cta} aria-labelledby="cta-title">
        <Compass size={28} aria-hidden className={styles.ctaIcon} />
        <h2 id="cta-title" className={styles.sectionTitle}>
          Начни с одного дохода и одной цели
        </h2>
        <p className={styles.formulaText}>
          Регистрация по почте, данные синхронизируются между устройствами.
        </p>
        <div className={styles.ctas}>
          <Button size="lg" onClick={() => navigate('/auth?tab=sign-up')}>
            Создать Копилку
          </Button>
          <Button size="lg" variant="ghost" onClick={startDemo}>
            Демо без регистрации
          </Button>
        </div>
      </section>

      <footer className={styles.footer}>
        Пет-проект на React, TypeScript, three.js и Supabase ·{' '}
        <a href="https://github.com/twtkmnp9wb-cyber/kopilka" target="_blank" rel="noreferrer">
          исходный код
        </a>
      </footer>
    </div>
  );
}
