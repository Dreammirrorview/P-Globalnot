// Network Bridge - Interconnects all three applications
// This file should be included in all three platforms

const NetworkBridge = {
    // Configuration
    config: {
        mainBankPort: 8081,
        investmentPort: 8082,
        customerPort: 8083,
        syncInterval: 5000, // 5 seconds
        retryAttempts: 3,
        retryDelay: 1000
    },

    // Current platform identification
    currentPlatform: null,

    // Connection status
    connections: {
        mainBank: { connected: false, lastSync: null, endpoint: null },
        investment: { connected: false, lastSync: null, endpoint: null },
        customer: { connected: false, lastSync: null, endpoint: null }
    },

    // Message queue for offline operations
    messageQueue: [],

    // Network status
    isOnline: navigator.onLine,

    // Initialize the bridge
    init(platform) {
        this.currentPlatform = platform;
        this.detectEndpoints();
        this.setupNetworkListeners();
        this.startBackgroundSync();
        console.log(`[NetworkBridge] Initialized on ${platform} platform`);
        this.connectToAllPlatforms();
    },

    // Detect endpoints based on current platform
    detectEndpoints() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;

        // Set endpoints for all platforms
        this.connections.mainBank.endpoint = `${protocol}//${hostname}:${this.config.mainBankPort}`;
        this.connections.investment.endpoint = `${protocol}//${hostname}:${this.config.investmentPort}`;
        this.connections.customer.endpoint = `${protocol}//${hostname}:${this.config.customerPort}`;
    },

    // Setup network event listeners
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('[NetworkBridge] Network connection restored');
            this.processMessageQueue();
            this.connectToAllPlatforms();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('[NetworkBridge] Network connection lost');
            this.notifyDisconnection();
        });

        // Listen for messages from other platforms
        window.addEventListener('message', (event) => {
            this.handleIncomingMessage(event);
        });
    },

    // Connect to all platforms
    async connectToAllPlatforms() {
        const platforms = ['mainBank', 'investment', 'customer'];
        
        for (const platform of platforms) {
            if (platform !== this.currentPlatform) {
                await this.connectToPlatform(platform);
            }
        }
    },

    // Connect to a specific platform
    async connectToPlatform(platform) {
        const connection = this.connections[platform];
        
        try {
            // Send ping to check connectivity
            const response = await this.sendPing(connection.endpoint);
            
            if (response) {
                connection.connected = true;
                connection.lastSync = new Date().toISOString();
                console.log(`[NetworkBridge] Connected to ${platform}`);
                this.notifyConnection(platform);
                
                // Perform initial sync
                await this.syncWithPlatform(platform);
            }
        } catch (error) {
            connection.connected = false;
            console.error(`[NetworkBridge] Failed to connect to ${platform}:`, error);
            await this.retryConnection(platform);
        }
    },

    // Send ping to check connectivity
    async sendPing(endpoint) {
        try {
            const response = await fetch(`${endpoint}/api/ping`, {
                method: 'GET',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.ok;
        } catch (error) {
            // Fallback: try to access the page directly
            try {
                const response = await fetch(endpoint, {
                    method: 'GET',
                    mode: 'no-cors'
                });
                return true;
            } catch (fallbackError) {
                return false;
            }
        }
    },

    // Retry connection with exponential backoff
    async retryConnection(platform, attempt = 1) {
        if (attempt > this.config.retryAttempts) {
            console.log(`[NetworkBridge] Max retry attempts reached for ${platform}`);
            return;
        }

        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`[NetworkBridge] Retrying connection to ${platform} (attempt ${attempt})`);
        await this.connectToPlatform(platform);
    },

    // Start background synchronization
    startBackgroundSync() {
        setInterval(() => {
            if (this.isOnline) {
                this.syncAllPlatforms();
            }
        }, this.config.syncInterval);
    },

    // Sync with all platforms
    async syncAllPlatforms() {
        const platforms = ['mainBank', 'investment', 'customer'];
        
        for (const platform of platforms) {
            if (platform !== this.currentPlatform && this.connections[platform].connected) {
                await this.syncWithPlatform(platform);
            }
        }
    },

    // Sync with a specific platform
    async syncWithPlatform(platform) {
        const connection = this.connections[platform];
        
        try {
            // Get local data
            const localData = this.getLocalData();
            
            // Send sync request
            const syncData = await this.sendMessage(platform, {
                type: 'SYNC',
                platform: this.currentPlatform,
                data: localData,
                timestamp: new Date().toISOString()
            });
            
            if (syncData) {
                // Update local data with sync response
                this.updateLocalData(syncData);
                connection.lastSync = new Date().toISOString();
                console.log(`[NetworkBridge] Synced with ${platform}`);
            }
        } catch (error) {
            console.error(`[NetworkBridge] Sync failed with ${platform}:`, error);
        }
    },

    // Send message to a platform
    async sendMessage(platform, message) {
        const connection = this.connections[platform];
        
        if (!connection.connected) {
            console.log(`[NetworkBridge] ${platform} not connected, queuing message`);
            this.queueMessage(platform, message);
            return null;
        }

        try {
            // Store message for potential retry
            const messageId = this.generateMessageId();
            message.messageId = messageId;
            
            // Try different communication methods
            let response = null;

            // Method 1: PostMessage (for same-origin or iframe communication)
            try {
                response = await this.sendViaPostMessage(platform, message);
            } catch (e) {
                console.log('[NetworkBridge] PostMessage failed, trying alternatives');
            }

            // Method 2: BroadcastChannel (for same-origin communication)
            if (!response) {
                try {
                    response = await this.sendViaBroadcastChannel(platform, message);
                } catch (e) {
                    console.log('[NetworkBridge] BroadcastChannel failed, trying alternatives');
                }
            }

            // Method 3: LocalStorage events (for same-origin communication)
            if (!response) {
                try {
                    response = await this.sendViaLocalStorage(platform, message);
                } catch (e) {
                    console.log('[NetworkBridge] LocalStorage failed, trying alternatives');
                }
            }

            // Method 4: Fetch API (for cross-origin communication)
            if (!response) {
                try {
                    response = await this.sendViaFetch(platform, message);
                } catch (e) {
                    console.log('[NetworkBridge] Fetch failed, queuing message');
                }
            }

            if (response) {
                return response;
            } else {
                this.queueMessage(platform, message);
                return null;
            }
        } catch (error) {
            console.error(`[NetworkBridge] Error sending message to ${platform}:`, error);
            this.queueMessage(platform, message);
            return null;
        }
    },

    // Send via PostMessage
    sendViaPostMessage(platform, message) {
        return new Promise((resolve, reject) => {
            const connection = this.connections[platform];
            
            // Try to find iframe or window for the platform
            const targetWindow = this.findPlatformWindow(platform);
            
            if (targetWindow) {
                const timeout = setTimeout(() => reject(new Error('PostMessage timeout')), 5000);
                
                const handler = (event) => {
                    if (event.data.messageId === message.messageId) {
                        clearTimeout(timeout);
                        window.removeEventListener('message', handler);
                        resolve(event.data);
                    }
                };
                
                window.addEventListener('message', handler);
                targetWindow.postMessage(message, '*');
            } else {
                reject(new Error('No target window found'));
            }
        });
    },

    // Send via BroadcastChannel
    sendViaBroadcastChannel(platform, message) {
        return new Promise((resolve, reject) => {
            const channelName = `pilgrim_network_${platform}`;
            const channel = new BroadcastChannel(channelName);
            
            const timeout = setTimeout(() => {
                channel.close();
                reject(new Error('BroadcastChannel timeout'));
            }, 5000);
            
            const handler = (event) => {
                if (event.data.messageId === message.messageId) {
                    clearTimeout(timeout);
                    channel.close();
                    resolve(event.data);
                }
            };
            
            channel.addEventListener('message', handler);
            channel.postMessage(message);
        });
    },

    // Send via LocalStorage events
    sendViaLocalStorage(platform, message) {
        return new Promise((resolve, reject) => {
            const storageKey = `pilgrim_network_${platform}_msg`;
            const responseKey = `pilgrim_network_${this.currentPlatform}_resp`;
            
            const timeout = setTimeout(() => {
                window.removeEventListener('storage', handler);
                reject(new Error('LocalStorage timeout'));
            }, 5000);
            
            const handler = (event) => {
                if (event.key === responseKey && event.newValue) {
                    clearTimeout(timeout);
                    window.removeEventListener('storage', handler);
                    const response = JSON.parse(event.newValue);
                    localStorage.removeItem(responseKey);
                    resolve(response);
                }
            };
            
            window.addEventListener('storage', handler);
            localStorage.setItem(storageKey, JSON.stringify(message));
        });
    },

    // Send via Fetch API
    async sendViaFetch(platform, message) {
        const connection = this.connections[platform];
        
        const response = await fetch(`${connection.endpoint}/api/network`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    },

    // Find platform window/iframe
    findPlatformWindow(platform) {
        // This would need to be implemented based on your actual setup
        // For now, return null as a placeholder
        return null;
    },

    // Handle incoming messages
    handleIncomingMessage(event) {
        const message = event.data;
        
        if (!message || !message.type) {
            return;
        }

        console.log(`[NetworkBridge] Received message from ${message.platform || 'unknown'}:`, message.type);

        switch (message.type) {
            case 'SYNC':
                this.handleSyncRequest(message);
                break;
            case 'PING':
                this.handlePingRequest(message);
                break;
            case 'TRANSACTION':
                this.handleTransactionMessage(message);
                break;
            case 'BALANCE_UPDATE':
                this.handleBalanceUpdate(message);
                break;
            case 'USER_UPDATE':
                this.handleUserUpdate(message);
                break;
            default:
                console.log('[NetworkBridge] Unknown message type:', message.type);
        }
    },

    // Handle sync request
    async handleSyncRequest(message) {
        console.log('[NetworkBridge] Handling sync request from', message.platform);
        
        const responseData = {
            type: 'SYNC_RESPONSE',
            platform: this.currentPlatform,
            messageId: message.messageId,
            data: this.getLocalData(),
            timestamp: new Date().toISOString()
        };

        // Send response back
        await this.sendResponse(message.platform, responseData);
    },

    // Handle ping request
    async handlePingRequest(message) {
        const responseData = {
            type: 'PONG',
            platform: this.currentPlatform,
            messageId: message.messageId,
            timestamp: new Date().toISOString()
        };

        await this.sendResponse(message.platform, responseData);
    },

    // Handle transaction message
    handleTransactionMessage(message) {
        console.log('[NetworkBridge] Handling transaction:', message.data);
        
        // Update local transaction data
        this.updateLocalTransaction(message.data);
        
        // Notify UI if available
        this.notifyTransactionUpdate(message.data);
    },

    // Handle balance update
    handleBalanceUpdate(message) {
        console.log('[NetworkBridge] Handling balance update:', message.data);
        
        // Update local balance data
        this.updateLocalBalance(message.data);
        
        // Notify UI if available
        this.notifyBalanceUpdate(message.data);
    },

    // Handle user update
    handleUserUpdate(message) {
        console.log('[NetworkBridge] Handling user update:', message.data);
        
        // Update local user data
        this.updateLocalUser(message.data);
        
        // Notify UI if available
        this.notifyUserUpdate(message.data);
    },

    // Send response to platform
    async sendResponse(platform, response) {
        const connection = this.connections[platform];
        
        try {
            // Try to send via LocalStorage event
            const responseKey = `pilgrim_network_${platform}_resp`;
            localStorage.setItem(responseKey, JSON.stringify(response));
            
            // Trigger storage event
            localStorage.setItem('pilgrim_network_trigger', Date.now().toString());
            localStorage.removeItem('pilgrim_network_trigger');
        } catch (error) {
            console.error('[NetworkBridge] Error sending response:', error);
        }
    },

    // Get local data for sync
    getLocalData() {
        const data = {
            users: [],
            transactions: [],
            investments: [],
            settings: {}
        };

        // Get data from LocalStorage
        try {
            // Main bank data
            const bankDB = localStorage.getItem('pilgrimsBankDB');
            if (bankDB) {
                const parsed = JSON.parse(bankDB);
                data.users = data.users.concat(parsed.users || []);
                data.transactions = data.transactions.concat(parsed.transactions || []);
            }

            // Investment data
            const investmentDB = localStorage.getItem('pilgrimInvestmentDB');
            if (investmentDB) {
                const parsed = JSON.parse(investmentDB);
                data.investments = data.investments.concat(parsed.investors || []);
            }

            // Customer data
            const customerDB = localStorage.getItem('pilgrimCustomerDB');
            if (customerDB) {
                const parsed = JSON.parse(customerDB);
                data.users = data.users.concat(parsed.customers || []);
            }
        } catch (error) {
            console.error('[NetworkBridge] Error getting local data:', error);
        }

        return data;
    },

    // Update local data from sync
    updateLocalData(remoteData) {
        try {
            // Update users
            if (remoteData.users && remoteData.users.length > 0) {
                this.updateLocalUsers(remoteData.users);
            }

            // Update transactions
            if (remoteData.transactions && remoteData.transactions.length > 0) {
                this.updateLocalTransactions(remoteData.transactions);
            }

            // Update investments
            if (remoteData.investments && remoteData.investments.length > 0) {
                this.updateLocalInvestments(remoteData.investments);
            }

            console.log('[NetworkBridge] Local data updated successfully');
        } catch (error) {
            console.error('[NetworkBridge] Error updating local data:', error);
        }
    },

    // Update local users
    updateLocalUsers(users) {
        // Update main bank users
        const bankDB = JSON.parse(localStorage.getItem('pilgrimsBankDB') || '{"users":[],"transactions":[],"settings":{}}');
        
        users.forEach(user => {
            const existingIndex = bankDB.users.findIndex(u => u.username === user.username);
            if (existingIndex >= 0) {
                bankDB.users[existingIndex] = { ...bankDB.users[existingIndex], ...user };
            } else {
                bankDB.users.push(user);
            }
        });
        
        localStorage.setItem('pilgrimsBankDB', JSON.stringify(bankDB));

        // Update customer portal users
        const customerDB = JSON.parse(localStorage.getItem('pilgrimCustomerDB') || '{"customers":[],"transactions":[]}');
        
        users.forEach(user => {
            const existingIndex = customerDB.customers.findIndex(c => c.username === user.username);
            if (existingIndex >= 0) {
                customerDB.customers[existingIndex] = { ...customerDB.customers[existingIndex], ...user };
            } else {
                customerDB.customers.push(user);
            }
        });
        
        localStorage.setItem('pilgrimCustomerDB', JSON.stringify(customerDB));
    },

    // Update local transactions
    updateLocalTransactions(transactions) {
        const bankDB = JSON.parse(localStorage.getItem('pilgrimsBankDB') || '{"users":[],"transactions":[],"settings":{}}');
        const customerDB = JSON.parse(localStorage.getItem('pilgrimCustomerDB') || '{"customers":[],"transactions":[]}');

        transactions.forEach(tx => {
            // Check if transaction already exists
            const existingInBank = bankDB.transactions.find(t => t.id === tx.id);
            if (!existingInBank) {
                bankDB.transactions.push(tx);
            }

            const existingInCustomer = customerDB.transactions.find(t => t.id === tx.id);
            if (!existingInCustomer) {
                customerDB.transactions.push(tx);
            }
        });

        localStorage.setItem('pilgrimsBankDB', JSON.stringify(bankDB));
        localStorage.setItem('pilgrimCustomerDB', JSON.stringify(customerDB));
    },

    // Update local investments
    updateLocalInvestments(investments) {
        const investmentDB = JSON.parse(localStorage.getItem('pilgrimInvestmentDB') || '{"investors":[],"returns":[],"settings":{}}');

        investments.forEach(investment => {
            const existingIndex = investmentDB.investors.findIndex(i => i.username === investment.username);
            if (existingIndex >= 0) {
                investmentDB.investors[existingIndex] = { ...investmentDB.investors[existingIndex], ...investment };
            } else {
                investmentDB.investors.push(investment);
            }
        });

        localStorage.setItem('pilgrimInvestmentDB', JSON.stringify(investmentDB));
    },

    // Queue message for offline operation
    queueMessage(platform, message) {
        const queuedMessage = {
            platform: platform,
            message: message,
            timestamp: new Date().toISOString(),
            attempts: 0
        };
        
        this.messageQueue.push(queuedMessage);
        console.log(`[NetworkBridge] Message queued for ${platform}`);
    },

    // Process message queue when online
    async processMessageQueue() {
        console.log('[NetworkBridge] Processing message queue...');
        
        while (this.messageQueue.length > 0) {
            const queuedMessage = this.messageQueue.shift();
            
            if (this.connections[queuedMessage.platform].connected) {
                try {
                    await this.sendMessage(queuedMessage.platform, queuedMessage.message);
                    console.log(`[NetworkBridge] Sent queued message to ${queuedMessage.platform}`);
                } catch (error) {
                    console.error(`[NetworkBridge] Failed to send queued message:`, error);
                    queuedMessage.attempts++;
                    
                    if (queuedMessage.attempts < this.config.retryAttempts) {
                        this.messageQueue.push(queuedMessage);
                    }
                }
            } else {
                // Re-queue if still not connected
                this.messageQueue.push(queuedMessage);
                break;
            }
        }
    },

    // Update specific local transaction
    updateLocalTransaction(transaction) {
        const bankDB = JSON.parse(localStorage.getItem('pilgrimsBankDB') || '{"users":[],"transactions":[],"settings":{}}');
        const customerDB = JSON.parse(localStorage.getItem('pilgrimCustomerDB') || '{"customers":[],"transactions":[]}');

        // Update or add transaction
        const bankIndex = bankDB.transactions.findIndex(t => t.id === transaction.id);
        if (bankIndex >= 0) {
            bankDB.transactions[bankIndex] = transaction;
        } else {
            bankDB.transactions.push(transaction);
        }

        const customerIndex = customerDB.transactions.findIndex(t => t.id === transaction.id);
        if (customerIndex >= 0) {
            customerDB.transactions[customerIndex] = transaction;
        } else {
            customerDB.transactions.push(transaction);
        }

        localStorage.setItem('pilgrimsBankDB', JSON.stringify(bankDB));
        localStorage.setItem('pilgrimCustomerDB', JSON.stringify(customerDB));
    },

    // Update local balance
    updateLocalBalance(balanceData) {
        const bankDB = JSON.parse(localStorage.getItem('pilgrimsBankDB') || '{"users":[],"transactions":[],"settings":{}}');
        
        const userIndex = bankDB.users.findIndex(u => u.username === balanceData.username);
        if (userIndex >= 0) {
            if (balanceData.coinBalance !== undefined) {
                bankDB.users[userIndex].coinBalance = balanceData.coinBalance;
            }
            if (balanceData.cashBalance !== undefined) {
                bankDB.users[userIndex].cashBalance = balanceData.cashBalance;
            }
            
            localStorage.setItem('pilgrimsBankDB', JSON.stringify(bankDB));
        }
    },

    // Update local user
    updateLocalUser(userData) {
        this.updateLocalUsers([userData]);
    },

    // Notification methods
    notifyConnection(platform) {
        this.dispatchCustomEvent('network-connection', { platform, connected: true });
    },

    notifyDisconnection() {
        this.dispatchCustomEvent('network-disconnection', { connected: false });
    },

    notifyTransactionUpdate(transaction) {
        this.dispatchCustomEvent('transaction-update', { transaction });
    },

    notifyBalanceUpdate(balanceData) {
        this.dispatchCustomEvent('balance-update', { balanceData });
    },

    notifyUserUpdate(userData) {
        this.dispatchCustomEvent('user-update', { userData });
    },

    // Dispatch custom event
    dispatchCustomEvent(eventName, detail) {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);
    },

    // Get connection status
    getConnectionStatus() {
        return {
            isOnline: this.isOnline,
            currentPlatform: this.currentPlatform,
            connections: {
                mainBank: { ...this.connections.mainBank },
                investment: { ...this.connections.investment },
                customer: { ...this.connections.customer }
            },
            messageQueue: this.messageQueue.length
        };
    },

    // Manual sync trigger
    async syncNow() {
        if (this.isOnline) {
            await this.syncAllPlatforms();
            return { success: true, message: 'Sync completed' };
        } else {
            return { success: false, message: 'Offline - messages queued' };
        }
    },

    // Generate unique message ID
    generateMessageId() {
        return `${this.currentPlatform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Platform will be initialized by each application
        console.log('[NetworkBridge] DOM ready, waiting for initialization');
    });
} else {
    console.log('[NetworkBridge] DOM already loaded');
}