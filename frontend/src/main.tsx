import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { AppProvider } from './store/AppContext';
import { ToastProvider } from './components/ui/Toast';
import { SiteGate } from './components/SiteGate';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SiteGate>
      <ToastProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ToastProvider>
    </SiteGate>
  </StrictMode>
);
