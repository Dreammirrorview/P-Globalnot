// Pilgrims Bank Platform - Main JavaScript

// Database simulation using localStorage
const DB = {
    users: [],
    admin: {
        username: 'admin',
        password: 'admin123',
        name: 'Olawale Abdul-Ganiyu',
        email: 'adeganglobal@gmail.com'
    },
    transactions: [],
    settings: {
        pgcValue: 0.50,
        miningRate: 0.00000001
    }
};

// Load database from localStorage
function loadDB() {
    const savedDB = localStorage.getItem('pilgrimsBankDB');
    if (savedDB) {
        const parsedDB = JSON.parse(savedDB);
        DB.users = parsedDB.users || [];
        DB.transactions = parsedDB.transactions || [];
        DB.settings = parsedDB.settings || DB.settings;
    }
}

// Save database to localStorage
function saveDB() {
    localStorage.setItem('pilgrimsBankDB', JSON.stringify(DB));
    
    // Notify network of data changes
    if (currentUser) {
        NetworkBridge.sendMessage('investment', {
            type: 'BALANCE_UPDATE',
            data: {
                username: currentUser.username,
                coinBalance: currentUser.coinBalance,
                cashBalance: currentUser.cashBalance
            }
        });
        
        NetworkBridge.sendMessage('customer', {
            type: 'BALANCE_UPDATE',
            data: {
                username: currentUser.username,
                coinBalance: currentUser.coinBalance,
                cashBalance: currentUser.cashBalance
            }
        });
    }
}

// Current user session
let currentUser = null;
let isAdmin = false;

// Mining state
let miningInterval = null;
let isMining = false;
let minedAmount = 0;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadDB();
    checkSession();
    
    // Initialize Network Bridge
    NetworkBridge.init('mainBank');
    
    // Listen for network events
    window.addEventListener('network-connection', (event) => {
        console.log('[MainBank] Connected to:', event.detail.platform);
        updateNetworkStatus();
    });
    
    window.addEventListener('network-disconnection', () => {
        console.log('[MainBank] Network disconnected');
        updateNetworkStatus();
    });
    
    window.addEventListener('transaction-update', (event) => {
        console.log('[MainBank] Transaction update received:', event.detail.transaction);
        // Refresh transaction history if dashboard is visible
        if (currentUser) {
            updateTransactionHistory();
        }
    });
    
    window.addEventListener('balance-update', (event) => {
        console.log('[MainBank] Balance update received:', event.detail.balanceData);
        // Refresh balances if current user matches
        if (currentUser && event.detail.balanceData.username === currentUser.username) {
            loadDB();
            currentUser = DB.users.find(u => u.username === currentUser.username);
            updateDashboard();
        }
    });
    
    window.addEventListener('user-update', (event) => {
        console.log('[MainBank] User update received:', event.detail.userData);
        loadDB();
        if (isAdmin) {
            updateCustomerList();
        }
    });
});

// Session management
function checkSession() {
    const session = localStorage.getItem('pilgrimsSession');
    if (session) {
        const parsedSession = JSON.parse(session);
        if (parsedSession.isAdmin) {
            isAdmin = true;
            currentUser = DB.admin;
            showSection('adminDashboard');
        } else {
            currentUser = DB.users.find(u => u.username === parsedSession.username);
            if (currentUser) {
                showSection('customerDashboard');
                updateDashboard();
            }
        }
    }
}

function saveSession(user, admin = false) {
    localStorage.setItem('pilgrimsSession', JSON.stringify({
        username: user.username,
        isAdmin: admin
    }));
}

function clearSession() {
    localStorage.removeItem('pilgrimsSession');
    currentUser = null;
    isAdmin = false;
}

