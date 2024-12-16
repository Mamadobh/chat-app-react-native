// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCYqciyTxO09EQYwLAYW0c6oKQ01sjSdIE",
  authDomain: "whatsappclone-bb8c7.firebaseapp.com",
  projectId: "whatsappclone-bb8c7",
  storageBucket: "whatsappclone-bb8c7.firebasestorage.app",
  messagingSenderId: "114319546131",
  appId: "1:114319546131:web:95ef4f03a8b8a76e9e6ce6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth =initializeAuth(app,{
  persistence:getReactNativePersistence(AsyncStorage)
})