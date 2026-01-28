// Pilgrim Investment Platform - Main JavaScript

// Database simulation using localStorage
const InvestmentDB = {
    investors: [],
    admin: {
        username: 'admin',
        password: 'admin123',
        name: 'Olawale Abdul-Ganiyu',
        email: 'adeganglobal@gmail.com'
    },
    returns: [],
    settings: {
        basicReturnRate: 0.08,
        standardReturnRate: 0.12,
        premiumReturnRate: 0.15
    }
};

// Load database from localStorage
function loadInvestmentDB() {
    const savedDB = localStorage.getItem('pilgrimInvestmentDB');
    if (savedDB) {
        const parsedDB = JSON.parse(savedDB);
        InvestmentDB.investors = parsedDB.investors || [];
        InvestmentDB.returns = parsedDB.returns || [];
        InvestmentDB.settings = parsedDB.settings || InvestmentDB.settings;
    }
}

// Save database to localStorage
function saveInvestmentDB() {
    localStorage.setItem('pilgrimInvestmentDB', JSON.stringify(InvestmentDB));
    
    // Notify network of data changes
    if (currentInvestor) {
        NetworkBridge.sendMessage('mainBank', {
            type: 'USER_UPDATE',
            data: {
                username: currentInvestor.username,
                fullName: currentInvestor.fullName,
                email: currentInvestor.email,
                phone: currentInvestor.phone
            }
        });
        
        NetworkBridge.sendMessage('customer', {
            type: 'USER_UPDATE',
            data: {
                username: currentInvestor.username,
                fullName: currentInvestor.fullName,
                email: currentInvestor.email,
                phone: currentInvestor.phone
            }
        });
    }
}

// Current investor session
let currentInvestor = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadInvestmentDB();
    checkInvestmentSession();
    
    // Initialize Network Bridge
    NetworkBridge.init('investment');
    
    // Listen for network events
    window.addEventListener('network-connection', (event) => {
        console.log('[Investment] Connected to:', event.detail.platform);
        updateNetworkStatus();
    });
    
    window.addEventListener('network-disconnection', () => {
        console.log('[Investment] Network disconnected');
        updateNetworkStatus();
    });
    
    window.addEventListener('transaction-update', (event) => {
        console.log('[Investment] Transaction update received:', event.detail.transaction);
        // Investment platform mainly monitors transactions
    });
    
    window.addEventListener('balance-update', (event) => {
        console.log('[Investment] Balance update received:', event.detail.balanceData);
        // Investment platform might want to track balance changes
    });
    
    window.addEventListener('user-update', (event) => {
        console.log('[Investment] User update received:', event.detail.userData);
        loadInvestmentDB();
    });
});

// Session management
function checkInvestmentSession() {
    const session = localStorage.getItem('pilgrimInvestmentSession');
    if (session) {
        const parsedSession = JSON.parse(session);
        currentInvestor = InvestmentDB.investors.find(i => i.username === parsedSession.username);
        if (currentInvestor) {
            showSection('investorDashboard');
            updateInvestorDashboard();
        }
    }
}

function saveInvestmentSession(investor) {
    localStorage.setItem('pilgrimInvestmentSession', JSON.stringify({
        username: investor.username
    }));
}

function clearInvestmentSession() {
    localStorage.removeItem('pilgrimInvestmentSession');
    currentInvestor = null;
}

// Navigation
function showSection(section) {
    // Hide all sections
    const sections = document.querySelectorAll('.investment-cover-page, .investment-auth-section, .investor-dashboard');
    sections.forEach(s => s.classList.add('hidden'));

    // Show requested section
    switch(section) {
        case 'cover':
            document.getElementById('investmentCoverPage').classList.remove('hidden');
            break;
        case 'register':
            document.getElementById('investmentRegisterPage').classList.remove('hidden');
            break;
        case 'login':
            document.getElementById('investmentLoginPage').classList.remove('hidden');
            break;
        case 'forgotPassword':
            document.getElementById('investmentForgotPasswordPage').classList.remove('hidden');
            break;
        case 'investorDashboard':
            document.getElementById('investorDashboard').classList.remove('hidden');
            updateInvestorDashboard();
            break;
    }
}

