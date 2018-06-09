// from https://gist.github.com/vlasky/2ea30ce9923bd06c2ee100f2924991cc
const EventEmitter = require('events').EventEmitter;
const originalAddListener = EventEmitter.prototype.addListener;
const addListener = function (type) {
  originalAddListener.apply(this, arguments);

  const numListeners = this.listeners(type).length;
  const max = typeof this._maxListeners === 'number' ? this._maxListeners : 10;

  if (max !== 0 && numListeners > max) {
    const error = new Error('Too many listeners of type "' + type + '" added to EventEmitter. Max is ' + max + " and we've added " + numListeners + '.');
    throw error;
  }

  return this;
};
EventEmitter.prototype.addListener = addListener;
EventEmitter.prototype.on = addListener;

global.upath = require('upath');
global.request = require('supertest');
