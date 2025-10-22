// Paste your Firebase configuration object here
const firebaseConfig = {
    apiKey: "AIzaSyDYS2C8Q7tDpyv-uqQb8d_Q2KnoTJ7ceig",
    authDomain: "ylms-a486b.firebaseapp.com",
    projectId: "ylms-a486b",
    storageBucket: "ylms-a486b.firebasestorage.app",
    messagingSenderId: "1031588247679",
    appId: "1:1031588247679:web:9034c5e4f3ba91ab0fe74a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Your YouTube API Key
const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY';
