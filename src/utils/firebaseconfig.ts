// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import { getAnalytics } from "firebase/analytics";


const firebaseConfig = {
    apiKey: "AIzaSyBZdms3T15Q-VFAzx3NfTAs3eI1wq7K5NQ",
    authDomain: "solana-a127e.firebaseapp.com",
    projectId: "solana-a127e",
    storageBucket: "solana-a127e.firebasestorage.app",
    messagingSenderId: "408674142163",
    appId: "1:408674142163:web:f35205df93e2c465405126",
    measurementId: "G-V2CKCN60YS"
  };
  



const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);