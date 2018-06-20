describe('Websocket Integration Test', () => {
  let Ravel, app, WebSocket;

  beforeEach(async () => {
    WebSocket = require('ws');
    Ravel = require('../../lib/ravel');
    app = new Ravel();
    // choose random port to support jest parallelization
    app.set('port', Math.floor(Math.random() * 10000) + 10000);
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
      const ws = new WebSocket(`ws://0.0.0.0:${app.get('port')}`);
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
    let ws, agent;

    beforeEach(async () => {
      // test routes
      @Ravel.Routes('/ws')
      @Ravel.autoinject('$ws')
      class WS {
        @Ravel.Routes.mapping(Ravel.Routes.POST, 'subscribe')
        async subHandler (ctx) {
          ctx.body = await this.$ws.subscribe('a.channel', ctx);
        }
        @Ravel.Routes.mapping(Ravel.Routes.POST, 'subscribeBad')
        async badSubHandler (ctx) {
          ctx.body = await this.$ws.subscribe('a/channel', ctx);
        }
        @Ravel.Routes.mapping(Ravel.Routes.DELETE, 'subscribe')
        async unsubHandler (ctx) {
          ctx.body = await this.$ws.unsubscribe('a.channel', ctx);
        }
        @Ravel.Routes.mapping(Ravel.Routes.POST, 'publish')
        async publishHandler (ctx) {
          ctx.body = await this.$ws.publish('a.channel', 'message');
        }
      }
      app.load(WS);
      // bootstrap app
      await app.init();
      await app.listen();
      // establish client connection
      ws = new WebSocket(`ws://0.0.0.0:${app.get('port')}`);
      let wsResponseCookies;
      await new Promise((resolve, reject) => {
        ws.on('upgrade', (response) => {
          wsResponseCookies = response.headers['set-cookie'];
        });
        ws.on('open', resolve);
        ws.on('error', reject);
      });
      agent = request.agent(app.callback);
      wsResponseCookies[0]
        .split(',')
        .map(item => item.split(';')[0])
        .forEach(c => agent.jar.setCookie(c));
    });

    afterEach(() => {
      ws.close();
    });

    it('should ensure clients do not receive messages for topics they are not subscribed to', async () => {
      const messageSpy = jest.fn();
      ws.on('message', messageSpy);
      await agent.post('/ws/publish').expect(201);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(messageSpy).not.toHaveBeenCalled();
    });

    it('should allow clients to subscribe to topics and receive messages', async () => {
      const messageSpy = jest.fn();
      ws.on('message', messageSpy);
      await agent.post('/ws/subscribe').expect(201);
      await agent.post('/ws/publish').expect(201);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(messageSpy).toHaveBeenCalled();
    });

    it('should not react differently to multiple subscriptions to the same topic', async () => {
      const messageSpy = jest.fn();
      ws.on('message', messageSpy);
      await agent.post('/ws/subscribe').expect(201);
      await agent.post('/ws/subscribe').expect(201);
      await agent.post('/ws/subscribe').expect(201);
      await agent.post('/ws/publish').expect(201);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(messageSpy).toHaveBeenCalledTimes(1);
    });

    it('should allow clients to unsubscribe from topics and stop receiving messages', async () => {
      const messageSpy = jest.fn();
      ws.on('message', messageSpy);
      await agent.post('/ws/subscribe').expect(201);
      await agent.post('/ws/publish').expect(201);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await agent.delete('/ws/subscribe').expect(200);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await agent.post('/ws/publish').expect(201);
      expect(messageSpy).toHaveBeenCalledTimes(1);
    });

    it('should allow clients to unsubscribe from topics they haven not subscribed to', async () => {
      const messageSpy = jest.fn();
      ws.on('message', messageSpy);
      await agent.post('/ws/publish').expect(201);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await agent.delete('/ws/subscribe').expect(200);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await agent.post('/ws/publish').expect(201);
      expect(messageSpy).toHaveBeenCalledTimes(0);
    });

    it('should throw an error when clients attempt to subscribe to a non-dot-separated topic', async () => {
      await agent.post('/ws/subscribeBad').expect(400);
    });

    it('should throw an error when clients attempt to subscribe without a websocket cookie', async () => {
      await request(app.callback).post('/ws/subscribe').expect(500);
    });

    it('should clean up after itself when handling publishes', async () => {
      const messageSpy = jest.fn();
      ws.on('message', messageSpy);
      await agent.post('/ws/subscribe').expect(201);
      ws.close();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await agent.post('/ws/publish').expect(201);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(messageSpy).toHaveBeenCalledTimes(0);
    });
  });
});
