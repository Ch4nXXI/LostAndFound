import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA1ZnF4oT0cnAlaC2C-iHSU4UI8ddTjCjk",
  authDomain: "ctu-lostandfound-fe09b.firebaseapp.com",
  projectId: "ctu-lostandfound-fe09b",
  storageBucket: "ctu-lostandfound-fe09b.firebasestorage.app",
  messagingSenderId: "709881913002",
  appId: "1:709881913002:web:2e61db199ab9b0487c3ad3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);