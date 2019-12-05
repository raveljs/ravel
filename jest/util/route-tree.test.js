const { Methods, RouteTreeNode, RouteTreeRoot } = require('../../lib/util/route-tree'); // eslint-disable-line no-unused-vars
const $err = require('../../lib/util/application_error');

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

      it('Should support the definition of simple routes', () => {
        const middleware = ['middleware'];
        tree.addRoute(Methods.GET, '/foo/bar', middleware);
        tree.sort();
        const match = tree.match(Methods.GET, '/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({});
      });

      it('Should support the definition of parameterized routes', () => {
        const middleware = ['middleware'];
        tree.addRoute(Methods.GET, '/foo/:id', middleware);
        tree.sort();
        const match = tree.match(Methods.GET, '/foo/bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({ id: 'bar' });
      });

      it('Should support the definition of parameterized routes with multiple parameters and custom regexes', () => {
        const middleware = ['middleware'];
        tree.addRoute(Methods.GET, '/foo/:id(\\d+)-:name(\\w+)', middleware);
        tree.sort();
        const match = tree.match(Methods.GET, '/foo/12-bar');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({ id: '12', name: 'bar' });
      });

      it('Should support the definition of non-overlapping routes', () => {
        const middleware = ['middleware'];
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
        const middleware = ['middleware'];
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
        const middleware1 = ['middleware1'];
        const middleware2 = ['middleware2'];
        tree.addRoute(Methods.GET, '/foo/:id', middleware1);
        expect(() => {
          tree.addRoute(Methods.GET, '/foo/:id', middleware2);
        }).toThrow($err.DuplicateEntry);
      });

      it('Should throw an exception if supplied two functionally identical routes', () => {
        const middleware1 = ['middleware1'];
        const middleware2 = ['middleware2'];
        tree.addRoute(Methods.GET, '/foo/:id', middleware1);
        expect(() => {
          tree.addRoute(Methods.GET, '/foo/:name', middleware2);
        }).toThrow($err.DuplicateEntry);
      });

      it('Should not match an empty route', () => {
        const middleware1 = ['middleware1'];
        tree.addRoute(Methods.GET, '/foo/:id', middleware1);
        tree.sort();
        expect(tree.match(Methods.GET, '')).toBeNull();
      });

      it('Should throw an exception if repeated route components are used', () => {
        expect(() => {
          tree.addRoute(Methods.GET, '/:foo+', ['middleware']);
        }).toThrow($err.IllegalValue);
        expect(() => {
          tree.addRoute(Methods.GET, '/:foo*', ['middleware']);
        }).toThrow($err.IllegalValue);
      });

      it('Should prioritize non-parameterized route components over parameterized ones', () => {
        const middleware1 = ['middleware1'];
        const middleware2 = ['middleware2'];
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
        const middleware = ['middleware'];
        tree.addRoute(Methods.GET, '/foo/bar/:id', ['hello']);
        tree.addRoute(Methods.GET, '/:foo/car/:name', middleware);
        tree.sort();
        const match = tree.match(Methods.GET, '/foo/car/civic');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({ foo: 'foo', name: 'civic' });
      });

      it('Should prioritize non-optional route components over optional ones', () => {
        const middleware1 = ['middleware1'];
        const middleware2 = ['middleware2'];
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
        const middleware1 = ['middleware1'];
        const middleware2 = ['middleware2'];
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

      it('Should prioritize route components in declaration order if all other qualities are equal', () => {
        const middleware1 = ['middleware1'];
        const middleware2 = ['middleware2'];
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
    });

    describe('#match', () => {
      it('Should throw an exception for unknown methods', () => {
        expect(() => {
          tree.match('Test', '/foo');
        }).toThrow($err.IllegalValue);
      });
    });
  });
});