// Navigation
function showSection(section) {
    // Hide all sections
    const sections = document.querySelectorAll('.cover-page, .auth-section, .dashboard-section, .admin-dashboard');
    sections.forEach(s => s.classList.add('hidden'));

    // Show requested section
    switch(section) {
        case 'cover':
            document.getElementById('coverPage').classList.remove('hidden');
            break;
        case 'register':
            document.getElementById('registerPage').classList.remove('hidden');
            break;
        case 'login':
            document.getElementById('loginPage').classList.remove('hidden');
            break;
        case 'forgotPassword':
            document.getElementById('forgotPasswordPage').classList.remove('hidden');
            break;
        case 'adminLogin':
            document.getElementById('adminLoginPage').classList.remove('hidden');
            break;
        case 'customerDashboard':
            document.getElementById('customerDashboard').classList.remove('hidden');
            updateDashboard();
            break;
        case 'adminDashboard':
            document.getElementById('adminDashboard').classList.remove('hidden');
            updateAdminDashboard();
            break;
    }
}

function showDashboardSection(section) {
    // Hide all dashboard content sections
    const contents = document.querySelectorAll('.dashboard-content');
    contents.forEach(c => c.classList.add('hidden'));

    // Update nav buttons
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => btn.classList.remove('active'));

    // Show requested section
    switch(section) {
        case 'overview':
            document.getElementById('overviewSection').classList.remove('hidden');
            navBtns[0].classList.add('active');
            break;
        case 'mining':
            document.getElementById('miningSection').classList.remove('hidden');
            navBtns[1].classList.add('active');
            break;
        case 'wallet':
            document.getElementById('walletSection').classList.remove('hidden');
            navBtns[2].classList.add('active');
            break;
        case 'exchange':
            document.getElementById('exchangeSection').classList.remove('hidden');
            navBtns[3].classList.add('active');
            break;
        case 'trading':
            document.getElementById('tradingSection').classList.remove('hidden');
            navBtns[4].classList.add('active');
            break;
        case 'transactions':
            document.getElementById('transactionsSection').classList.remove('hidden');
            navBtns[5].classList.add('active');
            break;
        case 'profile':
            document.getElementById('profileSection').classList.remove('hidden');
            navBtns[6].classList.add('active');
            break;
    }
}

function showAdminSection(section) {
    // Hide all admin content sections
    const contents = document.querySelectorAll('.admin-content');
    contents.forEach(c => c.classList.add('hidden'));

    // Update nav buttons
    const navBtns = document.querySelectorAll('.admin-nav-btn');
    navBtns.forEach(btn => btn.classList.remove('active'));

    // Show requested section
    switch(section) {
        case 'overview':
            document.getElementById('adminOverviewSection').classList.remove('hidden');
            navBtns[0].classList.add('active');
            break;
        case 'customers':
            document.getElementById('adminCustomersSection').classList.remove('hidden');
            navBtns[1].classList.add('active');
            break;
        case 'transactions':
            document.getElementById('adminTransactionsSection').classList.remove('hidden');
            navBtns[2].classList.add('active');
            break;
        case 'security':
            document.getElementById('adminSecuritySection').classList.remove('hidden');
            navBtns[3].classList.add('active');
            break;
        case 'system':
            document.getElementById('adminSystemSection').classList.remove('hidden');
            navBtns[4].classList.add('active');
            break;
    }
}

// Registration
function handleRegister(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Validate passwords match
    if (formData.get('password') !== formData.get('confirmPassword')) {
        alert('Passwords do not match!');
        return;
    }

    // Check if user already exists
    const existingUser = DB.users.find(u => u.username === formData.get('username') || u.email === formData.get('email'));
    if (existingUser) {
        alert('Username or email already exists!');
        return;
    }

    // Generate account number and serial number
    const accountNumber = generateAccountNumber();
    const serialNumber = generateSerialNumber();

    // Create user object
    const newUser = {
        username: formData.get('username'),
        password: formData.get('password'),
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        country: formData.get('country'),
        dob: formData.get('dob'),
        idType: formData.get('idType'),
        idNumber: formData.get('idNumber'),
        bvnNin: formData.get('bvnNin'),
        accountNumber: accountNumber,
        serialNumber: serialNumber,
        walletAddress: `PGC-${accountNumber}-${serialNumber}`,
        coinBalance: 0.00000000,
        cashBalance: 0.00,
        createdAt: new Date().toISOString(),
        status: 'active',
        miningEnabled: true
    };

    // Save user
    DB.users.push(newUser);
    saveDB();

    // Show success message
    alert(`Registration successful!\n\nAccount Number: ${accountNumber}\nSerial Number: ${serialNumber}\n\nPlease check your email for confirmation.`);
    
    // Reset form and go to login
    form.reset();
    showSection('login');
}

