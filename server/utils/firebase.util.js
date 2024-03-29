// const { initializeApp } = require("firebase/app");
// const { getStorage } = require("firebase/storage");
// const dotenv = require("dotenv").config();

// const firebaseConfig2 = {
//     apiKey: process.env.FIREBASE_API_KEY,
//     projectId: process.env.FIREBASE_PROJECT_ID,
//     storageBucket: process.env.FIREBASE_STORAGE,
//     appId: process.env.FIREBASE_APP_ID,
// };

// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//     apiKey: "AIzaSyDBDHG-Ms7fzY-EnDx5Yl6e8paTl6FoQWw",
//     authDomain: "ecommerce-express-academlo.firebaseapp.com",
//     projectId: "ecommerce-express-academlo",
//     storageBucket: "ecommerce-express-academlo.appspot.com",
//     messagingSenderId: "473621328284",
//     appId: "1:473621328284:web:90c74d4ad9f5819c269859",
//     measurementId: "G-K9HRDERPL8",
// };

// // Initialize Firebase
// const firebaseApp = initializeApp(firebaseConfig);
// const storage = getStorage(firebaseApp);

const admin = require("firebase-admin");

// Replace with the path to your downloaded service account credentials JSON file
const serviceAccount = require("../firebaseapikey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Get the desired Firebase service (e.g., storage)
const storage = admin.storage();

module.exports = { storage };
