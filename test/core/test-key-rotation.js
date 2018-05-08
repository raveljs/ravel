'use strict';

const chai = require('chai');
const expect = chai.expect;
chai.use(require('sinon-chai'));

describe('Ravel KeyGrip Keys Rotation', () => {
  before((done) => {
    process.removeAllListeners('unhandledRejection');
    done();
  });

  after((done) => {
    process.removeAllListeners('unhandledRejection');
    done();
  });

  describe('#rotateKeygripKey()', () => {
    it('should allow for key rotation', async () => {
      const initialKeys = ['one', 'two'];
      const Ravel = require('../../lib/ravel');
      const app = new Ravel();
      app.set('log level', app.log.NONE);
      app.set('keygrip keys', initialKeys);
      await app.init();
      const session = `${Math.random()}`;
      let sig = app.keys.sign(session);
      expect(app.keys.verify(session, sig)).to.be.true;
      expect(app.keys.index(session, sig)).to.equal(0);
      app.rotateKeygripKey('three');
      expect(app.keys.verify(session, sig)).to.be.true;
      expect(app.keys.index(session, sig)).to.equal(1);
      sig = app.keys.sign(session);
      expect(app.keys.verify(session, sig)).to.be.true;
      expect(app.keys.index(session, sig)).to.equal(0);
    });
  });
});
