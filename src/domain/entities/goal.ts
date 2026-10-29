import type { Kopecks } from '../money';
import type { IsoDate } from '../period';

export interface Goal {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly target: Kopecks;
  readonly deadline: IsoDate;
  /** Дата создания — от неё считается линейный график накопления. */
  readonly createdOn: IsoDate;
  readonly archived: boolean;
}

export type GoalDraft = Omit<Goal, 'id'>;
