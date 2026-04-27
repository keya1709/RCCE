import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyDfO9o4pdlXEFW5QjZr96Zi3XgbM4dOtN0",
    authDomain: "rcce-523bf.firebaseapp.com",
    projectId: "rcce-523bf",
    storageBucket: "rcce-523bf.firebasestorage.app",
    messagingSenderId: "314571820522",
    appId: "1:314571820522:web:e94be6e892dd1e0b77238d",
    measurementId: "G-KDL8C625D0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const errorBox = document.getElementById('error-box');

// Handle Login
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;

        console.log("Attempting login...");
        signInWithEmailAndPassword(auth, email, pass)
            .then(() => {
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error("Login error:", error);
                errorBox.style.display = 'block';
                if (error.code === 'auth/configuration-not-found') {
                    errorBox.innerHTML = "<strong>Firebase Error:</strong> Email/Password authentication is not enabled in your Firebase Console. Please enable it under Authentication > Sign-in method.";
                } else {
                    errorBox.innerText = error.message;
                }
            });
    });
}

// Handle Signup
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const pass = document.getElementById('signup-password').value;

        console.log("Attempting signup...");
        createUserWithEmailAndPassword(auth, email, pass)
            .then(() => {
                window.location.href = 'index.html';
            })
            .catch((error) => {
                console.error("Signup error:", error);
                errorBox.style.display = 'block';
                if (error.code === 'auth/configuration-not-found') {
                    errorBox.innerHTML = "<strong>Firebase Error:</strong> Email/Password authentication is not enabled in your Firebase Console. Please enable it under Authentication > Sign-in method.";
                } else {
                    errorBox.innerText = error.message;
                }
            });
    });
}

// Global Auth Observer & Logout setup
onAuthStateChanged(auth, (user) => {
    const isLoginPage = window.location.pathname.includes('login.html');
    
    if (user) {
        if (isLoginPage) {
            window.location.href = 'index.html';
        }
        // If on index, maybe show user email
        const userDisplay = document.getElementById('user-email-display');
        if (userDisplay) userDisplay.innerText = user.email;
    } else {
        if (!isLoginPage) {
            window.location.href = 'login.html';
        }
    }
});

// Logout function
window.logout = () => {
    signOut(auth).then(() => {
        window.location.href = 'login.html';
    });
};
