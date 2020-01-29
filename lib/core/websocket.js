'use strict';

const crypto = require('crypto');
const WebSocket = require('ws');
const sWsSessionKey = Symbol.for('_wsSessionKey');

/**
 * WebSockets for Ravel.
 *
 * @private
 */
class Broker {
  constructor (ravelApp) {
    this.ravelApp = ravelApp;
    this.clients = new Map(); // stores clients (session ID -> connection)
    this.subscribers = new Map(); // stores subscribers for a topic on this node
    if (this.ravelApp.get('enable websockets')) {
      ravelApp.on('end', this.close.bind(this));
      ravelApp.on('post init', this.init.bind(this));
    }
  }

  init () {
    // set up websocket on server, with session cookie generation
    this.wss = new WebSocket.Server({
      noServer: true,
      maxPayload: this.ravelApp.get('max websocket payload bytes')
    });
    this.wss.on('headers', (headers, request) => {
      // send key to client as a cookie - this is how we will identify them
      // store key on request object so we can use it in handleUpgrade
      request[sWsSessionKey] = crypto.randomBytes(20).toString('hex');
      headers.push(`set-cookie: ravel.ws.id=${request[sWsSessionKey]}; HttpOnly;`);
    });
    this.ravelApp.server.on('upgrade', (request, socket, head) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        ws.clientID = request[sWsSessionKey];
        this.clients.set(request[sWsSessionKey], ws);
        this.wss.emit('connection', ws, request);
      });
    });
    // set up redis connection for publish IPC between nodes
    this.redisPrefix = this.ravelApp.get('redis websocket channel prefix');
    this.redis = this.ravelApp.$kvstore.clone();
    this.redis.on('pmessage', (pattern, channel, messageBuffer) => {
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
    this.redis.psubscribe(`${this.redisPrefix}.*`);
  }

  hasClient (clientID) {
    return this.clients.has(clientID);
  }

  getClient (clientID) {
    return this.clients.get(clientID);
  }

  getClientID (ctx) {
    const clientID = ctx.cookies.get('ravel.ws.id');
    if (!clientID) {
      throw new Error('WebSocket cookie ravel.ws.id not found in request.');
    }
    return clientID;
  }

  /**
   * Subscribe to a websocket topic.
   *
   * @private
   * @param {string} topic - A dot-separated topic name, respecting /^\w+(?:\.\w+)*$/.
   * @param {string} clientID - A websocket clientID (the value of the ravel.ws.id cookie).
   */
  async subscribe (topic, clientID) {
    // verify dot separated
    if (!topic.match(/^\w+(?:\.\w+)*$/)) {
      throw new this.ravelApp.$err.IllegalValue('Topic names must be dot-separated /^\\w+(?:\\.\\w+)*$/');
    }
    this.ravelApp.$kvstore.publish(`${this.redisPrefix}.sub.${topic}`, clientID);
    return topic;
  }

  /**
   * Unsubscribe from a websocket topic.
   *
   * @private
   * @param {string} topic - A dot-separated topic name, respecting /^\w+(?:\.\w+)*$/.
   * @param {string} clientID - A websocket clientID (the value of the ravel.ws.id cookie).
   */
  async unsubscribe (topic, clientID) {
    this.ravelApp.$kvstore.publish(`${this.redisPrefix}.uns.${topic}`, clientID);
    return topic;
  }

  /**
   * Publish to all clients subscribing to a websocket topic.
   *
   * @private
   * @param {string} topic - A dot-separated topic name, respecting /^\w+(?:\.\w+)*$/.
   * @param {string} message - A message.
   */
  async publish (topic, message) {
    // tell all nodes (including this one) to publish to subscribed clients
    this.ravelApp.$kvstore.publish(`${this.redisPrefix}.pub.${topic}`, JSON.stringify(message));
    return topic;
  }

  async localSubscribe (topic, clientID) {
    // only subscribe if the client exists on this node
    if (!this.hasClient(clientID)) return;
    // create local topic map if necessary
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Map());
    }
    // store reference to client connection in topic
    this.subscribers.get(topic).set(clientID, this.getClient(clientID));
  }

  async localUnsubscribe (topic, clientID) {
    if (this.subscribers.has(topic)) {
      this.subscribers.get(topic).delete(clientID);
    }
  }

  localSubscribers (topic) {
    if (this.subscribers.has(topic)) {
      return this.subscribers.get(topic).values();
    } else {
      return [];
    }
  }

  localPublish (topic, messageBuffer) {
    for (const client of this.localSubscribers(topic)) {
      if (client.readyState !== WebSocket.OPEN) {
        // cleanup later
        setTimeout(() => {
          this.localUnsubscribe(topic, client.clientID);
          this.clients.delete(client.clientID);
        }, 1);
      } else {
        client.send(messageBuffer);
      }
    }
  }

  async close () {
    return new Promise((resolve, reject) => {
      this.wss && this.wss.close((err) => {
        if (err) return reject(err);
        return resolve();
      });
      this.redis && this.redis.quit(); // TODO callback?
    });
  }
}

module.exports = Broker;
