import { createContext, use } from 'react';
import type { AppContainer, UseCases } from '@/application';

/** DI-контейнер текущего режима (облако или демо). Задаётся в composition root. */
export const ContainerContext = createContext<AppContainer | null>(null);

export function useContainer(): AppContainer {
  const container = use(ContainerContext);
  if (!container) throw new Error('useContainer вне ContainerContext');
  return container;
}

export const useUseCases = (): UseCases => useContainer().useCases;
