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
    describe('#addRoute', () => {
      let tree;
      beforeEach(async () => {
        tree = new RouteTreeRoot();
      });

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

      it('Should throw an exception if supplied two functionally identical routes', () => {
        const middleware1 = ['middleware1'];
        const middleware2 = ['middleware2'];
        tree.addRoute(Methods.GET, '/foo/:id', middleware1);
        expect(() => {
          tree.addRoute(Methods.GET, '/foo/:name', middleware2);
        }).toThrow($err.DuplicateEntry);
      });

      it('Non-parameterized route components should be prioritized over parameterized ones', () => {
        const middleware = ['middleware'];
        tree.addRoute(Methods.GET, '/foo/:id', middleware);
        tree.addRoute(Methods.GET, '/:foo/:name', middleware);
        tree.sort();
        let match = tree.match(Methods.GET, '/foo/1');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({ id: '1' });
        match = tree.match(Methods.GET, '/bar/civic');
        expect(match).not.toBeNull();
        expect(match.middleware).toBe(middleware);
        expect(match.params).toEqual({ foo: 'bar', name: 'civic' });
      });
    });
  });
});
