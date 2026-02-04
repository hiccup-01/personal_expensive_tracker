// Firebase Configuration
// This uses Firebase Realtime Database (100% FREE for small projects)

const firebaseConfig = {
    apiKey: "AIzaSyCj45nRL4g-tWcJkQw5dKmWFtolBjeSWrQ",
    authDomain: "expensive-tracker-009.firebaseapp.com",
    databaseURL: "https://expensive-tracker-009-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "expensive-tracker-009",
    storageBucket: "expensive-tracker-009.firebasestorage.app",
    messagingSenderId: "559682384391",
    appId: "1:559682384391:web:89fea058ed14ee191ef0a2",
    measurementId: "G-XYNVVST9D5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==================== DATABASE HELPER FUNCTIONS ====================

// Hash password (simple client-side hashing)
function hashPassword(password) {
    // Simple hash function (for demo - in production use better security)
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// Check if username exists
async function usernameExists(username) {
    const snapshot = await database.ref('users/' + username).once('value');
    return snapshot.exists();
}

// Register new user
async function registerUser(username, email, password) {
    try {
        // Check if username already exists
        const exists = await usernameExists(username);
        if (exists) {
            return { success: false, error: 'Username already taken!' };
        }

        // Check if email already exists
        const emailSnapshot = await database.ref('users').orderByChild('email').equalTo(email).once('value');
        if (emailSnapshot.exists()) {
            return { success: false, error: 'Email already registered!' };
        }

        // Create user
        const hashedPassword = hashPassword(password);
        await database.ref('users/' + username).set({
            email: email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        });

        return { success: true, message: 'Registration successful!' };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: 'Registration failed. Please try again.' };
    }
}

// Login user
async function loginUser(username, password) {
    try {
        const snapshot = await database.ref('users/' + username).once('value');
        
        if (!snapshot.exists()) {
            return { success: false, error: 'Invalid username or password!' };
        }

        const userData = snapshot.val();
        const hashedPassword = hashPassword(password);

        if (userData.password !== hashedPassword) {
            return { success: false, error: 'Invalid username or password!' };
        }

        return { success: true, username: username, email: userData.email };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Login failed. Please try again.' };
    }
}

// Add expense for user
async function addExpense(username, expenseData) {
    try {
        const expenseRef = database.ref('expenses/' + username).push();
        await expenseRef.set({
            ...expenseData,
            id: expenseRef.key,
            timestamp: new Date().toISOString()
        });
        return { success: true, id: expenseRef.key };
    } catch (error) {
        console.error('Add expense error:', error);
        return { success: false, error: 'Failed to add expense.' };
    }
}

// Get all expenses for user
async function getUserExpenses(username) {
    try {
        const snapshot = await database.ref('expenses/' + username).once('value');
        const expenses = [];
        
        snapshot.forEach((child) => {
            expenses.push(child.val());
        });

        // Sort by date (newest first)
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return expenses;
    } catch (error) {
        console.error('Get expenses error:', error);
        return [];
    }
}

// Delete expense
async function deleteExpense(username, expenseId) {
    try {
        await database.ref('expenses/' + username + '/' + expenseId).remove();
        return { success: true };
    } catch (error) {
        console.error('Delete expense error:', error);
        return { success: false, error: 'Failed to delete expense.' };
    }
}

// Listen to expense changes in real-time
function listenToExpenses(username, callback) {
    const expensesRef = database.ref('expenses/' + username);
    expensesRef.on('value', (snapshot) => {
        const expenses = [];
        snapshot.forEach((child) => {
            expenses.push(child.val());
        });
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
        callback(expenses);
    });
}