function generateAccountNumber() {
    let accountNumber;
    do {
        accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    } while (DB.users.find(u => u.accountNumber === accountNumber));
    return accountNumber;
}

function generateSerialNumber() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let serial = '';
    for (let i = 0; i < 2; i++) {
        serial += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 6; i++) {
        serial += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    return serial;
}

// Login
function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const username = formData.get('username');
    const password = formData.get('password');

    // Find user
    const user = DB.users.find(u => 
        (u.username === username || u.email === username) && u.password === password
    );

    if (user) {
        if (user.status !== 'active') {
            alert('Your account is not active. Please contact support.');
            return;
        }

        currentUser = user;
        saveSession(user);
        showSection('customerDashboard');
        updateDashboard();
        form.reset();
    } else {
        alert('Invalid username or password!');
    }
}

function handleAdminLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const username = formData.get('adminUsername');
    const password = formData.get('adminPassword');

    if (username === DB.admin.username && password === DB.admin.password) {
        isAdmin = true;
        currentUser = DB.admin;
        saveSession(DB.admin, true);
        showSection('adminDashboard');
        updateAdminDashboard();
        form.reset();
    } else {
        alert('Invalid admin credentials!');
    }
}

function handleForgotPassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const email = formData.get('email');

    const user = DB.users.find(u => u.email === email);
    
    if (user) {
        // Generate temporary password
        const tempPassword = Math.random().toString(36).substring(2, 10);
        user.tempPassword = tempPassword;
        saveDB();

        alert(`A temporary password has been sent to your email: ${tempPassword}\n\nPlease login and change your password.`);
        form.reset();
        showSection('login');
    } else {
        alert('Email not found!');
    }
}

// Logout
function handleLogout() {
    stopMining();
    clearSession();
    showSection('cover');
}

function handleAdminLogout() {
    clearSession();
    isAdmin = false;
    showSection('cover');
}

// Dashboard updates
function updateDashboard() {
    if (!currentUser) return;

    // Update user info
    document.getElementById('customerName').textContent = `Welcome, ${currentUser.fullName}`;
    document.getElementById('customerAccount').textContent = `Account: ${currentUser.accountNumber}`;
    document.getElementById('customerEmail').textContent = currentUser.email;

    // Update wallet balances
    document.getElementById('coinBalance').textContent = currentUser.coinBalance.toFixed(8);
    document.getElementById('cashBalance').textContent = `$${currentUser.cashBalance.toFixed(2)}`;
    document.getElementById('myWalletAddress').value = currentUser.walletAddress;

    // Update overview stats
    document.getElementById('overviewCoin').textContent = `${currentUser.coinBalance.toFixed(8)} PGC`;
    document.getElementById('overviewCash').textContent = `$${currentUser.cashBalance.toFixed(2)} USD`;

    // Update profile section
    document.getElementById('profileFullName').value = currentUser.fullName;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('profilePhone').value = currentUser.phone;
    document.getElementById('profileAccountNumber').value = currentUser.accountNumber;
    document.getElementById('profileSerialNumber').value = currentUser.serialNumber;

    // Update transaction history
    updateTransactionHistory();
}

