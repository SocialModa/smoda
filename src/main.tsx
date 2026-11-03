import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { ToastProvider } from '@/context/ToastContext';
import { ConfirmProvider } from '@/context/ConfirmContext';
import { SiteProvider } from '@/context/SiteContext';
import { AuthProvider } from '@/context/AuthContext';

// "/" for a custom domain, "/<repo>/" for a project page: set by VITE_BASE at build time
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <ToastProvider>
        <ConfirmProvider>
          <SiteProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </SiteProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
