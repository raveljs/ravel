const httpCodes = require('../../lib/util/http_codes');


describe('util/rest', () => {
  let koaApp, ravelApp, rest;
  beforeEach(async () => {
    ravelApp = new (require('../../lib/ravel'))();
    ravelApp.set('keygrip keys', ['abc']);
    ravelApp.set('log level', ravelApp.log.NONE);
    await ravelApp.init();
    // we'll test the rest middleware in isolation, using koa directly
    const Koa = require('koa');
    koaApp = new Koa();
    rest = new (require('../../lib/util/rest'))(ravelApp);
  });

  describe('#respond()', () => {
    it('should produce a response with HTTP 204 NO CONTENT if no body is supplied', async () => {
      koaApp.use(rest.respond());
      koaApp.use(async function (ctx) {
        ctx.body = undefined;
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(204);
    });

    it('should produce a response with HTTP 200 OK containing a string body if a json payload is supplied', async () => {
      const result = {};
      koaApp.use(rest.respond());
      koaApp.use(async function (ctx) {
        ctx.body = result;
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(res.status).toBe(200);
    });

    it('should produce a response with HTTP 201 CREATED and an appropriate location header if a json body containing a property \'id\' is supplied along with an okCode of CREATED', async () => {
      const result = {
        id: 1
      };
      koaApp.use(rest.respond());
      koaApp.use(async function (ctx) {
        ctx.body = result;
      });

      const res = await request(koaApp.callback()).post('/entity').set('origin', 'http://localhost:8080/');
      expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(res.headers['location']).toBe('http://localhost:8080/entity/1');
      expect(res.status).toBe(201);
    });

    it('should allow the user to override the default success status code', async () => {
      koaApp.use(rest.respond());
      koaApp.use(async function (ctx) {
        ctx.respondOptions = {
          okCode: 201
        };
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(201);
    });

    it('should allow ctx.status to be used as an alias for respondOptions.okCode', async () => {
      const result = {
        id: 1
      };
      koaApp.use(rest.respond());
      koaApp.use(async (ctx) => {
        ctx.body = result;
        ctx.status = 201;
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(201);
      expect(res.body).toEqual(result);
    });

    it('should allow the second status should override first', async () => {
      const result = {
        id: 1
      };
      koaApp.use(rest.respond());
      koaApp.use(async (ctx) => {
        ctx.body = result;
        ctx.status = 201;
        ctx.status = 200;
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(result);
    });

    it('should use error codes in ctx.response.status if present (likely set by another library)', async () => {
      koaApp.use(rest.respond());
      koaApp.use(async (ctx) => {
        ctx.response.status = 501;
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(501);
      expect(res.text).toBe('Not Implemented');
    });

    it('should produce a response with HTTP 206 PARTIAL CONTENT if it is supplied as an okCode along with options.start, options.end and options.count', async () => {
      const result = [];

      const options = {
        okCode: httpCodes.PARTIAL_CONTENT,
        start: 0,
        end: 5,
        count: 10
      };

      koaApp.use(rest.respond());
      koaApp.use(async function (ctx) {
        ctx.body = result;
        ctx.respondOptions = options;
      });

      const res = await request(koaApp.callback()).get('/').set('origin', 'http://localhost:8080/');
      expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(res.headers['content-range']).toBe(`items ${options.start}-${options.end}/${options.count}`);
      expect(res.status).toBe(206);
      expect(res.body).toEqual(result);
    });
  });

  describe('#errorHandler()', () => {
    it('should respond with HTTP 404 NOT FOUND when ApplicationError.NotFound is passed as err', async () => {
      const message = 'a message';
      koaApp.use(rest.errorHandler());
      koaApp.use(async () => {
        throw new ravelApp.ApplicationError.NotFound(message);
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(404);
      expect(res.text).toBe(message);
    });

    it('should respond with HTTP 403 Forbidden when ApplicationError.Access is passed as err', async () => {
      const message = 'a message';
      koaApp.use(rest.errorHandler());
      koaApp.use(async () => {
        throw new ravelApp.ApplicationError.Access(message);
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(403);
      expect(res.text).toBe(message);
    });

    it('should respond with HTTP 405 METHOD NOT ALLOWED when ApplicationError.NotAllowed is passed as err', async () => {
      const message = 'a message';
      koaApp.use(rest.errorHandler());
      koaApp.use(async () => {
        throw new ravelApp.ApplicationError.NotAllowed(message);
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(405);
      expect(res.text).toBe(message);
    });

    it('should respond with HTTP 501 NOT IMPLEMENTED when ApplicationError.NotImplemented is passed as err', async () => {
      const message = 'a message';
      koaApp.use(rest.errorHandler());
      koaApp.use(async () => {
        throw new ravelApp.ApplicationError.NotImplemented(message);
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(501);
      expect(res.text).toBe(message);
    });

    it('should respond with HTTP 409 CONFLICT when ApplicationError.DuplicateEntry is passed as err', async () => {
      const message = 'a message';
      koaApp.use(rest.errorHandler());
      koaApp.use(async () => {
        throw new ravelApp.ApplicationError.DuplicateEntry(message);
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(409);
      expect(res.text).toBe(message);
    });

    it('should respond with HTTP 416 REQUESTED_RANGE_NOT_SATISFIABLE when ApplicationError.RangeOutOfBounds is passed as err', async () => {
      const message = 'a message';
      koaApp.use(rest.errorHandler());
      koaApp.use(async () => {
        throw new ravelApp.ApplicationError.RangeOutOfBounds(message);
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(416);
      expect(res.text).toBe(message);
    });

    it('should respond with HTTP 400 BAD REQUEST when ApplicationError.IllegalValue is passed as err', async () => {
      const message = 'a message';
      koaApp.use(rest.errorHandler());
      koaApp.use(async () => {
        throw new ravelApp.ApplicationError.IllegalValue(message);
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(400);
      expect(res.text).toBe(message);
    });

    it('should respond with HTTP 500 INTERNAL SERVER ERROR when an unknown Error type is passed as err', async () => {
      const err = new Error('a message');
      koaApp.use(rest.errorHandler());
      koaApp.use(async () => {
        throw err;
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(500);
      expect(res.text).toBe(err.stack);
    });
  });

  describe('#errorHandler() and #respond()', () => {
    it('should override ctx.status with the error status code when an Error is thrown', async () => {
      const message = 'a message';
      koaApp.use(rest.errorHandler());
      koaApp.use(rest.respond());
      koaApp.use(async (ctx) => {
        ctx.status = 200;
        throw new ravelApp.ApplicationError.IllegalValue(message);
      });
      const res = await request(koaApp.callback()).get('/');
      expect(res.status).toBe(400);
      expect(res.text).toBe(message);
    });
  });
});
