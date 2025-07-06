/**
 * WebSocket Helper Utilities
 * Optimized connection and message handling for tests
 */

// Wait for WebSocket connection with optimized timing
async function waitForWebSocketConnection(page, maxTimeout = 5000) {
  const startTime = Date.now();
  
  return await page.evaluate((timeout) => {
    return new Promise((resolve, reject) => {
      let checkCount = 0;
      const checkInterval = 100; // Check every 100ms
      
      const checkConnection = () => {
        checkCount++;
        
        // Check for connection status elements
        const statusElements = document.querySelectorAll(
          '[class*="connection"], [class*="status"], [data-connection-status]'
        );
        
        // Check for specific connection indicators
        const connected = Array.from(statusElements).some(el => {
          const text = el.textContent?.toLowerCase() || '';
          const classes = el.className?.toLowerCase() || '';
          const dataStatus = el.getAttribute('data-connection-status');
          
          return (
            text.includes('connected') ||
            text.includes('接続済') ||
            classes.includes('connected') ||
            classes.includes('online') ||
            dataStatus === 'connected'
          );
        });
        
        if (connected) {
          const elapsed = Date.now() - performance.now();
          resolve({
            connected: true,
            time: elapsed,
            attempts: checkCount
          });
          return;
        }
        
        // Check if we have a WebSocket connection in window
        if (window.ws && window.ws.readyState === WebSocket.OPEN) {
          resolve({
            connected: true,
            time: Date.now() - performance.now(),
            attempts: checkCount,
            directWs: true
          });
          return;
        }
        
        // Timeout check
        if (checkCount * checkInterval >= timeout) {
          resolve({
            connected: false,
            time: timeout,
            attempts: checkCount,
            reason: 'timeout'
          });
          return;
        }
        
        // Continue checking
        setTimeout(checkConnection, checkInterval);
      };
      
      // Start checking immediately
      checkConnection();
    });
  }, maxTimeout);
}

// Monitor WebSocket messages
async function monitorWebSocketMessages(page) {
  return await page.evaluateOnNewDocument(() => {
    window.__wsMessages = [];
    window.__wsErrors = [];
    
    // Intercept WebSocket constructor
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function(...args) {
      const ws = new OriginalWebSocket(...args);
      
      // Store reference
      window.ws = ws;
      
      // Monitor events
      ws.addEventListener('open', () => {
        window.__wsMessages.push({
          type: 'open',
          timestamp: Date.now(),
          url: args[0]
        });
      });
      
      ws.addEventListener('message', (event) => {
        let data = event.data;
        try {
          if (typeof data === 'string') {
            data = JSON.parse(data);
          }
        } catch (e) {
          // Keep as string if not JSON
        }
        
        window.__wsMessages.push({
          type: 'message',
          data: data,
          timestamp: Date.now()
        });
        
        // Dispatch custom events for specific message types
        if (data.type === 'ai_response') {
          window.dispatchEvent(new CustomEvent('ai_response_received', {
            detail: data
          }));
        }
      });
      
      ws.addEventListener('error', (event) => {
        window.__wsErrors.push({
          type: 'error',
          timestamp: Date.now(),
          error: event
        });
      });
      
      ws.addEventListener('close', (event) => {
        window.__wsMessages.push({
          type: 'close',
          timestamp: Date.now(),
          code: event.code,
          reason: event.reason
        });
      });
      
      return ws;
    };
  });
}

// Send message and wait for AI response with retry
async function sendMessageWithRetry(page, message, maxRetries = 3) {
  const input = await page.$('input[type="text"], textarea');
  if (!input) throw new Error('Chat input not found');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await input.fill(message);
      
      // Set up response listener before sending
      const responsePromise = page.evaluate(() => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Response timeout'));
          }, 15000);
          
          const handleResponse = (event) => {
            clearTimeout(timeout);
            window.removeEventListener('ai_response_received', handleResponse);
            resolve(event.detail);
          };
          
          window.addEventListener('ai_response_received', handleResponse);
        });
      });
      
      // Send message
      await page.keyboard.press('Enter');
      
      // Wait for response
      const response = await responsePromise;
      return { success: true, response, attempts: attempt };
      
    } catch (error) {
      console.log(`  Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < maxRetries) {
        console.log(`  Retrying in ${attempt}s...`);
        await page.waitForTimeout(attempt * 1000);
      } else {
        return { success: false, error: error.message, attempts: attempt };
      }
    }
  }
}

// Get WebSocket connection stats
async function getWebSocketStats(page) {
  return await page.evaluate(() => {
    const messages = window.__wsMessages || [];
    const errors = window.__wsErrors || [];
    
    const openEvent = messages.find(m => m.type === 'open');
    const closeEvent = messages.find(m => m.type === 'close');
    
    return {
      connected: window.ws && window.ws.readyState === WebSocket.OPEN,
      messageCount: messages.filter(m => m.type === 'message').length,
      errorCount: errors.length,
      connectionTime: openEvent ? openEvent.timestamp : null,
      disconnectionTime: closeEvent ? closeEvent.timestamp : null,
      lastMessage: messages[messages.length - 1],
      readyState: window.ws ? window.ws.readyState : -1
    };
  });
}

module.exports = {
  waitForWebSocketConnection,
  monitorWebSocketMessages,
  sendMessageWithRetry,
  getWebSocketStats
};