'use strict';

const crypto = require('crypto');
const WebSocket = require('ws');
const AsyncEventEmitter = require('../util/event_emitter');
const sWsSessionKey = Symbol.for('_wsSessionKey');

/**
 * WebSockets for Ravel
 *
 * @private
 */
class Broker extends AsyncEventEmitter {
  constructor (ravelApp) {
    super();
    this.ravelApp = ravelApp;
    this.clients = new Map(); // stores clients (session ID -> connection)
    this.subscribers = new WeakMap(); // stores subscribers for a topic on this node
    ravelApp.on('end', this.close.bind(this));
    ravelApp.on('post init', this.init.bind(this));
  }

  init () {
    // set up websocket on server, with session cookie generation
    this.wss = new WebSocket.Server({noServer: true});
    this.wss.on('headers', (headers, request) => {
      // send key to client as a cookie - this is how we will identify them
      // store key on request object so we can use it in handleUpgrade
      request[sWsSessionKey] = crypto.randomBytes(20).toString('hex');
      headers.push(`set-cookie: ravel.ws.id=${request[sWsSessionKey]}; HttpOnly;`);
    });
    this.ravelApp.server.on('upgrade', (request, socket, head) => {
      const authenticated = true; //  TODO
      if (authenticated) {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          // TODO removing client somewhere else would be more efficient.
          // ws.on('close', () => this.clients.delete(request.headers['sec-websocket-key']));
          this.clients.set(request[sWsSessionKey], ws);
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });
    // set up redis connection for publish IPC between nodes
    this.redisPrefix = this.ravelApp.get('redis websocket channel prefix');
    this.redis = this.ravelApp.$kvstore.clone();
    this.redis.on('message_buffer', (channel, messageBuffer) => {
      const topic = channel.substring(this.redisPrefix.length + 5);
      const command = channel.substring(this.redisPrefix.length + 1, this.redisPrefix.length + 4);
      switch (command) {
        case 'pub':
          this.localPublish(topic, messageBuffer);
          break;
        case 'sub':
          this.localSubscribe(topic, messageBuffer.toString('ascii'));
          break;
        case 'uns':
          this.localUnsubscribe(topic, messageBuffer.toString('ascii'));
          break;
      }
    });
    this.redis.subscribe(`${this.redisPrefix}.*`);
  }

  hasClient (clientID) {
    return this.clients.has(clientID);
  }

  getClient (clientID) {
    return this.clients.get(clientID);
  }

  async subscribe (topic, clientID) {
    // verify dot separated
    if (!topic.match(/^\w+(?:\.\w+)*$/)) {
      throw new this.ravelApp.$err.IllegalValue(`Topic names must be dot-separated /^\\w+(?:\\.\\w+)*$/`);
    }
    this.ravelApp.$kvstore.publish(`${this.redisPrefix}.sub.${topic}`, clientID);
  }

  async unsubscribe (topic, clientID) {
    this.ravelApp.$kvstore.publish(`${this.redisPrefix}.uns.${topic}`, clientID);
  }

  async publish (topic, messageBuffer) {
    // tell all nodes (including this one) to publish to subscribed clients
    this.ravelApp.$kvstore.publish(`${this.redisPrefix}.pub.${topic}`, messageBuffer);
  }

  async localSubscribe (topic, clientID) {
    // ask elements of the app if this subscription is legal
    await this.emit(`can subscribe to ${topic}`, clientID);
    // only subscribe if the client exists on this node
    if (!this.hasClient(clientID)) return;
    // create local topic map if necessary
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Map());
    }
    // store reference to client connection in topic
    this.subscribers.get(topic).set(clientID, this.getClient(clientID));
  }

  localUnsubscribe (topic, clientID) {
    if (this.subscribers.has(topic)) {
      this.subscribers.get(topic).delete(clientID);
    }
  }

  localSubscribers (topic) {
    if (this.subscribers.has(topic)) {
      this.subscribers.get(topic).keys();
    } else {
      return [];
    }
  }

  localPublish (topic, messageBuffer) {
    this.localSubscribers(topic).forEach(client => {
      if (client.readyState !== WebSocket.OPEN) return;
      client.send(messageBuffer);
    });
  }

  async close () {
    return new Promise((resolve, reject) => {
      if (this.wss) {
        this.wss.close((err) => {
          if (err) return reject(err);
          return resolve();
        });
      }
      if (this.pubRedis) {
        this.pubRedis.quit(); // TODO callback?
      }
    });
  }
}

module.exports = Broker;
