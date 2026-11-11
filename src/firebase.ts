import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";
import { getFirestore, Firestore, collection, doc, onSnapshot, runTransaction } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA81i0QZZDPpZeST3J9jwcCUKlrIvMv3e4",
  authDomain: "instorelook-e90bf.firebaseapp.com",
  projectId: "instorelook-e90bf",
  storageBucket: "instorelook-e90bf.firebasestorage.app",
  messagingSenderId: "750473140604",
  appId: "1:750473140604:web:e9b157e6a8673f3a91acf9",
  measurementId: "G-2N6DH2K2VC"
};

// Initialize Firebase App (prevents re-initialization errors during hot-reload)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore DB
const db: Firestore = getFirestore(app);

// Safe Analytics Initialization (Analytics requires browser environment)
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, analytics, db, collection, doc, onSnapshot, runTransaction };
export default app;
