// Paste your Firebase configuration object here
const firebaseConfig = {
    apiKey: "AIza...YOUR...API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "1:...:web:..."
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Your YouTube API Key
const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY';
