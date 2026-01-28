// Pilgrim Customer Banking Portal - Main JavaScript

// Database simulation using localStorage
const CustomerDB = {
    customers: [],
    transactions: []
};

// Load database from localStorage
function loadCustomerDB() {
    const savedDB = localStorage.getItem('pilgrimCustomerDB');
    if (savedDB) {
        const parsedDB = JSON.parse(savedDB);
        CustomerDB.customers = parsedDB.customers || [];
        CustomerDB.transactions = parsedDB.transactions || [];
    }
    
    // Also sync with main bank database
    syncWithMainBank();
}

// Save database to localStorage
function saveCustomerDB() {
    localStorage.setItem('pilgrimCustomerDB', JSON.stringify(CustomerDB));
    
    // Notify network of data changes
    if (currentCustomer) {
        NetworkBridge.sendMessage('mainBank', {
            type: 'BALANCE_UPDATE',
            data: {
                username: currentCustomer.username,
                coinBalance: currentCustomer.pgcBalance,
                cashBalance: currentCustomer.mainBalance
            }
        });
        
        NetworkBridge.sendMessage('investment', {
            type: 'USER_UPDATE',
            data: {
                username: currentCustomer.username,
                fullName: currentCustomer.fullName,
                email: currentCustomer.email,
                phone: currentCustomer.phone
            }
        });
    }
}

// Sync with main bank database
function syncWithMainBank() {
    const mainBankDB = localStorage.getItem('pilgrimsBankDB');
    if (mainBankDB) {
        const parsedDB = JSON.parse(mainBankDB);
        
        // Sync users from main bank to customers
        parsedDB.users.forEach(user => {
            const existingCustomer = CustomerDB.customers.find(c => c.username === user.username);
            if (!existingCustomer) {
                CustomerDB.customers.push({
                    username: user.username,
                    password: user.password,
                    fullName: user.fullName,
                    email: user.email,
                    phone: user.phone,
                    accountNumber: user.accountNumber,
                    walletAddress: user.walletAddress,
                    mainBalance: user.cashBalance,
                    pgcBalance: user.coinBalance,
                    pendingBalance: 0,
                    createdAt: user.createdAt
                });
            } else {
                // Update balances from main bank
                existingCustomer.mainBalance = user.cashBalance;
                existingCustomer.pgcBalance = user.coinBalance;
            }
        });
        
        // Sync transactions
        parsedDB.transactions.forEach(tx => {
            const existingTx = CustomerDB.transactions.find(t => t.id === tx.id);
            if (!existingTx) {
                CustomerDB.transactions.push(tx);
            }
        });
        
        saveCustomerDB();
    }
}

// Current customer session
let currentCustomer = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadCustomerDB();
    checkCustomerSession();
    
    // Initialize Network Bridge
    NetworkBridge.init('customer');
    
    // Listen for network events
    window.addEventListener('network-connection', (event) => {
        console.log('[Customer] Connected to:', event.detail.platform);
        updateNetworkStatus();
    });
    
    window.addEventListener('network-disconnection', () => {
        console.log('[Customer] Network disconnected');
        updateNetworkStatus();
    });
    
    window.addEventListener('transaction-update', (event) => {
        console.log('[Customer] Transaction update received:', event.detail.transaction);
        // Refresh transaction history
        if (currentCustomer) {
            updateTransactionHistory();
        }
    });
    
    window.addEventListener('balance-update', (event) => {
        console.log('[Customer] Balance update received:', event.detail.balanceData);
        // Refresh balances if current customer matches
        if (currentCustomer && event.detail.balanceData.username === currentCustomer.username) {
            syncWithMainBank();
            currentCustomer = CustomerDB.customers.find(c => c.username === currentCustomer.username);
            updateCustomerDashboard();
        }
    });
    
    window.addEventListener('user-update', (event) => {
        console.log('[Customer] User update received:', event.detail.userData);
        loadCustomerDB();
        if (currentCustomer) {
            updateCustomerDashboard();
        }
    });
    
    // Auto-refresh balances every 30 seconds
    setInterval(refreshBalances, 30000);
});

// Session management
function checkCustomerSession() {
    const session = localStorage.getItem('pilgrimCustomerSession');
    if (session) {
        const parsedSession = JSON.parse(session);
        currentCustomer = CustomerDB.customers.find(c => c.username === parsedSession.username);
        if (currentCustomer) {
            showSection('customerDashboard');
            updateCustomerDashboard();
        }
    }
}

