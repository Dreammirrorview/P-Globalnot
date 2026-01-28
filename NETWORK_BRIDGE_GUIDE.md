# Network Bridge System - Complete Guide

## 🌐 Overview

The Network Bridge is a sophisticated communication system that enables real-time synchronization between all three Pilgrims Banking Platform applications:

1. **Main Banking Platform** (Port 8081)
2. **Investment Platform** (Port 8082)
3. **Customer Portal** (Port 8083)

## 🔧 How It Works

### Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Main Bank     │◄────────┤  Investment     │◄────────┤   Customer      │
│   Platform      │────────►│   Platform      │────────►│    Portal       │
└─────────────────┘         └─────────────────┘         └─────────────────┘
       ▲                           ▲                           ▲
       │                           │                           │
       └───────────────────────────┴───────────────────────────┘
                            Network Bridge
                               (Core)
```

### Communication Protocols

The Network Bridge uses multiple protocols to ensure reliable communication:

1. **PostMessage** - For iframe/window communication
2. **BroadcastChannel** - For same-origin messaging between tabs
3. **LocalStorage Events** - For cross-tab communication
4. **Fetch API** - For cross-origin requests

### Message Types

The system handles several types of messages:

- `SYNC` - Request data synchronization
- `SYNC_RESPONSE` - Response to sync request
- `PING` - Check connectivity
- `PONG` - Response to ping
- `TRANSACTION` - New transaction notification
- `BALANCE_UPDATE` - Balance change notification
- `USER_UPDATE` - User information change

## 🚀 Usage Guide

### Automatic Synchronization

All platforms automatically sync every 5 seconds when online. No manual intervention required.

### Manual Synchronization

Trigger a manual sync from any platform's browser console:

```javascript
// In browser console
manualSync()
```

This will:
1. Attempt to sync with all connected platforms
2. Show success/failure message
3. Refresh local data if successful

### Network Status Monitoring

Access the Network Status Monitor at:
```
https://8084-44e9de80-50fc-494c-b5dd-8f85d4ee7971.sandbox-service.public.prod.myninja.ai
```

The monitor shows:
- **Network Status:** Online/Offline
- **Current Platform:** Which platform is being monitored
- **Connected Platforms:** Number of connected platforms
- **Queued Messages:** Messages waiting for delivery
- **Platform Details:** Connection status, endpoint, last sync time for each platform
- **Network Logs:** Real-time log of network activities

## 📊 Data Synchronization

### What Gets Synced

1. **User Data**
   - Username, full name, email, phone
   - Account information
   - Profile updates

2. **Balance Data**
   - PGC coin balance
   - Cash balance (USD)
   - Real-time updates

3. **Transaction Data**
   - All transactions
   - Transaction status
   - Transaction details

### Sync Flow

```
User Action on Platform A
        ↓
   Local Data Updated
        ↓
   Network Bridge Notified
        ↓
   Message Queued for Platforms B & C
        ↓
   Message Sent (if online)
        ↓
   Platforms B & C Update Local Data
        ↓
   UI Refreshes with New Data
