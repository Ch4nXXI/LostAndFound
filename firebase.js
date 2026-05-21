import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCChUT36jUX8yJa3qAG3LBdulg0JxcP5h8",
  authDomain: "ctu-lostandfound.firebaseapp.com",
  projectId: "ctu-lostandfound",
  storageBucket: "ctu-lostandfound.firebasestorage.app",
  messagingSenderId: "776069155449",
  appId: "1:776069155449:web:f472c4b62a6b7d3143e2a8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);