function showInvestorSection(section) {
    // Hide all dashboard content sections
    const contents = document.querySelectorAll('.dashboard-content');
    contents.forEach(c => c.classList.add('hidden'));

    // Update nav buttons
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => btn.classList.remove('active'));

    // Show requested section
    switch(section) {
        case 'overview':
            document.getElementById('investorOverviewSection').classList.remove('hidden');
            navBtns[0].classList.add('active');
            break;
        case 'portfolio':
            document.getElementById('investorPortfolioSection').classList.remove('hidden');
            navBtns[1].classList.add('active');
            break;
        case 'returns':
            document.getElementById('investorReturnsSection').classList.remove('hidden');
            navBtns[2].classList.add('active');
            break;
        case 'documents':
            document.getElementById('investorDocumentsSection').classList.remove('hidden');
            navBtns[3].classList.add('active');
            break;
        case 'contact':
            document.getElementById('investorContactSection').classList.remove('hidden');
            navBtns[4].classList.add('active');
            break;
        case 'profile':
            document.getElementById('investorProfileSection').classList.remove('hidden');
            navBtns[5].classList.add('active');
            break;
    }
}

// Investment Registration
function handleInvestmentRegister(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Validate passwords match
    if (formData.get('password') !== formData.get('confirmPassword')) {
        alert('Passwords do not match!');
        return;
    }

    // Check if user already exists
    const existingInvestor = InvestmentDB.investors.find(i => 
        i.username === formData.get('username') || i.email === formData.get('email')
    );
    if (existingInvestor) {
        alert('Username or email already exists!');
        return;
    }

    // Generate account number and serial number
    const accountNumber = generateInvestmentAccountNumber();
    const serialNumber = generateInvestmentSerialNumber();

    // Calculate return rate based on tier
    const tier = formData.get('tier');
    const investmentAmount = parseFloat(formData.get('investmentAmount'));
    const duration = parseInt(formData.get('duration'));
    
    let returnRate;
    switch(tier) {
        case 'basic':
            returnRate = InvestmentDB.settings.basicReturnRate;
            break;
        case 'standard':
            returnRate = InvestmentDB.settings.standardReturnRate;
            break;
        case 'premium':
            returnRate = InvestmentDB.settings.premiumReturnRate;
            break;
        default:
            returnRate = InvestmentDB.settings.basicReturnRate;
    }

    // Calculate expected return
    const expectedReturn = investmentAmount * (1 + returnRate * duration);
    const monthlyReturn = (investmentAmount * returnRate) / 12;
    const sharesOwned = Math.floor(investmentAmount / 100); // 1 share per $100

    // Create investor object
    const newInvestor = {
        username: formData.get('username'),
        password: formData.get('password'),
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        country: formData.get('country'),
        address: formData.get('address'),
        dob: formData.get('dob'),
        idType: formData.get('idType'),
        idNumber: formData.get('idNumber'),
        bvnNin: formData.get('bvnNin'),
        bankName: formData.get('bankName'),
        bankAccountNumber: formData.get('bankAccountNumber'),
        accountNumber: accountNumber,
        serialNumber: serialNumber,
        investmentType: formData.get('investmentType'),
        investmentAmount: investmentAmount,
        duration: duration,
        tier: tier,
        returnRate: returnRate,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + duration * 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        totalInvestment: investmentAmount,
        currentValue: investmentAmount,
        expectedReturn: expectedReturn,
        monthlyReturn: monthlyReturn,
        totalGain: 0,
        sharesOwned: sharesOwned,
        linkedPGC: 0,
        createdAt: new Date().toISOString()
    };

    // Save investor
    InvestmentDB.investors.push(newInvestor);
    saveInvestmentDB();

    // Send congratulatory email (simulated)
    sendCongratulationsEmail(newInvestor);

    // Show success message
    alert(`Registration successful!\n\nAccount Number: ${accountNumber}\nSerial Number: ${serialNumber}\n\nInvestment Amount: $${investmentAmount}\nExpected Return: $${expectedReturn.toFixed(2)}\n\nA confirmation email has been sent to ${newInvestor.email}.\n\nPlease wait for admin approval before you can access your dashboard.`);
    
    // Reset form and go to login
    form.reset();
    showSection('login');
}

function generateInvestmentAccountNumber() {
    let accountNumber;
    do {
        accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    } while (InvestmentDB.investors.find(i => i.accountNumber === accountNumber));
    return accountNumber;
}