function saveCustomerSession(customer) {
    localStorage.setItem('pilgrimCustomerSession', JSON.stringify({
        username: customer.username
    }));
}

function clearCustomerSession() {
    localStorage.removeItem('pilgrimCustomerSession');
    currentCustomer = null;
}

// Navigation
function showSection(section) {
    // Hide all sections
    const sections = document.querySelectorAll('.customer-cover-page, .customer-auth-section, .customer-dashboard');
    sections.forEach(s => s.classList.add('hidden'));

    // Show requested section
    switch(section) {
        case 'cover':
            document.getElementById('customerCoverPage').classList.remove('hidden');
            break;
        case 'register':
            document.getElementById('customerRegisterPage').classList.remove('hidden');
            break;
        case 'login':
            document.getElementById('customerLoginPage').classList.remove('hidden');
            break;
        case 'forgotPassword':
            document.getElementById('customerForgotPasswordPage').classList.remove('hidden');
            break;
        case 'customerDashboard':
            document.getElementById('customerDashboard').classList.remove('hidden');
            updateCustomerDashboard();
            break;
    }
}

function showCustomerSection(section) {
    // Hide all action sections
    const actionSections = document.querySelectorAll('.action-section, .profile-section');
    actionSections.forEach(s => s.classList.add('hidden'));

    // Update nav buttons
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => btn.classList.remove('active'));

    // Show requested section
    switch(section) {
        case 'dashboard':
            navBtns[0].classList.add('active');
            break;
        case 'send':
            document.getElementById('sendMoneySection').classList.remove('hidden');
            navBtns[1].classList.add('active');
            break;
        case 'receive':
            document.getElementById('receiveMoneySection').classList.remove('hidden');
            navBtns[2].classList.add('active');
            break;
        case 'exchange':
            document.getElementById('exchangeSection').classList.remove('hidden');
            navBtns[3].classList.add('active');
            break;
        case 'history':
            document.getElementById('historySection').classList.remove('hidden');
            navBtns[4].classList.add('active');
            break;
        case 'profile':
            document.getElementById('profileSection').classList.remove('hidden');
            navBtns[5].classList.add('active');
            break;
    }
}

function showActionSection(section) {
    showCustomerSection(section);
}

// Customer Registration
function handleCustomerRegister(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Validate passwords match
    if (formData.get('password') !== formData.get('confirmPassword')) {
        alert('Passwords do not match!');
        return;
    }

    // Check if user already exists
    const existingCustomer = CustomerDB.customers.find(c => 
        c.username === formData.get('username') || c.email === formData.get('email')
    );
    if (existingCustomer) {
        alert('Username or email already exists!');
        return;
    }

    // Generate account number
    const accountNumber = generateCustomerAccountNumber();

    // Create customer object
    const newCustomer = {
        username: formData.get('username'),
        password: formData.get('password'),
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        country: formData.get('country'),
        accountType: formData.get('accountType'),
        accountNumber: accountNumber,
        walletAddress: `PGC-${accountNumber}-CUSTOMER`,
        mainBalance: 0.00,
        pgcBalance: 0.00000000,
        pendingBalance: 0.00,
        createdAt: new Date().toISOString()
    };

    // Save customer
    CustomerDB.customers.push(newCustomer);
    saveCustomerDB();

    alert(`Registration successful!\n\nAccount Number: ${accountNumber}\n\nYou can now login to your account.`);
    
    form.reset();
    showSection('login');
}

function generateCustomerAccountNumber() {
    let accountNumber;
    do {
        accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    } while (CustomerDB.customers.find(c => c.accountNumber === accountNumber));
    return accountNumber;
}

// Customer Login
function handleCustomerLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const username = formData.get('username');
    const password = formData.get('password');

    // Sync with main bank first
    syncWithMainBank();

    // Find customer
    const customer = CustomerDB.customers.find(c => 
        (c.username === username || c.email === username) && c.password === password
    );

    if (customer) {
        currentCustomer = customer;
        saveCustomerSession(customer);
        showSection('customerDashboard');
        updateCustomerDashboard();
        form.reset();
    } else {
        alert('Invalid username or password!');
    }
}

function handleCustomerForgotPassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const email = formData.get('email');

    const customer = CustomerDB.customers.find(c => c.email === email);
    
    if (customer) {
        // Generate temporary password
        const tempPassword = Math.random().toString(36).substring(2, 10);
        customer.tempPassword = tempPassword;
        saveCustomerDB();

        alert(`A temporary password has been sent to your email: ${tempPassword}\n\nPlease login and change your password.`);
        form.reset();
        showSection('login');
    } else {
        alert('Email not found!');
    }
}

// Logout
function handleCustomerLogout() {
    clearCustomerSession();
    showSection('cover');
}

// Dashboard updates
function updateCustomerDashboard() {
    if (!currentCustomer) return;

    // Sync with main bank for latest balances
    syncWithMainBank();
    
    // Reload current customer with updated data
    currentCustomer = CustomerDB.customers.find(c => c.username === currentCustomer.username);

    // Update customer info
    document.getElementById('customerName').textContent = `Welcome, ${currentCustomer.fullName}`;
    document.getElementById('customerAccount').textContent = `Account: ${currentCustomer.accountNumber}`;
    document.getElementById('customerEmail').textContent = currentCustomer.email;

    // Update balances
    document.getElementById('mainBalance').textContent = `$${currentCustomer.mainBalance.toFixed(2)}`;
    document.getElementById('pendingBalance').textContent = `$${currentCustomer.pendingBalance.toFixed(2)}`;
    document.getElementById('pgcBalance').textContent = currentCustomer.pgcBalance.toFixed(8);

    // Update receive section
    document.getElementById('myAccountNumber').value = currentCustomer.accountNumber;
    document.getElementById('myUsername').value = currentCustomer.username;
    document.getElementById('myPGCWallet').value = currentCustomer.walletAddress;

    // Update profile section
    document.getElementById('customerProfileFullName').value = currentCustomer.fullName;
    document.getElementById('customerProfileEmail').value = currentCustomer.email;
    document.getElementById('customerProfilePhone').value = currentCustomer.phone;
    document.getElementById('customerProfileAccountNumber').value = currentCustomer.accountNumber;
    document.getElementById('customerProfileUsername').value = currentCustomer.username;

    // Update transaction history
    updateTransactionHistory();
}

function refreshBalances() {
    if (currentCustomer) {
        syncWithMainBank();
        currentCustomer = CustomerDB.customers.find(c => c.username === currentCustomer.username);
        updateCustomerDashboard();
        console.log('Balances refreshed');
    }
}

function updateTransactionHistory() {
    const tbody = document.getElementById('customerTransactionTableBody');
    const customerTransactions = CustomerDB.transactions.filter(t => 
        t.username === currentCustomer.username || 
        t.from === currentCustomer.username || 
        t.to === currentCustomer.username
    );
    
    if (customerTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-transactions">No transactions yet</td></tr>';
        return;
    }

    tbody.innerHTML = customerTransactions.slice(-20).reverse().map(tx => {
        let amountDisplay = tx.amount;
        let type = tx.type;
        
        // Determine if it's sent or received
        if (tx.from === currentCustomer.username) {
            amountDisplay = `-$${amountDisplay}`;
            type = 'send';
        } else if (tx.to === currentCustomer.username) {
            amountDisplay = `+$${amountDisplay}`;
            type = 'receive';
        }
        
        return `
            <tr>
                <td>${new Date(tx.timestamp).toLocaleString()}</td>
                <td>${type}</td>
                <td>${tx.description}</td>
                <td>${amountDisplay}</td>
                <td>$${currentCustomer.mainBalance.toFixed(2)}</td>
                <td><span class="status-${tx.status}">${tx.status}</span></td>
            </tr>
        `;
    }).join('');
}