function updateAdminDashboard() {
    // Update stats
    document.getElementById('totalCustomers').textContent = DB.users.length;
    
    let totalPGC = 0;
    let totalCash = 0;
    DB.users.forEach(user => {
        totalPGC += user.coinBalance;
        totalCash += user.cashBalance;
    });
    
    document.getElementById('totalPGC').textContent = totalPGC.toFixed(8);
    document.getElementById('totalCash').textContent = `$${totalCash.toFixed(2)}`;
    document.getElementById('totalTransactionsAdmin').textContent = DB.transactions.length;
    document.getElementById('activeMiners').textContent = DB.users.filter(u => u.miningEnabled).length;

    // Update customer list
    updateCustomerList();
    updateAdminTransactionList();
}

function updateCustomerList() {
    const tbody = document.getElementById('customerTableBody');
    
    if (DB.users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-customers">No customers yet</td></tr>';
        return;
    }

    tbody.innerHTML = DB.users.map(user => `
        <tr>
            <td>${user.accountNumber}</td>
            <td>${user.fullName}</td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td>${user.coinBalance.toFixed(8)} PGC</td>
            <td>$${user.cashBalance.toFixed(2)}</td>
            <td><span class="status-${user.status}">${user.status}</span></td>
            <td>
                <button onclick="editCustomer('${user.username}')" class="action-btn small">Edit</button>
                <button onclick="creditCustomer('${user.username}')" class="action-btn small credit">Credit</button>
                <button onclick="debitCustomer('${user.username}')" class="action-btn small debit">Debit</button>
            </td>
        </tr>
    `).join('');
}

function updateTransactionHistory() {
    const tbody = document.getElementById('transactionTableBody');
    const userTransactions = DB.transactions.filter(t => t.username === currentUser.username);
    
    if (userTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-transactions">No transactions yet</td></tr>';
        return;
    }

    tbody.innerHTML = userTransactions.slice(-10).reverse().map(tx => `
        <tr>
            <td>${new Date(tx.timestamp).toLocaleString()}</td>
            <td>${tx.type}</td>
            <td>${tx.description}</td>
            <td>${tx.amount}</td>
            <td><span class="status-${tx.status}">${tx.status}</span></td>
            <td>${tx.details}</td>
        </tr>
    `).join('');
}

function updateAdminTransactionList() {
    const tbody = document.getElementById('adminTransactionTableBody');
    
    if (DB.transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-transactions">No transactions yet</td></tr>';
        return;
    }

    tbody.innerHTML = DB.transactions.slice(-20).reverse().map(tx => `
        <tr>
            <td>${new Date(tx.timestamp).toLocaleString()}</td>
            <td>${tx.type}</td>
            <td>${tx.username}</td>
            <td>${tx.amount}</td>
            <td><span class="status-${tx.status}">${tx.status}</span></td>
            <td>${tx.details}</td>
        </tr>
    `).join('');
}

// Mining functionality
function startMining() {
    if (isMining) return;
    
    isMining = true;
    document.getElementById('miningStatus').textContent = 'Active';
    document.getElementById('miningStatus').className = 'status-active';
    document.getElementById('miningToggle').innerHTML = '<i class="fas fa-pause"></i> Pause Mining';
    
    miningInterval = setInterval(() => {
        if (currentUser && currentUser.miningEnabled) {
            // Add mining amount
            const miningAmount = DB.settings.miningRate;
            currentUser.coinBalance += miningAmount;
            currentUser.cashBalance += miningAmount * DB.settings.pgcValue;
            
            // Update display
            minedAmount += miningAmount;
            document.getElementById('miningCounter').textContent = minedAmount.toFixed(8);
            document.getElementById('miningRate').textContent = DB.settings.miningRate.toFixed(8);
            document.getElementById('miningRateDisplay').textContent = `${DB.settings.miningRate.toFixed(8)} PGC/second`;
            document.getElementById('totalMined').textContent = currentUser.coinBalance.toFixed(8);
            document.getElementById('totalMinedDisplay').textContent = currentUser.coinBalance.toFixed(8);
            document.getElementById('todayMining').textContent = minedAmount.toFixed(8);
            document.getElementById('cashEarned').textContent = `$${(currentUser.cashBalance).toFixed(2)}`;
            document.getElementById('coinBalance').textContent = currentUser.coinBalance.toFixed(8);
            document.getElementById('cashBalance').textContent = `$${currentUser.cashBalance.toFixed(2)}`;
            document.getElementById('overviewCoin').textContent = `${currentUser.coinBalance.toFixed(8)} PGC`;
            document.getElementById('overviewCash').textContent = `$${currentUser.cashBalance.toFixed(2)} USD`;

            // Save to database
            saveDB();
        }
    }, 1000);
}

