'use strict';

const chai = require('chai');
const expect = chai.expect;

let Ravel;

describe('Ravel', function() {
  beforeEach(function(done) {
    Ravel = new (require('../../lib/ravel'))();
    Ravel.Log.setLevel(Ravel.Log.NONE);

    done();
  });

  afterEach(function(done) {
    Ravel = undefined;
    done();
  });

  describe('#inject()', function() {
    it('should decorate a class with a static inject array', function(done) {
      //testing:
      //@inject('test1', 'test2')
      //...

      //Desugar @inject the same way Babel would:
      const Stub1 = (function () {
        let Stub1 = class {};

        Stub1 = Ravel.inject('test1', 'test2')(Stub1) || Stub1;
        return Stub1;
      })();

      expect(Stub1.inject).to.be.an.array;
      expect(Stub1.inject).to.deep.equal(['test1', 'test2']);
      done();
    });

    it('should be able to be used more than once on the same class', function(done) {
      //testing:
      //@inject('test1', 'test2')
      //@inject('test3')
      //...

      //Desugar @inject the same way Babel would:
      const Stub1 = (function () {
        let Stub1 = class {};

        Stub1 = Ravel.inject('test1', 'test2')(Stub1 = Ravel.inject('test3')(Stub1) || Stub1) || Stub1;
        return Stub1;
      })();

      expect(Stub1.inject).to.be.an.array;
      expect(Stub1.inject).to.deep.equal(['test1', 'test2', 'test3']);
      done();
    });

    it('should throw an ApplicationError.IllegalValue if a non-string type is passed to @inject', function(done) {
      const test = function() {
        Ravel.inject([])(class {});
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should throw an ApplicationError.IllegalValue if the target class already has a static inject property which is not an array', function(done) {
      const test = function() {
        Ravel.inject('test')(class {
          static get inject() {
            return 'hello';
          }
        });
      };
      expect(test).to.throw(Ravel.ApplicationError.IllegalValue);
      done();
    });

    it('should throw an ApplicationError.NotFound if @inject is supplied without an argument', function(done) {
      const test = function() {
        Ravel.inject()(class {});
      };
      expect(test).to.throw(Ravel.ApplicationError.NotFound);
      done();
    });
  });
});
