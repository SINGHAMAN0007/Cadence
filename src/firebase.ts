import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import appletConfig from "../firebase-applet-config.json";

const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return "";
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY") || getEnv("NEXT_PUBLIC_FIREBASE_API_KEY") || appletConfig.apiKey || "",
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN") || getEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN") || appletConfig.authDomain || "",
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID") || getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID") || appletConfig.projectId || "",
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET") || getEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET") || appletConfig.storageBucket || "",
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID") || getEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID") || appletConfig.messagingSenderId || "",
  appId: getEnv("VITE_FIREBASE_APP_ID") || getEnv("NEXT_PUBLIC_FIREBASE_APP_ID") || appletConfig.appId || ""
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export default app;