function pauseMining() {
    if (!isMining) return;
    
    clearInterval(miningInterval);
    isMining = false;
    document.getElementById('miningStatus').textContent = 'Paused';
    document.getElementById('miningStatus').className = 'status-paused';
    document.getElementById('miningToggle').innerHTML = '<i class="fas fa-play"></i> Resume Mining';
}

function stopMining() {
    clearInterval(miningInterval);
    isMining = false;
    minedAmount = 0;
}

function toggleMining() {
    if (isMining) {
        pauseMining();
    } else {
        startMining();
    }
}

// Wallet operations
function handleSendCrypto(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const walletAddress = formData.get('walletAddress');
    const amount = parseFloat(formData.get('amount'));
    const currency = formData.get('currency');

    if (currency === 'PGC' && amount > currentUser.coinBalance) {
        alert('Insufficient PGC balance!');
        return;
    }

    if (currency === 'PGC-CASH' && amount > currentUser.cashBalance) {
        alert('Insufficient cash balance!');
        return;
    }

    // Create transaction
    const transaction = {
        id: Date.now(),
        username: currentUser.username,
        type: 'send',
        description: `Sent ${amount} ${currency} to ${walletAddress}`,
        amount: `${amount} ${currency}`,
        status: 'completed',
        details: `To: ${walletAddress}`,
        timestamp: new Date().toISOString()
    };

    // Update balances
    if (currency === 'PGC') {
        currentUser.coinBalance -= amount;
    } else if (currency === 'PGC-CASH') {
        currentUser.cashBalance -= amount;
    }

    // Save transaction
    DB.transactions.push(transaction);
    saveDB();
    updateDashboard();

    // Notify network of new transaction
    NetworkBridge.sendMessage('investment', {
        type: 'TRANSACTION',
        data: transaction
    });
    
    NetworkBridge.sendMessage('customer', {
        type: 'TRANSACTION',
        data: transaction
    });

    alert('Transaction successful!');
    form.reset();
}

function handleDeposit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const amount = parseFloat(formData.get('amount'));

    // Create transaction
    const transaction = {
        id: Date.now(),
        username: currentUser.username,
        type: 'deposit',
        description: `Deposit via ${formData.get('depositMethod')}`,
        amount: `$${amount.toFixed(2)}`,
        status: 'completed',
        details: `Method: ${formData.get('depositMethod')}`,
        timestamp: new Date().toISOString()
    };

    // Update balance
    currentUser.cashBalance += amount;

    // Save transaction
    DB.transactions.push(transaction);
    saveDB();
    updateDashboard();

    alert('Deposit successful!');
    form.reset();
}

function handleWithdraw(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const amount = parseFloat(formData.get('amount'));

    if (amount > currentUser.cashBalance) {
        alert('Insufficient balance!');
        return;
    }

    // Create transaction
    const transaction = {
        id: Date.now(),
        username: currentUser.username,
        type: 'withdrawal',
        description: `Withdrawal via ${formData.get('withdrawMethod')}`,
        amount: `$${amount.toFixed(2)}`,
        status: 'completed',
        details: `To: ${formData.get('destination')}`,
        timestamp: new Date().toISOString()
    };

    // Update balance
    currentUser.cashBalance -= amount;

    // Save transaction
    DB.transactions.push(transaction);
    saveDB();
    updateDashboard();

    alert('Withdrawal successful!');
    form.reset();
}

