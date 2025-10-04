// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCPDdIY0fkVY3N64sUTD8hPS74_ZNAzpnI",
  authDomain: "havenly-getaways.firebaseapp.com",
  projectId: "havenly-getaways",
  storageBucket: "havenly-getaways.firebasestorage.app",
  messagingSenderId: "656033689081",
  appId: "1:656033689081:web:821408bd02b080e0cc2128",
  measurementId: "G-D45BX86XJG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
