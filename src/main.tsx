import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './firebase.ts';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { CommerceProvider } from './commerce/CommerceContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <WishlistProvider>
        <CommerceProvider>
          <App />
        </CommerceProvider>
      </WishlistProvider>
    </AuthProvider>
  </StrictMode>,
);