function copyWalletAddress() {
    const walletAddress = document.getElementById('myWalletAddress');
    walletAddress.select();
    document.execCommand('copy');
    alert('Wallet address copied to clipboard!');
}

// Exchange functionality
function updateExchangeRate() {
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;
    
    const rates = {
        'PGC': { 'USD': 0.50, 'BTC': 0.000015, 'ETH': 0.0005, 'BCH': 0.002 },
        'USD': { 'PGC': 2.0, 'BTC': 0.00003, 'ETH': 0.001, 'BCH': 0.004 },
        'BTC': { 'PGC': 66666.67, 'USD': 33333.33, 'ETH': 33.33, 'BCH': 133.33 },
        'ETH': { 'PGC': 2000.0, 'USD': 1000.0, 'BTC': 0.03, 'BCH': 4.0 },
        'BCH': { 'PGC': 500.0, 'USD': 250.0, 'BTC': 0.0075, 'ETH': 0.25 }
    };

    const rate = rates[fromCurrency]?.[toCurrency] || 1;
    document.getElementById('exchangeRate').textContent = `1 ${fromCurrency} = ${rate.toFixed(8)} ${toCurrency}`;
    calculateExchange();
}

function calculateExchange() {
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;
    const amount = parseFloat(document.getElementById('exchangeAmount').value) || 0;
    
    const rates = {
        'PGC': { 'USD': 0.50, 'BTC': 0.000015, 'ETH': 0.0005, 'BCH': 0.002 },
        'USD': { 'PGC': 2.0, 'BTC': 0.00003, 'ETH': 0.001, 'BCH': 0.004 },
        'BTC': { 'PGC': 66666.67, 'USD': 33333.33, 'ETH': 33.33, 'BCH': 133.33 },
        'ETH': { 'PGC': 2000.0, 'USD': 1000.0, 'BTC': 0.03, 'BCH': 4.0 },
        'BCH': { 'PGC': 500.0, 'USD': 250.0, 'BTC': 0.0075, 'ETH': 0.25 }
    };

    const rate = rates[fromCurrency]?.[toCurrency] || 1;
    const result = amount * rate;
    
    document.getElementById('exchangeResult').textContent = result.toFixed(8);
    document.getElementById('exchangeToCurrency').textContent = toCurrency;
}

function handleExchange(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const fromCurrency = formData.get('fromCurrency');
    const toCurrency = formData.get('toCurrency');
    const amount = parseFloat(formData.get('amount'));

    // Validate balance
    if (fromCurrency === 'PGC' && amount > currentUser.coinBalance) {
        alert('Insufficient PGC balance!');
        return;
    }

    if (fromCurrency === 'USD' && amount > currentUser.cashBalance) {
        alert('Insufficient USD balance!');
        return;
    }

    // Calculate exchange
    const rates = {
        'PGC': { 'USD': 0.50, 'BTC': 0.000015, 'ETH': 0.0005, 'BCH': 0.002 },
        'USD': { 'PGC': 2.0, 'BTC': 0.00003, 'ETH': 0.001, 'BCH': 0.004 },
        'BTC': { 'PGC': 66666.67, 'USD': 33333.33, 'ETH': 33.33, 'BCH': 133.33 },
        'ETH': { 'PGC': 2000.0, 'USD': 1000.0, 'BTC': 0.03, 'BCH': 4.0 },
        'BCH': { 'PGC': 500.0, 'USD': 250.0, 'BTC': 0.0075, 'ETH': 0.25 }
    };

    const rate = rates[fromCurrency]?.[toCurrency] || 1;
    const result = amount * rate;

    // Update balances
    if (fromCurrency === 'PGC') {
        currentUser.coinBalance -= amount;
    } else if (fromCurrency === 'USD') {
        currentUser.cashBalance -= amount;
    }

    if (toCurrency === 'PGC') {
        currentUser.coinBalance += result;
    } else if (toCurrency === 'USD') {
        currentUser.cashBalance += result;
    }

    // Create transaction
    const transaction = {
        id: Date.now(),
        username: currentUser.username,
        type: 'exchange',
        description: `Exchanged ${amount} ${fromCurrency} to ${result.toFixed(8)} ${toCurrency}`,
        amount: `${amount} ${fromCurrency} → ${result.toFixed(8)} ${toCurrency}`,
        status: 'completed',
        details: `Rate: 1 ${fromCurrency} = ${rate} ${toCurrency}`,
        timestamp: new Date().toISOString()
    };

    // Save transaction
    DB.transactions.push(transaction);
    saveDB();
    updateDashboard();

    // Notify network of new transaction
    NetworkBridge.sendMessage('investment', {
        type: 'TRANSACTION',
        data: transaction
    });
    
    NetworkBridge.sendMessage('customer', {
        type: 'TRANSACTION',
        data: transaction
    });

    alert('Exchange successful!');
    form.reset();
    updateExchangeRate();
}

