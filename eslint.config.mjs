import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'upstream/extracted/**',
      'test/fixtures/**',
    ],
  },
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/upstream/extracted/**'],
              message: 'Import MCPB internals only through the adapter',
            },
          ],
        },
      ],
    },
  },
);
