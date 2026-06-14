export default {
  preset: 'ts-jest/presets/default',
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/src/tests/setup-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testMatch: ['**/src/tests/**/*.test.ts?(x)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/tests/**',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(.+?/node_modules)?(@tauri-apps|@radix-ui|zustand|framer-motion|lucide-react|class-variance-authority|clsx|tailwind-merge|react-markdown|remark-gfm|rehype-highlight|rehype-raw|unist-util-visit|unist-util-is|decode-uri-component|vfile|micromark|@types|hast|html-void-elements|property-information|space-separated-tokens|comma-separated-tokens|sonner|cmdk|@tanstack/react-query|devlop))/',
  ],
  testEnvironmentOptions: {
    // Resolve packages' development build when one exists. Without this,
    // jsdom resolves React's "production.min" condition, which strips out
    // the act() testing helpers — causing every React test to fail with
    // "act(...) is not supported in production builds of React".
    customExportConditions: ['node', 'node-addons', 'browser', 'development'],
  },
};
