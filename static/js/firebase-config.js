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

// ==================== MONTHLY INCOME FUNCTIONS ====================

// Set monthly income for user
async function setMonthlyIncome(username, amount, month) {
    try {
        // month format: "2025-02" (YYYY-MM)
        if (!month) {
            const now = new Date();
            month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        
        await database.ref('income/' + username + '/' + month).set({
            amount: parseFloat(amount),
            updatedAt: new Date().toISOString()
        });
        
        return { success: true, message: 'Monthly income set successfully!' };
    } catch (error) {
        console.error('Set income error:', error);
        return { success: false, error: 'Failed to set income.' };
    }
}

// Get monthly income for user
async function getMonthlyIncome(username, month) {
    try {
        // month format: "2025-02" (YYYY-MM)
        if (!month) {
            const now = new Date();
            month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        
        const snapshot = await database.ref('income/' + username + '/' + month).once('value');
        
        if (snapshot.exists()) {
            return snapshot.val().amount;
        }
        
        return 0; // No income set for this month
    } catch (error) {
        console.error('Get income error:', error);
        return 0;
    }
}

// Get all income records for user
async function getAllIncome(username) {
    try {
        const snapshot = await database.ref('income/' + username).once('value');
        const incomeData = [];
        
        snapshot.forEach((child) => {
            incomeData.push({
                month: child.key,
                amount: child.val().amount,
                updatedAt: child.val().updatedAt
            });
        });

        return incomeData;
    } catch (error) {
        console.error('Get all income error:', error);
        return [];
    }
}

// ==================== EXPENSE FUNCTIONS ====================

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

// Get expenses for specific month
async function getMonthlyExpenses(username, month) {
    try {
        // month format: "2025-02" (YYYY-MM)
        if (!month) {
            const now = new Date();
            month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        
        const allExpenses = await getUserExpenses(username);
        const monthlyExpenses = allExpenses.filter(expense => 
            expense.date.startsWith(month)
        );
        
        return monthlyExpenses;
    } catch (error) {
        console.error('Get monthly expenses error:', error);
        return [];
    }
}

// Calculate total expenses for a month
async function calculateMonthlyExpenses(username, month) {
    try {
        const monthlyExpenses = await getMonthlyExpenses(username, month);
        const total = monthlyExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        return total;
    } catch (error) {
        console.error('Calculate monthly expenses error:', error);
        return 0;
    }
}

// Get monthly balance (Income - Expenses)
async function getMonthlyBalance(username, month) {
    try {
        if (!month) {
            const now = new Date();
            month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        
        const income = await getMonthlyIncome(username, month);
        const expenses = await calculateMonthlyExpenses(username, month);
        
        return {
            income: income,
            expenses: expenses,
            balance: income - expenses,
            percentage: income > 0 ? ((expenses / income) * 100).toFixed(1) : 0
        };
    } catch (error) {
        console.error('Get monthly balance error:', error);
        return { income: 0, expenses: 0, balance: 0, percentage: 0 };
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

// Listen to income changes in real-time
function listenToIncome(username, month, callback) {
    if (!month) {
        const now = new Date();
        month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    
    const incomeRef = database.ref('income/' + username + '/' + month);
    incomeRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val().amount);
        } else {
            callback(0);
        }
    });
}
