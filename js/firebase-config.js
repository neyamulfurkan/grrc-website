/**
 * firebase-config.js
 * Firebase Configuration for GRRC Community Chat
 * NO storage used - profile pictures from members database
 */

// Import Firebase modules (v9+ modular SDK)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAX5WauNC9Qzb5pMU7VLtUE-YyW85v0QvY",
  authDomain: "grrc-community.firebaseapp.com",
  projectId: "grrc-community",
  storageBucket: "grrc-community.firebasestorage.app",
  messagingSenderId: "461037890340",
  appId: "1:461037890340:web:1bac8fc2dde5e77575a1b1",
  measurementId: "G-NFPY9XBF7L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('✅ Firebase initialized successfully');

// Export for use in other files
export { auth, db };