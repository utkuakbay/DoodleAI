// Firebase v10.7.1 ile uyumlu yapılandırma - SDK 53 
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Firebase yapılandırma bilgileri
const firebaseConfig = {
  apiKey: "AIzaSyAgyoyy5DhSK3om70_SOxHhnUPFtHBx3jE",
  authDomain: "doodleai-eaede.firebaseapp.com",
  databaseURL: "https://doodleai-eaede-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "doodleai-eaede",
  storageBucket: "doodleai-eaede.firebasestorage.app",
  messagingSenderId: "32539666154",
  appId: "1:32539666154:web:ddb97af73d5e6da6c75993",
  measurementId: "G-1G8CXMQEP8"
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Firebase Auth - Component auth has not been registered yet hatasını çözmek için
// Expo SDK 53 ve Firebase v10.7.1 ile çalışacak şekilde auth yapılandırması
// Metro yapılandırması metro.config.js'de yapılmalıdır
const auth = getAuth(app);

// Kimlik doğrulama persistance'ı için, farklı bir yöntem kullanmanız gerekebilir
// Örneğin: onAuthStateChanged kullanarak mevcut kullanıcıyı almak

// Diğer Firebase servisleri
const db = getFirestore(app);
const storage = getStorage(app);
const rtdb = getDatabase(app);

// Servislerimizi ve uygulamayı dışa aktar
export { auth, db, storage, rtdb };
export default app; 