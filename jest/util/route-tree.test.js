const { Methods, RouteTreeNode, RouteTreeRoot } = require('../../lib/util/route-tree'); // eslint-disable-line no-unused-vars
const $err = require('../../lib/util/application_error');

const mw = async (ctx, next) => { if (next) await next(); };

describe('util/route-tree', () => {
  beforeEach(async () => {
  });

  afterEach(async () => {

  });

  describe('Methods', () => {
    it('Should include a GET Method', () => {
      expect(Methods.GET).toBeDefined();
    });
    it('Should include a POST Method', () => {
      expect(Methods.POST).toBeDefined();
    });
    it('Should include a PUT Method', () => {
      expect(Methods.PUT).toBeDefined();
    });
    it('Should include a PATCH Method', () => {
      expect(Methods.PATCH).toBeDefined();
    });
    it('Should include a DELETE Method', () => {
      expect(Methods.DELETE).toBeDefined();
    });
  });

  describe('RouteTree', () => {
    let tree;
    beforeEach(async () => {
      tree = new RouteTreeRoot();
    });

    describe('#addRoute', () => {
      it('Should throw an exception for unknown methods', () => {
        expect(() => {
          tree.addRoute('Test', '/foo', []);
        }).toThrow($err.IllegalValue);
      });

      it('Should support the definition of a root path', () => {
        const middleware = [mw];
        tree.addRoute(Methods.GET, '/', middleware);
        tree.sort();
        const match = tree.match(Methods.GET, '/');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({});
      });

      it('Should support the definition of simple routes', () => {
        const middleware = [mw];
        tree.addRoute(Methods.GET, '/foo/bar', middleware);
        tree.sort();
        const match = tree.match(Methods.GET, '/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({});
      });

      it('Should ignore multiple slashes in paths', () => {
        const middleware = [mw];
        tree.addRoute(Methods.GET, '/foo//bar', middleware);
        tree.sort();
        const match = tree.match(Methods.GET, '/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({});
      });

      it('Should support the definition of parameterized routes', () => {
        const middleware = [mw];
        tree.addRoute(Methods.GET, '/foo/:id', middleware);
        tree.sort();
        const match = tree.match(Methods.GET, '/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({ id: 'bar' });
      });

      it('Should support the definition of overlapping routes', () => {
        const middleware1 = [mw];
        const middleware2 = [mw, mw];
        tree.addRoute(Methods.GET, '/foo/bar', middleware1);
        tree.addRoute(Methods.GET, '/foo/bar/:id', middleware2);
        tree.sort();
        let match = tree.match(Methods.GET, '/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        match = tree.match(Methods.GET, '/foo/bar/12');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware2);
        expect(match.params).toEqual({ id: '12' });
        // try other way
        tree = new RouteTreeRoot();
        tree.addRoute(Methods.GET, '/foo/bar/:id', middleware2);
        tree.addRoute(Methods.GET, '/foo/bar', middleware1);
        tree.sort();
        match = tree.match(Methods.GET, '/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        match = tree.match(Methods.GET, '/foo/bar/12');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware2);
        expect(match.params).toEqual({ id: '12' });
      });

      it('Should support the definition of parameterized routes with multiple parameters and custom regexes', () => {
        const middleware = [mw];
        tree.addRoute(Methods.GET, '/foo/:id(\\d+)-:name(\\w+)', middleware);
        tree.sort();
        const match = tree.match(Methods.GET, '/foo/12-bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({ id: '12', name: 'bar' });
      });

      it('Should support the definition of non-overlapping routes', () => {
        const middleware = [mw];
        tree.addRoute(Methods.GET, '/foo/bar/:id', middleware);
        tree.addRoute(Methods.GET, '/bar/car/:name', middleware);
        tree.sort();
        let match = tree.match(Methods.GET, '/foo/bar/1');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({ id: '1' });
        match = tree.match(Methods.GET, '/bar/car/civic');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({ name: 'civic' });
      });

      it('Should support the definition of partially overlapping routes', () => {
        const middleware = [mw];
        tree.addRoute(Methods.GET, '/foo/bar/:id', middleware);
        tree.addRoute(Methods.GET, '/foo/car/:name', middleware);
        tree.sort();
        let match = tree.match(Methods.GET, '/foo/bar/1');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({ id: '1' });
        match = tree.match(Methods.GET, '/foo/car/civic');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({ name: 'civic' });
      });

      it('Should throw an exception if supplied two identical routes', () => {
        const middleware1 = [mw];
        const middleware2 = [mw, mw];
        tree.addRoute(Methods.GET, '/foo/:id', middleware1);
        expect(() => {
          tree.addRoute(Methods.GET, '/foo/:id', middleware2);
        }).toThrow($err.DuplicateEntry);
      });

      it('Should throw an exception if supplied two identical wildcard routes', () => {
        const middleware1 = [mw];
        const middleware2 = [mw, mw];
        tree.addRoute(Methods.GET, '/a/b', middleware1, true);
        expect(() => {
          tree.addRoute(Methods.GET, '/a/b', middleware2, true);
        }).toThrow($err.DuplicateEntry);
      });

      it('Should throw an exception if supplied two functionally identical routes', () => {
        const middleware1 = [mw];
        const middleware2 = [mw, mw];
        tree.addRoute(Methods.GET, '/foo/:id', middleware1);
        expect(() => {
          tree.addRoute(Methods.GET, '/foo/:name', middleware2);
        }).toThrow($err.DuplicateEntry);
      });

      it('Should not match an empty route', () => {
        const middleware1 = [mw];
        tree.addRoute(Methods.GET, '/foo/:id', middleware1);
        tree.sort();
        expect(tree.match(Methods.GET, '')).toBeNull();
      });

      it('Should throw an exception if repeated route components are used', () => {
        expect(() => {
          tree.addRoute(Methods.GET, '/:foo+', [mw]);
        }).toThrow($err.IllegalValue);
        expect(() => {
          tree.addRoute(Methods.GET, '/:foo*', [mw]);
        }).toThrow($err.IllegalValue);
      });

      it('Should prioritize non-parameterized route components over parameterized ones', () => {
        const middleware1 = [mw];
        const middleware2 = [mw, mw];
        tree.addRoute(Methods.GET, '/:foo/:name', middleware2);
        tree.addRoute(Methods.GET, '/foo/:id', middleware1);
        tree.sort();
        let match = tree.match(Methods.GET, '/foo/1');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        expect(match.params).toEqual({ id: '1' });
        match = tree.match(Methods.GET, '/bar/civic');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware2);
        expect(match.params).toEqual({ foo: 'bar', name: 'civic' });
      });

      it('Should search other matching branches to find a route match', () => {
        const middleware = [mw];
        tree.addRoute(Methods.GET, '/foo/bar/:id', [mw, mw]);
        tree.addRoute(Methods.GET, '/:foo/car/:name', middleware);
        tree.sort();
        const match = tree.match(Methods.GET, '/foo/car/civic');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({ foo: 'foo', name: 'civic' });
      });

      it('Should prioritize non-optional route components over optional ones', () => {
        const middleware1 = [mw];
        const middleware2 = [mw, mw];
        tree.addRoute(Methods.GET, '/:foo?/:name', middleware1);
        tree.addRoute(Methods.GET, '/:foo/:id', middleware2);
        tree.sort();
        let match = tree.match(Methods.GET, '/foo/1');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware2);
        expect(match.params).toEqual({ foo: 'foo', id: '1' });
        // try other way
        tree = new RouteTreeRoot();
        tree.addRoute(Methods.GET, '/:foo/:name', middleware1);
        tree.addRoute(Methods.GET, '/:foo?/:id', middleware2);
        tree.sort();
        match = tree.match(Methods.GET, '/foo/1');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        expect(match.params).toEqual({ foo: 'foo', name: '1' });
      });

      it('Should prioritize prefixed route components over non-prefixed ones', () => {
        const middleware1 = [mw];
        const middleware2 = [mw, mw];
        tree.addRoute(Methods.GET, '/:foo/:name', middleware1);
        tree.addRoute(Methods.GET, '/ab-:foo/:id', middleware2);
        tree.sort();
        let match = tree.match(Methods.GET, '/ab-foo/1');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware2);
        expect(match.params).toEqual({ foo: 'foo', id: '1' });
        // try other way
        tree = new RouteTreeRoot();
        tree.addRoute(Methods.GET, '/ab-:foo/:name', middleware1);
        tree.addRoute(Methods.GET, '/:foo/:id', middleware2);
        tree.sort();
        match = tree.match(Methods.GET, '/ab-foo/1');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        expect(match.params).toEqual({ foo: 'foo', name: '1' });
      });

      it('Should search alternate subtrees for matching routes if the first matching path fails', () => {
        const middleware1 = [mw];
        const middleware2 = [mw, mw];
        tree.addRoute(Methods.GET, '/:foo/bar', middleware1);
        tree.addRoute(Methods.GET, '/:bar/car', middleware2);
        tree.sort();
        let match = tree.match(Methods.GET, '/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        expect(match.params).toEqual({ foo: 'foo' });
        match = tree.match(Methods.GET, '/foo/car');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware2);
        expect(match.params).toEqual({ bar: 'foo' });
      });

      it('Should support catch-all routes, which match everything below a certain prefix', () => {
        const middleware1 = [mw];
        tree.addRoute(Methods.GET, '/foo/:bar', middleware1, true);
        tree.sort();
        let match = tree.match(Methods.GET, '/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        expect(match.params).toEqual({ bar: 'bar' });
        match = tree.match(Methods.GET, '/foo/car/something/else');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        expect(match.params).toEqual({ bar: 'car' });
      });

      it('Should support the definition of multiple wildcard routes', () => {
        const middleware1 = [mw];
        const middleware2 = [mw, mw];
        tree.addRoute(Methods.GET, '/a/b', middleware1, true);
        tree.addRoute(Methods.GET, '/a/c', middleware2, true);
        tree.sort();
        let match = tree.match(Methods.GET, '/a/b/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        match = tree.match(Methods.GET, '/a/c/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware2);
      });

      it('Should prioritize non-catch-all routes over catch-all routes', () => {
        const middleware1 = [mw];
        const middleware2 = [mw, mw];
        tree.addRoute(Methods.GET, '/foo/bar', middleware1, true);
        tree.addRoute(Methods.GET, '/foo/bar/something', middleware2, false);
        tree.sort();
        let match = tree.match(Methods.GET, '/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        expect(match.params).toEqual({});
        match = tree.match(Methods.GET, '/foo/bar/something');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware2);
        expect(match.params).toEqual({});
        match = tree.match(Methods.GET, '/foo/bar/something/else');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        expect(match.params).toEqual({});
      });

      it('Should prioritize non-catch-all parameterized routes over catch-all parameterized routes', () => {
        const middleware1 = [mw];
        const middleware2 = [mw, mw];
        tree.addRoute(Methods.GET, '/foo/:bar', middleware1, true);
        tree.addRoute(Methods.GET, '/foo/:car/something', middleware2, false);
        tree.sort();
        let match = tree.match(Methods.GET, '/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        expect(match.params).toEqual({ bar: 'bar' });
        match = tree.match(Methods.GET, '/foo/car/something');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware2);
        expect(match.params).toEqual({ car: 'car' });
        match = tree.match(Methods.GET, '/foo/car/something/else');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        expect(match.params).toEqual({ bar: 'car' });
        // try other way
        tree = new RouteTreeRoot();
        tree.addRoute(Methods.GET, '/foo/:car/something', middleware2, false);
        tree.addRoute(Methods.GET, '/foo/:bar', middleware1, true);
        tree.sort();
        match = tree.match(Methods.GET, '/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        expect(match.params).toEqual({ bar: 'bar' });
        match = tree.match(Methods.GET, '/foo/car/something');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware2);
        expect(match.params).toEqual({ car: 'car' });
        match = tree.match(Methods.GET, '/foo/car/something/else');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware1);
        expect(match.params).toEqual({ bar: 'car' });
      });
    });

    describe('#match', () => {
      it('Should throw an exception for unknown methods', () => {
        expect(() => {
          tree.match('Test', '/foo');
        }).toThrow($err.IllegalValue);
      });
    });

    describe('#allowedMethods', () => {
      it('Should return a list of supported methods in the tree, in a standard order', () => {
        tree.addRoute(Methods.POST, '/foo', [mw]);
        tree.addRoute(Methods.DELETE, '/foo', [mw]);
        tree.addRoute(Methods.GET, '/foo', [mw]);
        tree.addRoute(Methods.PATCH, '/foo', [mw]);
        tree.addRoute(Methods.PUT, '/foo', [mw]);
        tree.sort();
        expect(tree.allowedMethods()).toStrictEqual(['GET', 'PATCH', 'POST', 'PUT', 'DELETE']);
      });
    });
  });
});
