import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

// Next 16 ships native ESLint 9 flat configs. core-web-vitals đã bao gồm
// cấu hình TypeScript (superset), nên không cần FlatCompat.
const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  ...nextCoreWebVitals,
];

export default eslintConfig;
