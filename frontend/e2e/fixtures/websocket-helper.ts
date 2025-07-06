import { Page } from '@playwright/test';

export class WebSocketHelper {
  private page: Page;
  private messages: Array<{ type: 'sent' | 'received'; data: any; timestamp: Date }> = [];

  constructor(page: Page) {
    this.page = page;
  }

  async startMonitoring(wsUrl?: string) {
    this.messages = [];
    
    await this.page.evaluate((url) => {
      // @ts-ignore
      window.wsMessages = [];
      
      const originalWebSocket = window.WebSocket;
      // @ts-ignore
      window.WebSocket = function(url: string, protocols?: string | string[]) {
        console.log('WebSocket created:', url);
        const ws = new originalWebSocket(url, protocols);
        
        const originalSend = ws.send.bind(ws);
        ws.send = function(data: any) {
          // @ts-ignore
          window.wsMessages.push({
            type: 'sent',
            data: typeof data === 'string' ? JSON.parse(data) : data,
            timestamp: new Date()
          });
          return originalSend(data);
        };
        
        ws.addEventListener('message', (event) => {
          // @ts-ignore
          window.wsMessages.push({
            type: 'received',
            data: typeof event.data === 'string' ? JSON.parse(event.data) : event.data,
            timestamp: new Date()
          });
        });
        
        return ws;
      };
    }, wsUrl);
  }

  async getMessages() {
    const messages = await this.page.evaluate(() => {
      // @ts-ignore
      return window.wsMessages || [];
    });
    this.messages = messages;
    return messages;
  }

  async waitForMessage(predicate: (msg: any) => boolean, timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const messages = await this.getMessages();
      const found = messages.find(msg => predicate(msg));
      
      if (found) {
        return found;
      }
      
      await this.page.waitForTimeout(100);
    }
    
    throw new Error(`Message not found within ${timeout}ms`);
  }

  async sendMessage(data: any) {
    await this.page.evaluate((msg) => {
      const sockets = Array.from(document.querySelectorAll('*'))
        .map(el => (el as any).websocket)
        .filter(Boolean);
      
      if (sockets.length > 0) {
        sockets[0].send(JSON.stringify(msg));
      } else {
        throw new Error('No active WebSocket found');
      }
    }, data);
  }

  async waitForConnection(timeout = 30000) {
    await this.waitForMessage(
      msg => msg.type === 'sent' && msg.data.type === 'connect',
      timeout
    );
  }

  async simulateDisconnect() {
    await this.page.evaluate(() => {
      const sockets = Array.from(document.querySelectorAll('*'))
        .map(el => (el as any).websocket)
        .filter(Boolean);
      
      sockets.forEach(socket => socket.close());
    });
  }

  getMessagesByType(type: string) {
    return this.messages.filter(msg => msg.data?.type === type);
  }

  clear() {
    this.messages = [];
  }
}