```

## 🔌 Connection Management

### Connection States

- **Connected:** Platform is reachable and communicating
- **Disconnected:** Platform is unreachable
- **Reconnecting:** Attempting to re-establish connection

### Automatic Reconnection

The system automatically attempts to reconnect with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 1 second delay
- Attempt 3: 2 seconds delay
- Attempt 4: 4 seconds delay
- Maximum: 3 attempts per connection cycle

### Offline Support

When the network goes offline:
1. Messages are queued automatically
2. Queue persists in memory
3. When connection is restored, queued messages are sent
4. Failed messages are retried up to 3 times

## 🎯 Event System

### Available Events

All platforms listen for these custom events:

#### `network-connection`
Fired when a platform connects:
```javascript
window.addEventListener('network-connection', (event) => {
    console.log('Connected to:', event.detail.platform);
});
```

#### `network-disconnection`
Fired when network is lost:
```javascript
window.addEventListener('network-disconnection', () => {
    console.log('Network disconnected');
});
```

#### `transaction-update`
Fired when a new transaction is received:
```javascript
window.addEventListener('transaction-update', (event) => {
    console.log('New transaction:', event.detail.transaction);
});
```

#### `balance-update`
Fired when balance changes:
```javascript
window.addEventListener('balance-update', (event) => {
    console.log('Balance updated:', event.detail.balanceData);
});
```

#### `user-update`
Fired when user information changes:
```javascript
window.addEventListener('user-update', (event) => {
    console.log('User updated:', event.detail.userData);
});
```

## 🔍 Debugging

### Check Network Status

From browser console:
```javascript
const status = NetworkBridge.getConnectionStatus();
console.log(status);
```

This returns:
```javascript
{
    isOnline: true,
    currentPlatform: "mainBank",
    connections: {
        mainBank: { connected: true, lastSync: "...", endpoint: "..." },
        investment: { connected: true, lastSync: "...", endpoint: "..." },
        customer: { connected: true, lastSync: "...", endpoint: "..." }
    },
    messageQueue: 0
}
```

### View Message Queue

From browser console:
```javascript
console.log(NetworkBridge.messageQueue);
```

### Manual Message Sending

Send a custom message to a platform:
```javascript
NetworkBridge.sendMessage('investment', {
    type: 'CUSTOM_MESSAGE',
    data: { /* your data */ }
});
```

## ⚙️ Configuration

### Default Settings

```javascript
NetworkBridge.config = {
    mainBankPort: 8081,
    investmentPort: 8082,
    customerPort: 8083,
    syncInterval: 5000,    // 5 seconds
    retryAttempts: 3,
    retryDelay: 1000       // 1 second
}
```

### Changing Settings

You can modify settings before initialization:

```javascript
NetworkBridge.config.syncInterval = 10000; // Change to 10 seconds
NetworkBridge.init('mainBank');
```

## 🛠️ Advanced Usage

### Custom Event Handlers

Add custom logic to network events:

```javascript
window.addEventListener('balance-update', (event) => {
    if (event.detail.balanceData.username === currentUser.username) {
        // Custom handling for your balance updates
        showNotification('Your balance has been updated!');
    }
});
```

### Background Sync Control

Control background synchronization:

```javascript
// Stop auto-sync
clearInterval(NetworkBridge.syncInterval);

// Start custom sync
setInterval(() => {
    NetworkBridge.syncAllPlatforms();
}, 10000); // Every 10 seconds
```

### Platform-Specific Logic

Add logic based on current platform:

```javascript
if (NetworkBridge.currentPlatform === 'mainBank') {
    // Main bank specific logic
} else if (NetworkBridge.currentPlatform === 'customer') {
    // Customer portal specific logic
}
```

## 🔒 Security Considerations

### Message Validation

All messages should be validated before processing:
- Check message structure
- Verify message type
- Validate data format

### CORS Handling

The system handles CORS for cross-origin requests:
- Uses appropriate headers
- Handles preflight requests
- Falls back to alternative methods if needed

### Data Privacy

- Only necessary data is synced
- No sensitive passwords are transmitted
- Message queue is memory-only (not persisted)

## 📈 Performance Optimization

### Sync Frequency

Default: 5 seconds
Adjust based on your needs:
- Higher frequency = more real-time but more network traffic
- Lower frequency = less traffic but slower updates

### Message Batching

For high-volume scenarios, implement message batching:
```javascript
const messages = [...];
NetworkBridge.sendMessage('investment', {
    type: 'BATCH',
    data: messages
});
```

### Connection Pooling

The system maintains persistent connections when possible to reduce overhead.

## 🐛 Troubleshooting

### Platforms Not Connecting

**Problem:** Platforms show as disconnected

**Solutions:**
1. Check if all platforms are running on correct ports
2. Verify network connectivity
3. Check browser console for errors
4. Ensure CORS is properly configured

### Data Not Syncing

**Problem:** Changes on one platform don't appear on others

**Solutions:**
1. Check Network Status Monitor
2. Trigger manual sync with `manualSync()`
3. Verify LocalStorage is enabled
4. Clear browser cache and retry

### High Message Queue

**Problem:** Many messages queued

**Solutions:**
1. Check network connectivity
2. Verify all platforms are online
3. Restart platforms if needed
4. Check for infinite loops in sync logic

## 📞 Support

For issues or questions:
- Check Network Status Monitor for real-time diagnostics
- Review browser console logs
- Verify all platforms are running
- Check network connectivity

## 🎓 Best Practices

1. **Always initialize Network Bridge** when platform loads
2. **Listen for network events** to handle connection changes
3. **Use manual sync** when immediate synchronization is needed
4. **Monitor network status** regularly using the Status Monitor
5. **Handle offline scenarios** gracefully with user feedback
6. **Test on different browsers** to ensure cross-browser compatibility

## 🔮 Future Enhancements

Potential improvements:
- WebSocket support for real-time push notifications
- Message encryption for sensitive data
- Persistent message queue using IndexedDB
- Advanced conflict resolution for concurrent updates
- Compression for large data transfers
- Rate limiting to prevent spam

---

**Note:** This Network Bridge system is designed for demonstration purposes. For production use, consider implementing a proper backend with WebSocket support, message brokers (like Redis), and robust error handling.