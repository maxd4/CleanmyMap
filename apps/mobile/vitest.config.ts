import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'tests/**/*.test.{js,jsx,ts,tsx}',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/__tests__/**',
        '**/*.d.ts',
        'vendor/**',
      ],
    },
  },
})
