describe('Ravel end-to-end test', () => {
  const cacheWithoutExpiry = jest.fn(() => 'cache without expiry');
  const cacheWithExpiry = jest.fn(() => { return { message: 'cache with expiry' }; });
  const classCache = jest.fn(() => Buffer.from('class-level cache'));
  const postCache = jest.fn(() => 'post cache');
  const maxlengthStringCache = jest.fn(() => 'max length');
  const maxlengthBufferCache = jest.fn(() => Buffer.from('max length'));
  const maxlengthJSONCache = jest.fn(() => { return { message: 'max length' }; });
  const streamBody = jest.fn(function () {
    const Readable = require('stream').Readable;
    const stream = new Readable();
    stream._read = function (size) { /* do nothing */ };
    setTimeout(() => {
      stream.emit('data', 'a message');
      stream.emit('end');
    }, 2000);
    return stream;
  });
  const symbolBody = jest.fn(() => Symbol('message'));
  const cacheErrorBody = jest.fn(() => 'cache error');
  const middlewareErrorBody = jest.fn(() => { throw new Error(); });

  let app;
  describe('basic application server consisting of a resource', () => {
    beforeEach(async () => {
      const Ravel = require('../../lib/ravel');

      // stub Resource (REST interface)
      const cache = Ravel.Resource.cache;
      @Ravel.Resource('/api/resource')
      class TestResource {
        constructor (users) {
          this.users = users;
        }

        @cache
        getAll (ctx) {
          ctx.body = cacheWithoutExpiry();
        }

        @cache({ expire: 1 })
        get (ctx) {
          ctx.body = cacheWithExpiry();
        }
      }

      // stub Routes (miscellaneous routes, such as templated HTML content)
      const mapping = Ravel.Routes.mapping;

      @cache
      @Ravel.Routes('/api/routes')
      class TestRoutes {
        @mapping(Ravel.Routes.GET, '/')
        getHandler (ctx) {
          ctx.body = classCache();
          ctx.response.lastModified = new Date();
        }

        @cache({ maxLength: 2 })
        @mapping(Ravel.Routes.GET, '/maxlengthstring')
        getMaxLengthStringHandler (ctx) {
          ctx.body = maxlengthStringCache();
        }

        @cache({ maxLength: 2 })
        @mapping(Ravel.Routes.GET, '/maxlengthbuffer')
        getMaxLengthBufferHandler (ctx) {
          ctx.body = maxlengthBufferCache();
        }

        @cache({ maxLength: 2 })
        @mapping(Ravel.Routes.GET, '/maxlengthjson')
        getMaxLengthJSONHandler (ctx) {
          ctx.body = maxlengthJSONCache();
        }

        @mapping(Ravel.Routes.GET, '/symbolbody')
        getSymbolBody (ctx) {
          ctx.body = symbolBody();
        }

        @mapping(Ravel.Routes.GET, '/streambody')
        getStreamBody (ctx) {
          ctx.body = streamBody();
        }

        @mapping(Ravel.Routes.GET, '/cacheerror')
        getCacheErrorBody (ctx) {
          ctx.body = cacheErrorBody();
        }

        @mapping(Ravel.Routes.GET, '/middlewareerror')
        getMiddlewareErrorBody (ctx) {
          ctx.body = middlewareErrorBody();
        }

        @mapping(Ravel.Routes.POST, '/')
        postHandler (ctx) {
          ctx.body = postCache();
        }
      }

      app = new Ravel();
      app.set('log level', app.$log.NONE);
      app.set('keygrip keys', ['mysecret']);

      app.load(TestResource, TestRoutes);
      await app.init();
    });

    it('method-level @cache without expiry should respond with the appropriate string and then cache the response', async () => {
      await request(app.callback)
        .get('/api/resource')
        .expect(200, 'cache without expiry');
      expect(cacheWithoutExpiry).toHaveBeenCalledTimes(1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await request(app.callback)
        .get('/api/resource')
        .expect(200, 'cache without expiry');
      expect(cacheWithoutExpiry).toHaveBeenCalledTimes(1);
    });

    it('method-level @cache with expiry should respond with the appropriate string and then cache the response temporarily', async () => {
      await request(app.callback)
        .get('/api/resource/1')
        .expect(200, { message: 'cache with expiry' });
      expect(cacheWithExpiry).toHaveBeenCalledTimes(1);
      await request(app.callback)
        .get('/api/resource/1')
        .expect(200, { message: 'cache with expiry' });
      expect(cacheWithExpiry).toHaveBeenCalledTimes(1);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await request(app.callback)
        .get('/api/resource/1')
        .expect(200, { message: 'cache with expiry' });
      expect(cacheWithExpiry).toHaveBeenCalledTimes(2);
    });

    it('class-level @cache without expiry should respond with the appropriate string and then cache the response', async () => {
      await request(app.callback)
        .get('/api/routes')
        .expect(200);
      expect(classCache).toHaveBeenCalledTimes(1);
      await request(app.callback)
        .get('/api/routes')
        .expect(200);
      expect(classCache).toHaveBeenCalledTimes(1);
    });

    it('should not cache responses from non-GET routes', async () => {
      await request(app.callback)
        .post('/api/routes').type('application/json').send({})
        .expect(201, 'post cache');
      expect(postCache).toHaveBeenCalledTimes(1);
      await request(app.callback)
        .post('/api/routes').type('application/json').send({})
        .expect(201, 'post cache');
      expect(postCache).toHaveBeenCalledTimes(2);
    });

    it('should not cache string bodies which exceed the specified max length', async () => {
      await request(app.callback)
        .get('/api/routes/maxlengthstring')
        .expect(200, 'max length');
      expect(maxlengthStringCache).toHaveBeenCalledTimes(1);
      await request(app.callback)
        .get('/api/routes/maxlengthstring')
        .expect(200, 'max length');
      expect(maxlengthStringCache).toHaveBeenCalledTimes(2);
    });

    it('should not cache buffer bodies which exceed the specified max length', async () => {
      await request(app.callback)
        .get('/api/routes/maxlengthbuffer')
        .expect(200);
      expect(maxlengthBufferCache).toHaveBeenCalledTimes(1);
      await request(app.callback)
        .get('/api/routes/maxlengthbuffer')
        .expect(200);
      expect(maxlengthBufferCache).toHaveBeenCalledTimes(2);
    });

    it('should not cache json bodies which exceed the specified max length', async () => {
      await request(app.callback)
        .get('/api/routes/maxlengthjson')
        .expect(200, { message: 'max length' });
      expect(maxlengthJSONCache).toHaveBeenCalledTimes(1);
      await request(app.callback)
        .get('/api/routes/maxlengthjson')
        .expect(200, { message: 'max length' });
      expect(maxlengthJSONCache).toHaveBeenCalledTimes(2);
    });

    it('should not support streamed bodies', async () => {
      await request(app.callback)
        .get('/api/routes/streambody')
        .expect(200);
      expect(streamBody).toHaveBeenCalledTimes(1);
      await request(app.callback)
        .get('/api/routes/streambody')
        .expect(200);
      expect(streamBody).toHaveBeenCalledTimes(2);
    });

    it('should not support unsupported body types', async () => {
      await request(app.callback)
        .get('/api/routes/symbolbody')
        .expect(204);
      expect(symbolBody).toHaveBeenCalledTimes(1);
      await request(app.callback)
        .get('/api/routes/symbolbody')
        .expect(204);
      expect(streamBody).toHaveBeenCalledTimes(2);
    });

    it('should not cache when the decorated handler throws an exception', async () => {
      await request(app.callback)
        .get('/api/routes/middlewareerror')
        .expect(500);
      expect(middlewareErrorBody).toHaveBeenCalledTimes(1);
      await request(app.callback)
        .get('/api/routes/middlewareerror')
        .expect(500);
      expect(middlewareErrorBody).toHaveBeenCalledTimes(2);
    });

    it('should gracefully handle caching errors coming from redis', async () => {
      const origSet = app.$kvstore.set;
      app.$kvstore.set = jest.fn(function (key, value, cb) {
        return cb(new Error(), null);
      });
      await request(app.callback)
        .get('/api/routes/cacheerror')
        .expect(200, 'cache error');
      await request(app.callback)
        .get('/api/routes/cacheerror')
        .expect(200, 'cache error');
      expect(cacheErrorBody).toHaveBeenCalledTimes(2);
      app.$kvstore.set = origSet;
    });
  });
});
