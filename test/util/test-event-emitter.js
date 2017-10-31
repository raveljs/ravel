'use strict';

const chai = require('chai');
chai.use(require('chai-things'));
chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const sinon = require('sinon');
const AsyncEventEmitter = require('../../lib/util/event_emitter');
const ApplicationError = require('../../lib/util/application_error');

let emitter;

describe('Ravel', () => {
  beforeEach(async () => {
    emitter = new AsyncEventEmitter();
  });

  describe('AsyncEventEmitter', () => {
    describe('defaultMaxListeners', () => {
      it('should throw ApplicationError.NotImplemented', async () => {
        expect(() => { AsyncEventEmitter.defaultMaxListeners; }).to.throw(ApplicationError.NotImplemented);
      });
    });

    describe('#getMaxListeners', () => {
      it('should throw ApplicationError.NotImplemented', async () => {
        expect(() => { emitter.getMaxListeners(); }).to.throw(ApplicationError.NotImplemented);
      });
    });

    describe('#setMaxListeners', () => {
      it('should throw ApplicationError.NotImplemented', async () => {
        expect(() => { emitter.setMaxListeners(); }).to.throw(ApplicationError.NotImplemented);
      });
    });

    describe('#on', () => {
      it('should register a listener for the given event, which fires when the event is triggered', async () => {
        const stub = sinon.stub();
        emitter.on('myevent', stub);
        expect(emitter.eventNames()).to.include.something.that.equals('myevent');
        await emitter.emit('myevent');
        expect(stub).to.have.been.calledOnce;
      });
    });

    describe('#addListener', () => {
      it('should be an alias for emitter.on', async () => {
        const spy = sinon.spy(emitter, 'on');
        const listener = sinon.stub();
        emitter.addListener('myevent', listener);
        expect(spy).to.have.been.calledWith('myevent', listener);
        expect(emitter.eventNames()).to.include.something.that.equals('myevent');
        await emitter.emit('myevent');
        expect(listener).to.have.been.calledOnce;
      });
    });

    describe('#once', () => {
      it('should register a one-time handler for an event', async () => {
        const stub = sinon.stub();
        emitter.once('myevent', stub);
        expect(emitter.eventNames()).to.include.something.that.equals('myevent');
        await emitter.emit('myevent');
        await emitter.emit('myevent');
        expect(stub).to.have.been.calledOnce;
      });
    });

    describe('#emit', () => {
      it('should trigger all listeners for an event, and return a Promise that resolves when they have all resolved.', async () => {
        let finished = 0;
        const stub1 = sinon.stub().returns(new Promise((resolve) => setTimeout(() => {
          finished += 1;
          resolve();
        }, 100)));
        const stub2 = sinon.stub().returns(new Promise((resolve) => setTimeout(() => {
          finished += 1;
          resolve();
        }, 100)));
        emitter.once('myevent', stub1);
        emitter.once('myevent', stub2);
        expect(emitter.eventNames()).to.include.something.that.equals('myevent');
        await emitter.emit('myevent');
        expect(stub1).to.have.been.calledOnce;
        expect(stub2).to.have.been.calledOnce;
        expect(finished).to.equal(2);
      });

      it('should be safe to call on events which do not exist', async () => {
        expect(emitter.emit('someevent')).to.be.fulfilled;
      });
    });

    describe('#eventNames', () => {
      it('should return with a list of all the known event names for this emitter', async () => {
        emitter.once('myevent', sinon.stub());
        emitter.once('myevent2', sinon.stub());
        expect(emitter.eventNames()).to.include.something.that.equals('myevent');
        expect(emitter.eventNames()).to.include.something.that.equals('myevent2');
      });
    });

    describe('#listenerCount', () => {
      it('should return with the number of listeners for a known emitter', async () => {
        emitter.once('myevent', sinon.stub());
        emitter.once('myevent', sinon.stub());
        expect(emitter.listenerCount('myevent')).to.equal(2);
      });

      it('should return with 0 for an unknown emitter', async () => {
        expect(emitter.listenerCount('myevent')).to.equal(0);
      });
    });

    describe('#prependListener', () => {
      it('should throw ApplicationError.NotImplemented', async () => {
        expect(() => { emitter.prependListener(); }).to.throw(ApplicationError.NotImplemented);
      });
    });

    describe('#prependOnceListener', () => {
      it('should throw ApplicationError.NotImplemented', async () => {
        expect(() => { emitter.prependOnceListener(); }).to.throw(ApplicationError.NotImplemented);
      });
    });

    describe('#removeAllListeners', () => {
      it('should deregister all listeners when no event name is specified', async () => {
        emitter.on('one', sinon.stub());
        emitter.on('one', sinon.stub());
        emitter.on('two', sinon.stub());
        expect(emitter.eventNames()).to.contain.something.that.equals('one');
        expect(emitter.eventNames()).to.contain.something.that.equals('two');
        emitter.removeAllListeners();
        expect(emitter.eventNames()).to.be.empty;
      });

      it('should deregister all listeners for a specific event when that event is specified', async () => {
        emitter.on('one', sinon.stub());
        emitter.on('one', sinon.stub());
        emitter.on('two', sinon.stub());
        expect(emitter.eventNames()).to.contain.something.that.equals('one');
        expect(emitter.eventNames()).to.contain.something.that.equals('two');
        emitter.removeAllListeners('two');
        expect(emitter.eventNames()).to.contain.something.that.equals('one');
      });

      it('should be safe to call on events which do not exist', async () => {
        const stub1 = sinon.stub();
        emitter.on('myevent', stub1);
        await emitter.emit('myevent');
        expect(stub1).to.have.been.calledOnce;
        emitter.removeAllListeners('anotherevent');
        await emitter.emit('myevent');
        expect(stub1).to.have.been.calledTwice;
      });
    });

    describe('#removeListener', () => {
      it('should facilitate the removal of specific listeners from an event', async () => {
        const stub1 = sinon.stub();
        const stub2 = sinon.stub();
        emitter.on('myevent', stub1);
        emitter.on('myevent', stub2);
        emitter.on('anotherevent', stub1);
        await emitter.emit('myevent');
        expect(stub1).to.have.been.calledOnce;
        expect(stub2).to.have.been.calledOnce;
        await emitter.emit('anotherevent');
        expect(stub1).to.have.been.calledTwice;
        emitter.removeListener('myevent', stub1);
        await emitter.emit('myevent');
        expect(stub1).to.have.been.calledTwice;
        expect(stub2).to.have.been.calledTwice;
        await emitter.emit('anotherevent');
        expect(stub1).to.have.been.calledThrice;
      });

      it('should be safe to call on events which do not exist', async () => {
        const stub1 = sinon.stub();
        emitter.on('myevent', stub1);
        await emitter.emit('myevent');
        expect(stub1).to.have.been.calledOnce;
        emitter.removeListener('anotherevent', stub1);
        await emitter.emit('myevent');
        expect(stub1).to.have.been.calledTwice;
      });

      it('should be safe to call on listeners which do not exist', async () => {
        const stub1 = sinon.stub();
        emitter.on('myevent', stub1);
        await emitter.emit('myevent');
        expect(stub1).to.have.been.calledOnce;
        emitter.removeListener('myevent', sinon.stub());
        await emitter.emit('myevent');
        expect(stub1).to.have.been.calledTwice;
      });
    });
  });
});
