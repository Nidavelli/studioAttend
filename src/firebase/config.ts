// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCGaviZGM1k8EELK4L4CDQfNUBnKKmmMME",
  authDomain: "geoattend-15600.firebaseapp.com",
  projectId: "geoattend-15600",
  storageBucket: "geoattend-15600.firebasestorage.app",
  messagingSenderId: "1062604628712",
  appId: "1:1062604628712:web:dc1b28a0e8a85dc6a99f5d",
  measurementId: "G-F2BR027T3K"
};

// Initialize Firebase
let firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export { firebaseApp };
