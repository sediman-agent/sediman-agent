import React from 'react';
import ReactDOM from 'react-dom/client';
import { UIDocsPage } from './UIDocsPage';
import './styles.css';

console.log('[UI Docs] Starting UI documentation...');

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('[UI Docs] Root element not found!');
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <UIDocsPage />
    </React.StrictMode>
  );
}
