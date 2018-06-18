describe('Websocket Integration Test', () => {
  let Ravel, app, WebSocket;

  beforeEach(async () => {
    WebSocket = require('ws');
    Ravel = require('../../lib/ravel');
    app = new Ravel();
    app.set('log level', app.$log.NONE);
    app.set('keygrip keys', ['mysecret']);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('initialization & connection', () => {
    beforeEach(async () => {
      await app.init();
      await app.listen();
    });

    it('should allow clients to establish a connection, setting a session cookie for identification', async () => {
      const ws = new WebSocket('ws://0.0.0.0:8080');
      let cookies;
      await new Promise((resolve, reject) => {
        ws.on('upgrade', (response) => {
          cookies = response.headers['set-cookie'].join(';');
        });
        ws.on('open', resolve);
        ws.on('error', reject);
      });
      expect(cookies).toMatch(/ravel.ws.id=\w+;/);
      ws.close();
    });
  });

  describe('subscription', () => {
    let ws, wsSession;

    beforeEach(async () => {
      await app.init();
      await app.listen();
      // establish client connection
      const ws = new WebSocket('ws://0.0.0.0:8080');
      let wsSession;
      await new Promise((resolve, reject) => {
        ws.on('upgrade', (response) => {
          wsSession = response.headers['set-cookie'].join(';').match(/ravel.ws.id=(\w+)/)[1];
        });
        ws.on('open', resolve);
        ws.on('error', reject);
      });
    });

    afterEach(async => {
      ws.close();
    });

    it('should', () => {

    });
  });
});
