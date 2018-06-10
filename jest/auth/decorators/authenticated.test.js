const Metadata = require('../../../lib/util/meta');

describe('Routes', () => {
  let authenticated;
  beforeEach(() => {
    authenticated = require('../../../lib/ravel').Routes.authenticated;
  });

  describe('@authenticated()', () => {
    it('should decorate a class indicating that auth middleware should precede every endpoint defined within', () => {
      @authenticated
      class Stub1 {
      }
      expect(typeof Metadata.getClassMetaValue(Stub1.prototype, '@authenticated', 'config')).toBe('object');
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@authenticated', 'config')).toEqual({});
    });

    it('should decorate a class indicating that auth middleware should precede every endpoint defined within (no args)', () => {
      @authenticated()
      class Stub1 {
      }
      expect(typeof Metadata.getClassMetaValue(Stub1.prototype, '@authenticated', 'config')).toBe('object');
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@authenticated', 'config')).toEqual({});
    });

    it('should decorate a class indicating that auth middleware which supports configuration should precede every endpoint defined within', () => {
      @authenticated({
        redirect: true,
        register: false
      })
      class Stub1 {
      }
      expect(typeof Metadata.getClassMetaValue(Stub1.prototype, '@authenticated', 'config')).toBe('object');
      expect(Metadata.getClassMetaValue(Stub1.prototype, '@authenticated', 'config')).toEqual({
        redirect: true,
        register: false
      });
    });

    it('should decorate a method indicating that auth middleware should precede it', () => {
      class Stub1 {
        @authenticated
        handler () {}
      }
      expect(typeof Metadata.getMethodMetaValue(Stub1.prototype, 'handler', '@authenticated', 'config')).toBe('object');
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'handler', '@authenticated', 'config')).toEqual({});
    });

    it('should decorate a method indicating that auth middleware that should precede it (no args)', () => {
      class Stub1 {
        @authenticated()
        handler () {}
      }
      expect(typeof Metadata.getMethodMetaValue(Stub1.prototype, 'handler', '@authenticated', 'config')).toBe('object');
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'handler', '@authenticated', 'config')).toEqual({});
    });

    it('should decorate a method indicating that auth middleware which supports configuration should precede it', () => {
      class Stub1 {
        @authenticated({
          redirect: true,
          register: false
        })
        handler () {}
      }
      expect(typeof Metadata.getMethodMetaValue(Stub1.prototype, 'handler', '@authenticated', 'config')).toBe('object');
      expect(Metadata.getMethodMetaValue(Stub1.prototype, 'handler', '@authenticated', 'config')).toEqual({
        redirect: true,
        register: false
      });
    });

    describe('auth middleware insertion', () => {
      let Ravel, Routes;
      beforeEach(() => {
        Ravel = require('../../../lib/ravel');
        Routes = Ravel.Routes;
        authenticated = Routes.authenticated;
      });

      it('should decorate route handlers with authentication-enforcing middleware', async () => {
        @Routes('/app/path')
        class Stub {
          @Routes.mapping(Routes.GET, '')
          @Routes.authenticated
          handler () {}
        }
        const app = new Ravel();
        app.set('keygrip keys', ['abc']);
        app.set('log level', app.log.NONE);
        app.load(Stub);
        await app.init();
        const res = await request(app.callback).get('/app/path');
        expect(res.status).toBe(401);
      });

      it('should decorate all route handlers with authentication-enforcing middleware when used at the class-level', async () => {
        @Routes('/app/path')
        @authenticated
        class Stub {
          @Routes.mapping(Routes.GET, '')
          handler () {}
        }
        const app = new Ravel();
        app.set('keygrip keys', ['abc']);
        app.set('log level', app.log.NONE);
        app.load(Stub);
        await app.init();
        const res = await request(app.callback).get('/app/path');
        expect(res.status).toBe(401);
      });
    });
  });
});
