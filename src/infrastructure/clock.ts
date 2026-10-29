import type { Clock } from '@/application';
import { toIsoDate } from '@/domain';

export const systemClock: Clock = {
  today: () => toIsoDate(new Date()),
};
