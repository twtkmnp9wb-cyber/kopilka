import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          // Провайдер и его хук живут рядом — это осознанный паттерн.
          allowExportNames: [
            'useTheme',
            'usePeriod',
            'useMode',
            'useSession',
            'usePasswordRecovery',
            'useToast',
            'useTransactionSheet',
            'categoryColorVar',
            'CATEGORY_ICON_COMPONENTS',
            'COLOR_LABELS',
          ],
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/ui/*', '@/infrastructure/*'],
              message: 'Слой domain/application не зависит от UI и инфраструктуры.',
            },
          ],
        },
      ],
    },
  },
  {
    // Правило слоёв: зависимости направлены только внутрь (ui → application → domain).
    files: ['src/ui/**', 'src/infrastructure/**', 'src/main.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['src/domain/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/ui/*', '@/infrastructure/*', '@/application/*', 'react', 'zod'],
              message: 'Домен — чистый TypeScript без зависимостей.',
            },
          ],
        },
      ],
    },
  },
);
