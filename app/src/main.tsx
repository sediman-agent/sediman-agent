import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { useAppStore } from './stores/useAppStore';

// Theme provider component
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((state) => state.theme);
  const colorTheme = useAppStore((state) => state.colorTheme);

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // Apply color theme to document
    document.documentElement.classList.remove(
      'theme-blue',
      'theme-purple',
      'theme-green',
      'theme-rose',
      'theme-cyan'
    );

    if (colorTheme !== 'default') {
      document.documentElement.classList.add(`theme-${colorTheme}`);
    }
  }, [colorTheme]);

  return <>{children}</>;
}

// Set up Tauri window title bar if needed
if (window.__TAURI__) {
  console.log('[Tauri] Running in Tauri context');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
