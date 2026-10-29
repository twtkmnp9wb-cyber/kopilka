import { PiggyBank } from 'lucide-react';
import styles from './Splash.module.css';

export function Splash() {
  return (
    <div className={styles.splash} aria-busy="true" aria-label="Загрузка">
      <PiggyBank size={40} strokeWidth={1.75} />
    </div>
  );
}
