import ReactDOM from 'react-dom/client';

import '@emotion/react';

import { App } from '@/app/components/App';
import 'react-loading-skeleton/dist/skeleton.css';
import 'twenty-ui/style.css';
import './index.css';

console.log('[DEBUG] Starting index.tsx');
const root = ReactDOM.createRoot(
  document.getElementById('root') ?? document.body,
);
console.log('[DEBUG] Root created');

root.render(<App />);
console.log('[DEBUG] root.render called');
