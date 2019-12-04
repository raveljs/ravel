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
      it('Should throw an exception for unknown methods', () => {
        const tree = new RouteTreeRoot();
        expect(() => {
          tree.addRoute('Test', '/foo', []);
        }).toThrow($err.IllegalValue);
      });

      it('Should support the definition of simple routes', () => {
        const tree = new RouteTreeRoot();
        tree.addRoute(Methods.GET, '/foo/bar', []);
      });
    });
  });
});
