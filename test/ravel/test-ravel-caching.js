'use strict';

const chai = require('chai');
const expect = chai.expect;
const mockery = require('mockery');
const redis = require('redis-mock');
const request = require('supertest');
const upath = require('upath');
const sinon = require('sinon');
chai.use(require('sinon-chai'));

let app, agent, setStub;
const cacheWithoutExpiry = sinon.stub().returns('cache without expiry');
const cacheWithExpiry = sinon.stub().returns({message: 'cache with expiry'});
const classCache = sinon.stub().returns(Buffer.from('class-level cache'));
const postCache = sinon.stub().returns('post cache');
const maxlengthStringCache = sinon.stub().returns('max length');
const maxlengthBufferCache = sinon.stub().returns(Buffer.from('max length'));
const maxlengthJSONCache = sinon.stub().returns({message: 'max length'});
const streamBody = sinon.stub().callsFake(function () {
  const Readable = require('stream').Readable;
  const stream = new Readable();
  stream._read = function (size) { /* do nothing */ };
  setTimeout(() => {
    stream.emit('data', 'a message');
    stream.emit('end');
  }, 2000);
  return stream;
});
const symbolBody = sinon.stub().returns(Symbol('message'));
const cacheErrorBody = sinon.stub().returns('cache error');

describe('Ravel end-to-end test', () => {
  before((done) => {
    process.removeAllListeners('unhandledRejection');
    // enable mockery
    mockery.enable({
      useCleanCache: true,
      warnOnReplace: false,
      warnOnUnregistered: false
    });
    done();
  });

  after((done) => {
    process.removeAllListeners('unhandledRejection');
    mockery.deregisterAll();
    mockery.disable();
    done();
  });

  describe('basic application server consisting of a resource', () => {
    before((done) => {
      const Ravel = require('../../lib/ravel');

      // stub Resource (REST interface)
      const cache = Ravel.Resource.cache;
      class TestResource extends Ravel.Resource {
        constructor (users) {
          super('/api/resource');
          this.users = users;
        }

        @cache
        getAll (ctx) {
          ctx.body = cacheWithoutExpiry();
        }

        @cache({expire: 1})
        get (ctx) {
          ctx.body = cacheWithExpiry();
        }
      }

      // stub Routes (miscellaneous routes, such as templated HTML content)
      const mapping = Ravel.Routes.mapping;

      @cache
      class TestRoutes extends Ravel.Routes {
        constructor () {
          super('/api/routes');
        }

        @mapping(Ravel.Routes.GET, '/')
        getHandler (ctx) {
          ctx.body = classCache();
          ctx.response.lastModified = new Date();
        }

        @cache({maxLength: 2})
        @mapping(Ravel.Routes.GET, '/maxlengthstring')
        getMaxLengthStringHandler (ctx) {
          ctx.body = maxlengthStringCache();
        }

        @cache({maxLength: 2})
        @mapping(Ravel.Routes.GET, '/maxlengthbuffer')
        getMaxLengthBufferHandler (ctx) {
          ctx.body = maxlengthBufferCache();
        }

        @cache({maxLength: 2})
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

        @mapping(Ravel.Routes.POST, '/')
        postHandler (ctx) {
          ctx.body = postCache();
        }
      }

      mockery.registerMock('redis', redis);
      app = new Ravel();
      app.set('log level', app.log.NONE);
      app.set('redis host', 'localhost');
      app.set('redis port', 5432);
      app.set('port', '9080');
      app.set('koa public directory', 'public');
      app.set('keygrip keys', ['mysecret']);

      mockery.registerMock(upath.join(app.cwd, 'resources'), TestResource);
      app.resource('resources');
      mockery.registerMock(upath.join(app.cwd, 'routes'), TestRoutes);
      app.routes('routes');
      app.init();
      app.kvstore.flushall();

      agent = request.agent(app.server);
      done();
    });

    after((done) => {
      app = undefined;
      done();
    });

    it('method-level @cache without expiry should respond with the appropriate string and then cache the response', (done) => {
      agent
        .get('/api/resource')
        .expect(200, 'cache without expiry')
        .expect(function () {
          expect(cacheWithoutExpiry).to.have.been.calledOnce;
        })
        .end((err) => {
          if (err) return done(err);
          agent
            .get('/api/resource')
            .expect(200, 'cache without expiry')
            .expect(function () {
              expect(cacheWithoutExpiry).to.have.been.calledOnce;
            })
            .end(done);
        });
    });

    it('method-level @cache with expiry should respond with the appropriate string and then cache the response temporarily', (done) => {
      agent
        .get('/api/resource/1')
        .expect(200, {message: 'cache with expiry'})
        .expect(function () {
          expect(cacheWithExpiry).to.have.been.calledOnce;
        })
        .end((err) => {
          if (err) return done(err);
          agent
            .get('/api/resource/1')
            .expect(200, {message: 'cache with expiry'})
            .expect(function () {
              expect(cacheWithExpiry).to.have.been.calledOnce;
            })
            .end((err2) => {
              if (err2) done(err2);
              setTimeout(() => {
                agent
                  .get('/api/resource/1')
                  .expect(200, {message: 'cache with expiry'})
                  .expect(function () {
                    expect(cacheWithExpiry).to.have.been.calledTwice;
                  })
                  .end(done);
              }, 2000);
            });
        });
    });

    it('class-level @cache without expiry should respond with the appropriate string and then cache the response', (done) => {
      agent
        .get('/api/routes')
        .expect(200)
        .expect(function () {
          expect(classCache).to.have.been.calledOnce;
        })
        .end((err) => {
          if (err) return done(err);
          agent
            .get('/api/routes')
            .expect(200)
            .expect(function () {
              expect(classCache).to.have.been.calledOnce;
            })
            .end(done);
        });
    });

    it('should not cache responses from non-GET routes', (done) => {
      agent
        .post('/api/routes').type('application/json').send({})
        .expect(201, 'post cache')
        .expect(function () {
          expect(postCache).to.have.been.calledOnce;
        })
        .end((err) => {
          if (err) return done(err);
          agent
            .post('/api/routes').type('application/json').send({})
            .expect(201, 'post cache')
            .expect(function () {
              expect(postCache).to.have.been.calledTwice;
            })
            .end(done);
        });
    });

    it('should not cache string bodies which exceed the specified max length', (done) => {
      agent
        .get('/api/routes/maxlengthstring')
        .expect(200, 'max length')
        .expect(function () {
          expect(maxlengthStringCache).to.have.been.calledOnce;
        })
        .end((err) => {
          if (err) return done(err);
          agent
            .get('/api/routes/maxlengthstring')
            .expect(200, 'max length')
            .expect(function () {
              expect(maxlengthStringCache).to.have.been.calledTwice;
            })
            .end(done);
        });
    });

    it('should not cache buffer bodies which exceed the specified max length', (done) => {
      agent
        .get('/api/routes/maxlengthbuffer')
        .expect(200)
        .expect(function () {
          expect(maxlengthBufferCache).to.have.been.calledOnce;
        })
        .end((err) => {
          if (err) return done(err);
          agent
            .get('/api/routes/maxlengthbuffer')
            .expect(200)
            .expect(function () {
              expect(maxlengthBufferCache).to.have.been.calledTwice;
            })
            .end(done);
        });
    });

    it('should not cache json bodies which exceed the specified max length', (done) => {
      agent
        .get('/api/routes/maxlengthjson')
        .expect(200, {message: 'max length'})
        .expect(function () {
          expect(maxlengthJSONCache).to.have.been.calledOnce;
        })
        .end((err) => {
          if (err) return done(err);
          agent
            .get('/api/routes/maxlengthjson')
            .expect(200, {message: 'max length'})
            .expect(function () {
              expect(maxlengthJSONCache).to.have.been.calledTwice;
            })
            .end(done);
        });
    });

    it('should not support streamed bodies', (done) => {
      agent
        .get('/api/routes/streambody')
        .expect(200)
        .expect(function () {
          expect(streamBody).to.have.been.calledOnce;
        })
        .end((err) => {
          if (err) return done(err);
          agent
            .get('/api/routes/streambody')
            .expect(200)
            .expect(function () {
              expect(streamBody).to.have.been.calledTwice;
            })
            .end(done);
        });
    });

    it('should not support unsupported body types', (done) => {
      agent
        .get('/api/routes/symbolbody')
        .expect(204)
        .expect(function () {
          expect(symbolBody).to.have.been.calledOnce;
        })
        .end((err) => {
          if (err) return done(err);
          agent
            .get('/api/routes/symbolbody')
            .expect(204)
            .expect(function () {
              expect(streamBody).to.have.been.calledTwice;
            })
            .end(done);
        });
    });

    it('should gracefully handle caching errors coming from redis', (done) => {
      setStub = sinon.stub(app.kvstore, 'set', function (key, value, cb) {
        return cb(new Error(), null);
      });
      agent
        .get('/api/routes/cacheerror')
        .expect(200, 'cache error')
        .expect(function () {
          expect(cacheErrorBody).to.have.been.calledOnce;
        })
        .end((err) => {
          if (err) { setStub.restore(); return done(err); }
          agent
            .get('/api/routes/cacheerror')
            .expect(200, 'cache error')
            .expect(function () {
              expect(cacheErrorBody).to.have.been.calledTwice;
            })
            .end((err2) => {
              setStub.restore();
              done(err2);
            });
        });
    });
  });
});