function generateInvestmentSerialNumber() {
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

function sendCongratulationsEmail(investor) {
    // Simulate sending email
    console.log(`Sending congratulations email to ${investor.email}`);
    console.log(`Subject: Welcome to Pilgrim Investment - Account Created`);
    console.log(`Body: Dear ${investor.fullName},\n\nCongratulations! Your investment account has been created successfully.\n\nAccount Details:\nAccount Number: ${investor.accountNumber}\nSerial Number: ${investor.serialNumber}\nInvestment Amount: $${investor.investmentAmount}\nDuration: ${investor.duration} years\nExpected Return: $${investor.expectedReturn.toFixed(2)}\n\nYour account is currently pending approval. You will receive another email once your account is activated.\n\nBest regards,\nPilgrim Investment Team\n\nContact: adeganglobal@gmail.com, pilgrimshares@gmail.com`);
}

// Investment Login
function handleInvestmentLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const username = formData.get('username');
    const password = formData.get('password');

    // Find investor
    const investor = InvestmentDB.investors.find(i => 
        (i.username === username || i.email === username) && i.password === password
    );

    if (investor) {
        if (investor.status !== 'active') {
            alert('Your account is ' + investor.status + '. Please contact support.');
            return;
        }

        currentInvestor = investor;
        saveInvestmentSession(investor);
        showSection('investorDashboard');
        updateInvestorDashboard();
        form.reset();
    } else {
        alert('Invalid username or password!');
    }
}

function handleInvestmentForgotPassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const email = formData.get('email');

    const investor = InvestmentDB.investors.find(i => i.email === email);
    
    if (investor) {
        // Generate temporary password
        const tempPassword = Math.random().toString(36).substring(2, 10);
        investor.tempPassword = tempPassword;
        saveInvestmentDB();

        alert(`A temporary password has been sent to your email: ${tempPassword}\n\nPlease login and change your password.`);
        form.reset();
        showSection('login');
    } else {
        alert('Email not found!');
    }
}

// Logout
function handleInvestorLogout() {
    clearInvestmentSession();
    showSection('cover');
}

// Dashboard updates
function updateInvestorDashboard() {
    if (!currentInvestor) return;

    // Update investor info
    document.getElementById('investorName').textContent = `Welcome, ${currentInvestor.fullName}`;
    document.getElementById('investorAccount').textContent = `Serial: ${currentInvestor.serialNumber}`;
    document.getElementById('investorEmail').textContent = currentInvestor.email;

    // Update portfolio
    document.getElementById('totalInvestment').textContent = `$${currentInvestor.totalInvestment.toFixed(2)}`;
    document.getElementById('expectedReturn').textContent = `$${currentInvestor.expectedReturn.toFixed(2)}`;
    document.getElementById('currentValue').textContent = `$${currentInvestor.currentValue.toFixed(2)}`;
    document.getElementById('totalGain').textContent = `+$${currentInvestor.totalGain.toFixed(2)}`;
    document.getElementById('monthlyReturn').textContent = `$${currentInvestor.monthlyReturn.toFixed(2)}`;
    document.getElementById('sharesOwned').textContent = currentInvestor.sharesOwned;
    document.getElementById('investorTier').textContent = currentInvestor.tier.charAt(0).toUpperCase() + currentInvestor.tier.slice(1);

    // Update overview
    document.getElementById('investmentDuration').textContent = `${currentInvestor.duration} Years`;
    document.getElementById('startDate').textContent = new Date(currentInvestor.startDate).toLocaleDateString();
    document.getElementById('annualReturnRate').textContent = `${(currentInvestor.returnRate * 100).toFixed(0)}%`;
    document.getElementById('linkedPGC').textContent = currentInvestor.linkedPGC.toFixed(8);
    document.getElementById('accountStatus').textContent = currentInvestor.status.charAt(0).toUpperCase() + currentInvestor.status.slice(1);

    // Update portfolio details
    document.getElementById('principalAmount').textContent = `$${currentInvestor.totalInvestment.toFixed(2)}`;
    document.getElementById('interestEarned').textContent = `$${(currentInvestor.currentValue - currentInvestor.totalInvestment).toFixed(2)}`;
    document.getElementById('bonusReturns').textContent = `$${currentInvestor.totalGain.toFixed(2)}`;
    document.getElementById('portfolioTotal').textContent = `$${currentInvestor.currentValue.toFixed(2)}`;

    // Update profile section
    document.getElementById('investorProfileFullName').value = currentInvestor.fullName;
    document.getElementById('investorProfileEmail').value = currentInvestor.email;
    document.getElementById('investorProfilePhone').value = currentInvestor.phone;
    document.getElementById('investorProfileAccountNumber').value = currentInvestor.accountNumber;
    document.getElementById('investorProfileSerialNumber').value = currentInvestor.serialNumber;

    // Update contact form
    document.getElementById('senderName').textContent = currentInvestor.fullName;
    document.getElementById('senderAccount').textContent = currentInvestor.accountNumber;
    document.getElementById('senderSerial').textContent = currentInvestor.serialNumber;
    document.getElementById('senderEmail').textContent = currentInvestor.email;

    // Update returns history
    updateReturnsHistory();
}