// Send Money
function handleSendMoney(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const recipientType = formData.get('recipientType');
    const amount = parseFloat(formData.get('amount'));

    if (amount > currentCustomer.mainBalance) {
        alert('Insufficient balance!');
        return;
    }

    let recipientUsername = '';
    let recipientAccount = '';
    let description = formData.get('description') || 'Transfer';

    if (recipientType === 'customer') {
        recipientUsername = formData.get('recipientUsername');
        const recipient = CustomerDB.customers.find(c => c.username === recipientUsername);
        
        if (!recipient) {
            alert('Recipient not found!');
            return;
        }

        // Credit recipient
        recipient.mainBalance += amount;
        recipientAccount = recipient.accountNumber;
    } else if (recipientType === 'external') {
        recipientAccount = formData.get('accountNumber');
        description = `Transfer to bank account ${recipientAccount}`;
    } else if (recipientType === 'crypto') {
        recipientAccount = formData.get('walletAddress');
        description = `Crypto transfer to ${recipientAccount}`;
    }

    // Debit sender
    currentCustomer.mainBalance -= amount;

    // Create transaction
    const transaction = {
        id: Date.now(),
        from: currentCustomer.username,
        to: recipientUsername || recipientAccount,
        username: currentCustomer.username,
        type: 'send',
        description: description,
        amount: amount.toFixed(2),
        status: 'completed',
        timestamp: new Date().toISOString()
    };

    // Save transaction and update database
    CustomerDB.transactions.push(transaction);
    saveCustomerDB();

    // Update main bank database
    updateMainBankDatabase(currentCustomer);

    // Notify network of new transaction
    NetworkBridge.sendMessage('mainBank', {
        type: 'TRANSACTION',
        data: transaction
    });
    
    NetworkBridge.sendMessage('investment', {
        type: 'TRANSACTION',
        data: transaction
    });

    alert('Money sent successfully!');
    form.reset();
    updateCustomerDashboard();
}

function updateRecipientFields() {
    const recipientType = document.querySelector('select[name="recipientType"]').value;
    
    document.getElementById('recipientUsernameGroup').classList.add('hidden');
    document.getElementById('recipientAccountGroup').classList.add('hidden');
    document.getElementById('recipientWalletGroup').classList.add('hidden');

    if (recipientType === 'customer') {
        document.getElementById('recipientUsernameGroup').classList.remove('hidden');
    } else if (recipientType === 'external') {
        document.getElementById('recipientAccountGroup').classList.remove('hidden');
    } else if (recipientType === 'crypto') {
        document.getElementById('recipientWalletGroup').classList.remove('hidden');
    }
}

// Copy functions
function copyAccountNumber() {
    const accountNumber = document.getElementById('myAccountNumber');
    accountNumber.select();
    document.execCommand('copy');
    alert('Account number copied to clipboard!');
}

function copyUsername() {
    const username = document.getElementById('myUsername');
    username.select();
    document.execCommand('copy');
    alert('Username copied to clipboard!');
}

function copyPGCWallet() {
    const wallet = document.getElementById('myPGCWallet');
    wallet.select();
    document.execCommand('copy');
    alert('PGC Wallet address copied to clipboard!');
}

// Exchange functionality
function updateCustomerExchangeRate() {
    const fromCurrency = document.getElementById('customerFromCurrency').value;
    const toCurrency = document.getElementById('customerToCurrency').value;
    
    const rates = {
        'USD': { 'PGC': 2.0, 'BTC': 0.00003, 'ETH': 0.001 },
        'PGC': { 'USD': 0.50, 'BTC': 0.000015, 'ETH': 0.0005 },
        'BTC': { 'USD': 33333.33, 'PGC': 66666.67, 'ETH': 33.33 },
        'ETH': { 'USD': 1000.0, 'PGC': 2000.0, 'BTC': 0.03 }
    };

    const rate = rates[fromCurrency]?.[toCurrency] || 1;
    document.getElementById('customerExchangeRate').textContent = `1 ${fromCurrency} = ${rate.toFixed(8)} ${toCurrency}`;
    calculateCustomerExchange();
}

function calculateCustomerExchange() {
    const fromCurrency = document.getElementById('customerFromCurrency').value;
    const toCurrency = document.getElementById('customerToCurrency').value;
    const amount = parseFloat(document.getElementById('customerExchangeAmount').value) || 0;
    
    const rates = {
        'USD': { 'PGC': 2.0, 'BTC': 0.00003, 'ETH': 0.001 },
        'PGC': { 'USD': 0.50, 'BTC': 0.000015, 'ETH': 0.0005 },
        'BTC': { 'USD': 33333.33, 'PGC': 66666.67, 'ETH': 33.33 },
        'ETH': { 'USD': 1000.0, 'PGC': 2000.0, 'BTC': 0.03 }
    };

    const rate = rates[fromCurrency]?.[toCurrency] || 1;
    const result = amount * rate;
    
    document.getElementById('customerExchangeResult').textContent = result.toFixed(8);
    document.getElementById('customerExchangeToCurrency').textContent = toCurrency;
}