// Trading functionality
function handleBuy(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const amount = parseFloat(formData.get('amount'));

    if (amount > currentUser.cashBalance) {
        alert('Insufficient cash balance!');
        return;
    }

    const pgcAmount = amount / DB.settings.pgcValue;

    // Update balances
    currentUser.cashBalance -= amount;
    currentUser.coinBalance += pgcAmount;

    // Create transaction
    const transaction = {
        id: Date.now(),
        username: currentUser.username,
        type: 'buy',
        description: `Bought ${pgcAmount.toFixed(8)} PGC for $${amount.toFixed(2)}`,
        amount: `${pgcAmount.toFixed(8)} PGC`,
        status: 'completed',
        details: `Order Type: ${formData.get('orderType')}`,
        timestamp: new Date().toISOString()
    };

    // Save transaction
    DB.transactions.push(transaction);
    saveDB();
    updateDashboard();

    alert(`Successfully bought ${pgcAmount.toFixed(8)} PGC!`);
    form.reset();
}

function handleSell(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const amount = parseFloat(formData.get('amount'));

    if (amount > currentUser.coinBalance) {
        alert('Insufficient PGC balance!');
        return;
    }

    const cashAmount = amount * DB.settings.pgcValue;

    // Update balances
    currentUser.coinBalance -= amount;
    currentUser.cashBalance += cashAmount;

    // Create transaction
    const transaction = {
        id: Date.now(),
        username: currentUser.username,
        type: 'sell',
        description: `Sold ${amount.toFixed(8)} PGC for $${cashAmount.toFixed(2)}`,
        amount: `$${cashAmount.toFixed(2)}`,
        status: 'completed',
        details: `Order Type: ${formData.get('orderType')}`,
        timestamp: new Date().toISOString()
    };

    // Save transaction
    DB.transactions.push(transaction);
    saveDB();
    updateDashboard();

    alert(`Successfully sold ${amount.toFixed(8)} PGC for $${cashAmount.toFixed(2)}!`);
    form.reset();
}

// Profile management
function updateProfile(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);

    currentUser.fullName = formData.get('fullName');
    currentUser.email = formData.get('email');
    currentUser.phone = formData.get('phone');

    saveDB();
    updateDashboard();

    alert('Profile updated successfully!');
}

function changePassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);

    if (formData.get('currentPassword') !== currentUser.password) {
        alert('Current password is incorrect!');
        return;
    }

    if (formData.get('newPassword') !== formData.get('confirmPassword')) {
        alert('New passwords do not match!');
        return;
    }

    currentUser.password = formData.get('newPassword');
    saveDB();

    alert('Password changed successfully!');
    form.reset();
}