function updateReturnsHistory() {
    const tbody = document.getElementById('returnsTableBody');
    const investorReturns = InvestmentDB.returns.filter(r => r.investorUsername === currentInvestor.username);
    
    if (investorReturns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-returns">No returns yet</td></tr>';
        return;
    }

    tbody.innerHTML = investorReturns.slice(-10).reverse().map(ret => `
        <tr>
            <td>${new Date(ret.date).toLocaleDateString()}</td>
            <td>${ret.type}</td>
            <td>$${ret.amount.toFixed(2)}</td>
            <td><span class="status-${ret.status}">${ret.status}</span></td>
            <td>${ret.details}</td>
        </tr>
    `).join('');
}

// Contact admin
function handleContactAdmin(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const message = {
        id: Date.now(),
        investorUsername: currentInvestor.username,
        investorName: currentInvestor.fullName,
        investorAccount: currentInvestor.accountNumber,
        investorSerial: currentInvestor.serialNumber,
        investorEmail: currentInvestor.email,
        recipientEmail: formData.get('recipientEmail'),
        ccEmail: formData.get('ccEmail'),
        subject: formData.get('subject'),
        message: formData.get('message'),
        timestamp: new Date().toISOString(),
        status: 'pending'
    };

    // Simulate sending email
    console.log('Sending message to admin:');
    console.log(`To: ${message.recipientEmail}`);
    console.log(`CC: ${message.ccEmail}`);
    console.log(`Subject: Investment Inquiry - ${message.subject}`);
    console.log(`From: ${message.investorName} (${message.investorEmail})`);
    console.log(`Account: ${message.investorAccount}`);
    console.log(`Serial: ${message.investorSerial}`);
    console.log(`Message: ${message.message}`);

    alert('Message sent successfully to administration!\n\nRecipient: adeganglobal@gmail.com\nCC: pilgrimshares@gmail.com\n\nYou will receive a response shortly.');
    
    form.reset();
}

// Profile management
function updateInvestorProfile(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);

    currentInvestor.fullName = formData.get('fullName');
    currentInvestor.email = formData.get('email');
    currentInvestor.phone = formData.get('phone');

    saveInvestmentDB();
    updateInvestorDashboard();

    alert('Profile updated successfully!');
}

function changeInvestorPassword(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);

    if (formData.get('currentPassword') !== currentInvestor.password) {
        alert('Current password is incorrect!');
        return;
    }

    if (formData.get('newPassword') !== formData.get('confirmPassword')) {
        alert('New passwords do not match!');
        return;
    }

    currentInvestor.password = formData.get('newPassword');
    saveInvestmentDB();

    alert('Password changed successfully!');
    form.reset();
}

// Investment form update
function updateInvestmentForm() {
    // This function can be used to update the form based on investment type selection
    const investmentType = document.querySelector('input[name="investmentType"]:checked').value;
    
    // You can add logic here to show/hide form fields based on investment type
    console.log('Investment type selected:', investmentType);
}

// Initialize
console.log('Pilgrim Investment Platform loaded successfully!');

// Update network status display
function updateNetworkStatus() {
    const status = NetworkBridge.getConnectionStatus();
    console.log('[Investment] Network Status:', status);
}

// Expose sync function for manual trigger
window.manualSync = async function() {
    const result = await NetworkBridge.syncNow();
    alert(result.message);
    if (result.success) {
        loadInvestmentDB();
        if (currentInvestor) {
            updateInvestorDashboard();
        }
    }
};