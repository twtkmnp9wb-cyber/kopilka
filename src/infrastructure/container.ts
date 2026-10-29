import { createUseCases, type AppContainer } from '@/application';
import { systemClock } from './clock';
import { DemoAuthService } from './local/demo-auth';
import { createLocalRepositories } from './local/local-repositories';
import { seedDemoData } from './local/demo-seed';
import { BrowserStore, type KeyValueStore } from './storage/key-value-store';
import { getSupabaseClient } from './supabase/client';
import {
  categoryMapping,
  goalMapping,
  recurringMapping,
  transactionMapping,
} from './supabase/mappings';
import { SupabaseAuthService } from './supabase/supabase-auth';
import { SupabaseCrudRepository } from './supabase/supabase-repository';
import { SupabaseSettingsRepository } from './supabase/supabase-settings';

// Composition root: единственное место, где выбираются конкретные реализации портов.

export function createCloudContainer(): AppContainer {
  const client = getSupabaseClient();
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  return {
    mode: 'cloud',
    auth: new SupabaseAuthService(client, redirectTo),
    useCases: createUseCases(
      {
        transactions: new SupabaseCrudRepository(client, transactionMapping),
        categories: new SupabaseCrudRepository(client, categoryMapping),
        goals: new SupabaseCrudRepository(client, goalMapping),
        recurring: new SupabaseCrudRepository(client, recurringMapping),
        settings: new SupabaseSettingsRepository(client),
      },
      systemClock,
    ),
  };
}

const DEMO_PREFIX = 'kopilka:demo';

/** Демо: данные в localStorage этого браузера, при первом входе — пример истории. */
export function createDemoContainer(
  onExit: () => void,
  store: KeyValueStore = new BrowserStore(),
): AppContainer {
  const repos = createLocalRepositories(store, DEMO_PREFIX);
  if (repos.categories.read().length === 0) seedDemoData(repos, systemClock.today());
  return {
    mode: 'demo',
    auth: new DemoAuthService(() => {
      repos.clear();
      onExit();
    }),
    useCases: createUseCases(repos, systemClock),
  };
}
