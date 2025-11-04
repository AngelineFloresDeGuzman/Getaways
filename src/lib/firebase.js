// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDYALQqzRvaAQTqeyZsp8BZ5LoONOgrdIY",
  authDomain: "getaways-official.firebaseapp.com",
  projectId: "getaways-official",
  storageBucket: "getaways-official.appspot.com",
  messagingSenderId: "746427653077",
  appId: "1:746427653077:web:2559b18bfdb72c15d43b5c",
  measurementId: "G-MPF4KWEYBD"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig); // ✅ Export this!
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Storage removed - not using Firebase Storage