// Admin functions
function creditCustomer(username) {
    const user = DB.users.find(u => u.username === username);
    if (!user) return;

    const amount = prompt(`Enter amount to credit ${user.fullName}:`);
    if (!amount || isNaN(amount)) return;

    const creditAmount = parseFloat(amount);
    const currency = prompt('Enter currency (PGC or USD):', 'PGC');

    if (currency === 'PGC') {
        user.coinBalance += creditAmount;
    } else {
        user.cashBalance += creditAmount;
    }

    // Create transaction
    const transaction = {
        id: Date.now(),
        username: user.username,
        type: 'credit',
        description: `Admin credit of ${creditAmount} ${currency}`,
        amount: `+${creditAmount} ${currency}`,
        status: 'completed',
        details: `Admin: ${DB.admin.name}`,
        timestamp: new Date().toISOString()
    };

    DB.transactions.push(transaction);
    saveDB();
    updateCustomerList();
    updateAdminDashboard();

    alert(`Successfully credited ${creditAmount} ${currency} to ${user.fullName}!`);
}

function debitCustomer(username) {
    const user = DB.users.find(u => u.username === username);
    if (!user) return;

    const amount = prompt(`Enter amount to debit ${user.fullName}:`);
    if (!amount || isNaN(amount)) return;

    const debitAmount = parseFloat(amount);
    const currency = prompt('Enter currency (PGC or USD):', 'PGC');

    if (currency === 'PGC') {
        if (debitAmount > user.coinBalance) {
            alert('Insufficient PGC balance!');
            return;
        }
        user.coinBalance -= debitAmount;
    } else {
        if (debitAmount > user.cashBalance) {
            alert('Insufficient USD balance!');
            return;
        }
        user.cashBalance -= debitAmount;
    }

    // Create transaction
    const transaction = {
        id: Date.now(),
        username: user.username,
        type: 'debit',
        description: `Admin debit of ${debitAmount} ${currency}`,
        amount: `-${debitAmount} ${currency}`,
        status: 'completed',
        details: `Admin: ${DB.admin.name}`,
        timestamp: new Date().toISOString()
    };

    DB.transactions.push(transaction);
    saveDB();
    updateCustomerList();
    updateAdminDashboard();

    alert(`Successfully debited ${debitAmount} ${currency} from ${user.fullName}!`);
}

function editCustomer(username) {
    const user = DB.users.find(u => u.username === username);
    if (!user) return;

    const newFullName = prompt('Enter new full name:', user.fullName);
    const newEmail = prompt('Enter new email:', user.email);
    const newPhone = prompt('Enter new phone:', user.phone);
    const newStatus = prompt('Enter new status (active/suspended):', user.status);

    if (newFullName) user.fullName = newFullName;
    if (newEmail) user.email = newEmail;
    if (newPhone) user.phone = newPhone;
    if (newStatus && (newStatus === 'active' || newStatus === 'suspended')) {
        user.status = newStatus;
    }

    saveDB();
    updateCustomerList();

    alert('Customer information updated successfully!');
}

function showCreateCustomerModal() {
    // This would open a modal to create a new customer
    alert('Customer creation modal would open here. For now, customers can register through the main page.');
}

function updatePGCValue() {
    const newValue = parseFloat(document.getElementById('pgcValue').value);
    if (!isNaN(newValue) && newValue > 0) {
        DB.settings.pgcValue = newValue;
        saveDB();
        alert('PGC value updated successfully!');
    } else {
        alert('Invalid value!');
    }
}

function updateMiningRate() {
    const newRate = parseFloat(document.getElementById('miningRateSetting').value);
    if (!isNaN(newRate) && newRate > 0) {
        DB.settings.miningRate = newRate;
        saveDB();
        alert('Mining rate updated successfully!');
    } else {
        alert('Invalid rate!');
    }
}

// Initialize exchange rate on page load
updateExchangeRate();

// Update network status display
function updateNetworkStatus() {
    const status = NetworkBridge.getConnectionStatus();
    console.log('[MainBank] Network Status:', status);
    
    // You can add UI elements to display network status
    // For example, add connection indicators to the header
}

// Expose sync function for manual trigger
window.manualSync = async function() {
    const result = await NetworkBridge.syncNow();
    alert(result.message);
    if (result.success) {
        loadDB();
        if (currentUser) {
            updateDashboard();
        }
        if (isAdmin) {
            updateAdminDashboard();
        }
    }
};