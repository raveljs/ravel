const AsyncEventEmitter = require('../../lib/util/event_emitter');
const ApplicationError = require('../../lib/util/application_error');

describe('Ravel', () => {
  let emitter;
  beforeEach(async () => {
    emitter = new AsyncEventEmitter();
  });

  describe('AsyncEventEmitter', () => {
    describe('defaultMaxListeners', () => {
      it('should throw ApplicationError.NotImplemented', async () => {
        expect(() => { AsyncEventEmitter.defaultMaxListeners; }).toThrow(ApplicationError.NotImplemented);
      });
    });

    describe('#getMaxListeners', () => {
      it('should throw ApplicationError.NotImplemented', async () => {
        expect(() => { emitter.getMaxListeners(); }).toThrow(ApplicationError.NotImplemented);
      });
    });

    describe('#setMaxListeners', () => {
      it('should throw ApplicationError.NotImplemented', async () => {
        expect(() => { emitter.setMaxListeners(); }).toThrow(ApplicationError.NotImplemented);
      });
    });

    describe('#on', () => {
      it('should register a listener for the given event, which fires when the event is triggered', async () => {
        const stub = jest.fn();
        emitter.on('myevent', stub);
        expect(emitter.eventNames()).toContain('myevent');
        await emitter.emit('myevent');
        expect(stub).toHaveBeenCalledTimes(1);
      });
    });

    describe('#addListener', () => {
      it('should be an alias for emitter.on', async () => {
        const spy = jest.spyOn(emitter, 'on');
        const listener = jest.fn();
        emitter.addListener('myevent', listener);
        expect(spy).toHaveBeenCalledWith('myevent', listener);
        expect(emitter.eventNames()).toContain('myevent');
        await emitter.emit('myevent');
        expect(listener).toHaveBeenCalledTimes(1);
        spy.mockClear();
      });
    });

    describe('#once', () => {
      it('should register a one-time handler for an event', async () => {
        const stub = jest.fn();
        emitter.once('myevent', stub);
        expect(emitter.eventNames()).toContain('myevent');
        await emitter.emit('myevent');
        await emitter.emit('myevent');
        expect(stub).toHaveBeenCalledTimes(1);
      });
    });

    describe('#emit', () => {
      it('should trigger all listeners for an event, and return a Promise that resolves when they have all resolved.', async () => {
        let finished = 0;
        const stub1 = jest.fn(() => new Promise((resolve) => setTimeout(() => {
          finished += 1;
          resolve();
        }, 100)));
        const stub2 = jest.fn(() => new Promise((resolve) => setTimeout(() => {
          finished += 1;
          resolve();
        }, 100)));
        emitter.once('myevent', stub1);
        emitter.once('myevent', stub2);
        expect(emitter.eventNames()).toContain('myevent');
        await emitter.emit('myevent');
        expect(stub1).toHaveBeenCalledTimes(1);
        expect(stub2).toHaveBeenCalledTimes(1);
        expect(finished).toBe(2);
      });

      it('should be safe to call on events which do not exist', async () => {
        await expect(emitter.emit('someevent')).resolves;
      });
    });

    describe('#eventNames', () => {
      it('should return with a list of all the known event names for this emitter', async () => {
        emitter.once('myevent', jest.fn());
        emitter.once('myevent2', jest.fn());
        expect(emitter.eventNames()).toContain('myevent');
        expect(emitter.eventNames()).toContain('myevent2');
      });
    });

    describe('#listenerCount', () => {
      it('should return with the number of listeners for a known emitter', async () => {
        emitter.once('myevent', jest.fn());
        emitter.once('myevent', jest.fn());
        expect(emitter.listenerCount('myevent')).toBe(2);
      });

      it('should return with 0 for an unknown emitter', async () => {
        expect(emitter.listenerCount('myevent')).toBe(0);
      });
    });

    describe('#prependListener', () => {
      it('should throw ApplicationError.NotImplemented', async () => {
        expect(() => { emitter.prependListener(); }).toThrow(ApplicationError.NotImplemented);
      });
    });

    describe('#prependOnceListener', () => {
      it('should throw ApplicationError.NotImplemented', async () => {
        expect(() => { emitter.prependOnceListener(); }).toThrow(ApplicationError.NotImplemented);
      });
    });

    describe('#removeAllListeners', () => {
      it('should deregister all listeners when no event name is specified', async () => {
        emitter.on('one', jest.fn());
        emitter.on('one', jest.fn());
        emitter.on('two', jest.fn());
        expect(emitter.eventNames()).toContain('one');
        expect(emitter.eventNames()).toContain('two');
        emitter.removeAllListeners();
        expect(emitter.eventNames().length).toBe(0);
      });

      it('should deregister all listeners for a specific event when that event is specified', async () => {
        emitter.on('one', jest.fn());
        emitter.on('one', jest.fn());
        emitter.on('two', jest.fn());
        expect(emitter.eventNames()).toContain('one');
        expect(emitter.eventNames()).toContain('two');
        emitter.removeAllListeners('two');
        expect(emitter.eventNames()).toContain('one');
      });

      it('should be safe to call on events which do not exist', async () => {
        const stub1 = jest.fn();
        emitter.on('myevent', stub1);
        await emitter.emit('myevent');
        expect(stub1).toHaveBeenCalledTimes(1);
        emitter.removeAllListeners('anotherevent');
        await emitter.emit('myevent');
        expect(stub1).toHaveBeenCalledTimes(2);
      });
    });

    describe('#removeListener', () => {
      it('should facilitate the removal of specific listeners from an event', async () => {
        const stub1 = jest.fn();
        const stub2 = jest.fn();
        emitter.on('myevent', stub1);
        emitter.on('myevent', stub2);
        emitter.on('anotherevent', stub1);
        await emitter.emit('myevent');
        expect(stub1).toHaveBeenCalledTimes(1);
        expect(stub2).toHaveBeenCalledTimes(1);
        await emitter.emit('anotherevent');
        expect(stub1).toHaveBeenCalledTimes(2);
        emitter.removeListener('myevent', stub1);
        await emitter.emit('myevent');
        expect(stub1).toHaveBeenCalledTimes(2);
        expect(stub2).toHaveBeenCalledTimes(2);
        await emitter.emit('anotherevent');
        expect(stub1).toHaveBeenCalledTimes(3);
      });

      it('should be safe to call on events which do not exist', async () => {
        const stub1 = jest.fn();
        emitter.on('myevent', stub1);
        await emitter.emit('myevent');
        expect(stub1).toHaveBeenCalledTimes(1);
        emitter.removeListener('anotherevent', stub1);
        await emitter.emit('myevent');
        expect(stub1).toHaveBeenCalledTimes(2);
      });

      it('should be safe to call on listeners which do not exist', async () => {
        const stub1 = jest.fn();
        emitter.on('myevent', stub1);
        await emitter.emit('myevent');
        expect(stub1).toHaveBeenCalledTimes(1);
        emitter.removeListener('myevent', jest.fn());
        await emitter.emit('myevent');
        expect(stub1).toHaveBeenCalledTimes(2);
      });
    });
  });
});
