'use strict';

const $err = require('./application_error');

const sEventMap = Symbol('_eventMap');

/**
 * @private
 * @class Listener
 */
class Listener {
  constructor (listener, once = false) {
    this.listener = listener;
    this.once = once;
  }
}

/**
 * A more-or-less API-compatible implementation of EventEmitter which supports
 * async functions as listeners, where emit() returns a `Promise` which resolves
 * when each of the listeners have resolved (or rejects when one rejects).
 * Listeners are run in parallel (no order is guaranteed).
 *
 * @private
 * @class AsyncEventEmitter
 */
class AsyncEventEmitter {
  constructor () {
    this[sEventMap] = new Map();
  }

  /**
   * AsyncEventEmitter does not support defaultMaxListeners.
   */
  static get defaultMaxListeners () {
    throw new $err.NotImplemented('AsyncEventEmitter does not support defaultMaxListeners');
  }

  /**
   * AsyncEventEmitter does not support getMaxListeners.
   */
  getMaxListeners () {
    throw new $err.NotImplemented('AsyncEventEmitter does not support getMaxListeners');
  }

  /**
   * AsyncEventEmitter does not support setMaxListeners.
   */
  setMaxListeners () {
    throw new $err.NotImplemented('AsyncEventEmitter does not support setMaxListeners');
  }

  /**
   * Adds the listener function to the end of the listeners array for the event named eventName.
   * No checks are made to see if the listener has already been added. Multiple calls passing
   * the same combination of eventName and listener will result in the listener being added,
   * and called, multiple times.
   *
   * @param {any} eventName - The name of the event to attach to.
   * @param {Function} listener - The listener callback (potentially an async function).
   * @returns {AsyncEventEmitter} - A Reference this AsyncEventEmitter so that calls can be chained.
   * @memberof AsyncEventEmitter
   */
  on (eventName, listener) {
    if (!this[sEventMap].has(eventName)) {
      this[sEventMap].set(eventName, []);
    }
    this[sEventMap].get(eventName).push(new Listener(listener));
    return this;
  }

  /**
   * Alias for `on(eventName, listener)`.
   *
   * @param {any} eventName - The name of the event to attach to.
   * @param {Function} listener - The listener callback (potentially an async function).
   * @returns {AsyncEventEmitter} - A Reference this AsyncEventEmitter so that calls can be chained.
   * @memberof AsyncEventEmitter
   */
  addListener (eventName, listener) {
    return this.on(eventName, listener);
  }

  /**
   * Adds a one time listener function for the event named eventName. The next time eventName
   * is triggered, this listener is removed and then invoked.
   *
   * @param {any} eventName - The name of the event to attach to.
   * @param {Function} listener - The listener callback (potentially an async function).
   * @returns {AsyncEventEmitter} - A Reference this AsyncEventEmitter so that calls can be chained.
   * @memberof AsyncEventEmitter
   */
  once (eventName, listener) {
    if (!this[sEventMap].has(eventName)) {
      this[sEventMap].set(eventName, []);
    }
    this[sEventMap].get(eventName).push(new Listener(listener, true));
    return this;
  }

  /**
   * Calls each of the listeners registered for the event named eventName,
   * in the order they were registered, passing the supplied arguments to each.
   * Awaits on the successful result of ALL the listeners, returning a Promise.
   *
   * @param {any} eventName - The name of the event to emit.
   * @param {...any} args - Arguments to pass to the listeners.
   * @returns {Promise} - Resolves when all of the listeners resolve. Rejects otherwise.
   * @memberof AsyncEventEmitter
   */
  emit (eventName, ...args) {
    if (!this[sEventMap].has(eventName)) {
      return Promise.resolve();
    } else {
      const toExecute = this[sEventMap].get(eventName);
      // remove onces immediately, before invoking
      this[sEventMap].set(eventName, toExecute.filter(l => !l.once));
      // invoke (mapping to promises)
      return Promise.all(toExecute.map(l => l.listener.apply(l.listener, args)));
    }
  }

  /**
   * Returns an array listing the events for which the emitter has registered listeners.
   * The values in the array will be strings or Symbols.
   *
   * @returns {Array[any]} - The events for which the emitter has registered listeners.
   */
  eventNames () {
    return [...this[sEventMap].keys()];
  }

  /**
   * Returns the number of listeners listening to the event named eventName.
   *
   * @param {any} eventName - The name of the event to emit.
   * @returns {number} The number of listeners for the given event.
   * @memberof AsyncEventEmitter
   */
  listenerCount (eventName) {
    return !this[sEventMap].has(eventName) ? 0 : this[sEventMap].get(eventName).length;
  }

  /**
   * AsyncEventEmitter does not support prependListener.
   */
  prependListener () {
    throw new $err.NotImplemented('AsyncEventEmitter does not support prependListener');
  }

  /**
   * AsyncEventEmitter does not support prependOnceListener..
   */
  prependOnceListener () {
    throw new $err.NotImplemented('AsyncEventEmitter does not support prependOnceListener');
  }

  /**
   * Removes all listeners, or those of the specified eventName.
   *
   * Note that it is bad practice to remove listeners added elsewhere in the code,
   * particularly when the EventEmitter instance was created by some other component
   * or module (e.g. sockets or file streams).
   *
   * Returns a reference to the EventEmitter, so that calls can be chained.
   *
   * @param {any | undefined} eventName - The name of the event to remove all ilsteners for (optional).
   * @returns {AsyncEventEmitter} - A Reference this AsyncEventEmitter so that calls can be chained.
   * @memberof AsyncEventEmitter
   */
  removeAllListeners (eventName = null) {
    if (eventName === null) {
      this[sEventMap].clear();
    } else if (this[sEventMap].has(eventName)) {
      this[sEventMap].set(eventName, []);
    }
    return this;
  }

  /**
   * Removes the specified listener from the listener array for the event named eventName.
   *
   * @param {any} eventName - The name of the event to remove the listener from.
   * @param {Function} listener - The listener to remove.
   * @returns {AsyncEventEmitter} - A Reference this AsyncEventEmitter so that calls can be chained.
   * @memberof AsyncEventEmitter
   */
  removeListener (eventName, listener) {
    if (this[sEventMap].has(eventName)) {
      const idx = this[sEventMap].get(eventName).findIndex(e => e.listener === listener);
      if (idx >= 0) {
        this[sEventMap].get(eventName).splice(idx, 1);
      }
    }
    return this;
  }
}

module.exports = AsyncEventEmitter;
