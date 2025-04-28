import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Firebase yapılandırma bilgileri
// NOT: Bu bilgileri Firebase konsolundan projeniz için almalısınız
const firebaseConfig = {
  apiKey: "api-key",
  authDomain: "-",
  databaseURL: "api-key",
  projectId: "api-key",
  storageBucket: "api-key",
  messagingSenderId: "-",
  appId: "api-key",
  measurementId: "-"
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Kimlik doğrulama hizmeti
export const auth = getAuth(app);

// Firestore veritabanı hizmeti
export const db = getFirestore(app);

// Depolama hizmeti
export const storage = getStorage(app);

// Realtime Database hizmeti
export const rtdb = getDatabase(app);

export default app; 
