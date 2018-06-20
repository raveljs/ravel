WebSockets in Ravel have been implemented in an extremely minimalistic fashion, both in keeping with Ravel's philosophy of minimizing dependencies, and to promote safer usage of WebSocket technology within applications.

WebSockets in Ravel:
- Support a basic publish/subscribe model
- Wrap around [ws](https://github.com/websockets/ws), rather than a more complex (and dependency-heavy) library with transport fallbacks.
- Are automatically safe for horizontal scaling, using `redis` to synchronize between different replicas of your application.
- Are essentially **one-way**. Browser clients receive messages, but make HTTP requests to "send" them. This allows you to 1. set the rules for who can publish what and when, and 2. leverage existing Ravel functionality like `@authenticated` when defining your own publish endpoints. This also avoids the introduction of a custom message protocol such as STOMP and keeps things as straightforward as possible.

To utilize WebSockets, define your own endpoints (and logic) which allow clients to subscribe to topics, for example:

```js
/**
 * A RESTful resource to manage subscriptions
 *
 * You could protect any of these endpoints with @authenticated,
 * or define your own custom application logic!
 */
@Ravel.Resource('/ws/mytopic/subscription')
@Ravel.autoinject('$ws')
class WSSubscriptions {
  // user would send an empty POST to /ws/mytopic/subscription
  // to subscribe to my.topic
  async post (ctx) {
    ctx.body = await this.$ws.subscribe('my.topic', ctx);
  }

  // user would send an empty DELETE to /ws/mytopic/subscription
  // to unsubscribe from my.topic
  async deleteAll (ctx) {
    ctx.body = await this.$ws.unsubscribe('my.topic', ctx);
  }
}
```

```js
/**
 * A RESTful resource to handle message publication
 */
@Ravel.Resource('/ws/mytopic')
@Ravel.inject('koa-bodyparser')
@Ravel.autoinject('$ws')
class WSMessages {
  constructor(bodyparser) {
    this['body-parser']  = bodyparser();
  }
  // user would send a POST to /ws/mytopic
  // to send a message
  @Ravel.Resource.before('bodyparser')
  async post (ctx) {
    ctx.body = await this.$ws.publish('my.topic', ctx.request.body);
  }
}
```

Then, on the client, the [ws](https://github.com/websockets/ws) library can be used normally to connect to the Ravel server and listen for the `on('message')` event.