function handleCustomerExchange(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const fromCurrency = formData.get('fromCurrency');
    const toCurrency = formData.get('toCurrency');
    const amount = parseFloat(formData.get('amount'));

    // Validate balance
    if (fromCurrency === 'USD' && amount > currentCustomer.mainBalance) {
        alert('Insufficient USD balance!');
        return;
    }

    if (fromCurrency === 'PGC' && amount > currentCustomer.pgcBalance) {
        alert('Insufficient PGC balance!');
        return;
    }

    // Calculate exchange
    const rates = {
        'USD': { 'PGC': 2.0, 'BTC': 0.00003, 'ETH': 0.001 },
        'PGC': { 'USD': 0.50, 'BTC': 0.000015, 'ETH': 0.0005 },
        'BTC': { 'USD': 33333.33, 'PGC': 66666.67, 'ETH': 33.33 },
        'ETH': { 'USD': 1000.0, 'PGC': 2000.0, 'BTC': 0.03 }
    };

    const rate = rates[fromCurrency]?.[toCurrency] || 1;
    const result = amount * rate;

    // Update balances
    if (fromCurrency === 'USD') {
        currentCustomer.mainBalance -= amount;
    } else if (fromCurrency === 'PGC') {
        currentCustomer.pgcBalance -= amount;
    }

    if (toCurrency === 'USD') {
        currentCustomer.mainBalance += result;
    } else if (toCurrency === 'PGC') {
        currentCustomer.pgcBalance += result;
    }

    // Create transaction
    const transaction = {
        id: Date.now(),
        username: currentCustomer.username,
        type: 'exchange',
        description: `Exchanged ${amount} ${fromCurrency} to ${result.toFixed(8)} ${toCurrency}`,
        amount: `${amount} ${fromCurrency} → ${result.toFixed(8)} ${toCurrency}`,
        status: 'completed',
        timestamp: new Date().toISOString()
    };

    // Save transaction and update database
    CustomerDB.transactions.push(transaction);
    saveCustomerDB();

    // Update main bank database
    updateMainBankDatabase(currentCustomer);

    // Notify network of new transaction
    NetworkBridge.sendMessage('mainBank', {
        type: 'TRANSACTION',
        data: transaction
    });
    
    NetworkBridge.sendMessage('investment', {
        type: 'TRANSACTION',
        data: transaction
    });

    alert('Exchange successful!');
    form.reset();
    updateCustomerExchangeRate();
    updateCustomerDashboard();
}

function updateMainBankDatabase(customer) {
    const mainBankDB = localStorage.getItem('pilgrimsBankDB');
    if (mainBankDB) {
        const parsedDB = JSON.parse(mainBankDB);
        const userIndex = parsedDB.users.findIndex(u => u.username === customer.username);
        
        if (userIndex !== -1) {
            parsedDB.users[userIndex].cashBalance = customer.mainBalance;
            parsedDB.users[userIndex].coinBalance = customer.pgcBalance;
            localStorage.setItem('pilgrimsBankDB', JSON.stringify(parsedDB));
        }
    }
}

// Profile management
function updateCustomerProfile(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);

    currentCustomer.fullName = formData.get('fullName');
    currentCustomer.email = formData.get('email');
    currentCustomer.phone = formData.get('phone');

    saveCustomerDB();
    updateCustomerDashboard();

    alert('Profile updated successfully!');
}

function changeCustomerPassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);

    if (formData.get('currentPassword') !== currentCustomer.password) {
        alert('Current password is incorrect!');
        return;
    }

    if (formData.get('newPassword') !== formData.get('confirmPassword')) {
        alert('New passwords do not match!');
        return;
    }

    currentCustomer.password = formData.get('newPassword');
    saveCustomerDB();

    alert('Password changed successfully!');
    form.reset();
}

// Initialize exchange rate
updateCustomerExchangeRate();

console.log('Pilgrim Customer Banking Portal loaded successfully!');
console.log('Connected to Global Bank Pilgrim Network');

// Update network status display
function updateNetworkStatus() {
    const status = NetworkBridge.getConnectionStatus();
    console.log('[Customer] Network Status:', status);
}

// Expose sync function for manual trigger
window.manualSync = async function() {
    const result = await NetworkBridge.syncNow();
    alert(result.message);
    if (result.success) {
        loadCustomerDB();
        if (currentCustomer) {
            updateCustomerDashboard();
        }
    }
};