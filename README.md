## Installing

```
npm install easy-socket-browser --save
```

## Use
```js
import EasySocket from 'easy-socket-browser';

new EasySocket({
    name: 'im',
    autoReconnect: true,
    pingMsg: '{"type":"event","event":"ping","args":"ping"}'
  })
  .openUse((context, next) => {
    console.log("open");
    next();
  })
  .closeUse((context, next) => {
    console.log("close");
    next();
  }).errorUse((context, next) => {
    console.log("error", context.event);
    next();
  }).messageUse((context, next) => {
    if (context.res.type === 'event') {
      context.client.emit(context.res.event, context.res.args, true);
    }
    next();
  }).reconnectUse((context, next) => {
    console.log('reconnect...');
    next();
  }).remoteEmitUse((context, next) => {
    let client = context.client;
    let event = context.event;
    if (client.socket.readyState !== 1) {
      console.log('connection is not open')
    } else {
      client.socket.send(JSON.stringify({
        type: 'event',
        event: event.event,
        args: event.args
      }));
      next();
    }
  });

  let client=EasySocket.clients.get("im");
  client.connect('your server url');
  client.emit("message",'this is a message');//will send message to server
  client.on("serverMessage",data=>{
      //receive data from server
      console.log(data);
  });
```
**config**:

| property | description | require | default |
| ------ | ------ | ------ | ------ |
| name | instance's name |true| - |
| autoReconnect | heartCheck and autoReconnect |false|false|
| url | url |false|-|
| reconnectTimeout | reconnectTimeout |false|10000|
| pingTimeout | pingTimeout |false|15000|
| pongTimeout | pongTimeout |false|3000|
| pingMsg | pingMsg |false|'ping'|

## close

```js
let client=EasySocket.clients.get(im);
client&&client.close();
```

## open Middleware

```js
const easySocket = new EasySocket({
    name: 'im',
    autoReconnect: true,
    pingMsg: '{"type":"event","event":"ping","args":"ping"}'
  });
easySocket
    .openUse((context, next) => {
    console.log("open");
    next();
  })
```

**context properties**:

| property | description |  |
| ------ | ------ | ------ |
| client | instance of EasySocket ||
| event | WebSocket onopen event result ||

## close Middleware

```js
const easySocket = new EasySocket({
    name: 'im',
    autoReconnect: true,
    pingMsg: '{"type":"event","event":"ping","args":"ping"}'
  });
easySocket
    .closeUse((context, next) => {
    EasySocket.clients.delete(this.name);
    context.client.socket = null;
    context.client.connected = false;
    console.log("close");
    next();
  })
```

**context properties**:

| property | description |  |
| ------ | ------ | ------ |
| client | instance of EasySocket ||
| event | WebSocket onclose event result ||

## error Middleware
```js
const easySocket = new EasySocket({
    name: 'im',
    autoReconnect: true,
    pingMsg: '{"type":"event","event":"ping","args":"ping"}'
  });
easySocket
    .errorUse((context, next) => {
    console.log("error");
    next();
  })
```

**context properties**:

| property | description |  |
| ------ | ------ | ------ |
| client | instance of EasySocket ||
| event | WebSocket onclose event result ||



## message Middleware
```js
const easySocket = new EasySocket({
    name: 'im',
    autoReconnect: true,
    pingMsg: '{"type":"event","event":"ping","args":"ping"}'
  });
easySocket
    .messageUse((context, next) => {
    if (context.res.type === 'event') {
      context.client.emit(context.res.event, context.res.args, true);
    }
    next();
  })
```

**context properties**:

| property | description |  |
| ------ | ------ | ------ |
| client | instance of EasySocket ||
| event | WebSocket onmessage event result ||
| res | event.data ||


## remoteEmit Middleware
```js
const easySocket = new EasySocket({
    name: 'im',
    autoReconnect: true,
    pingMsg: '{"type":"event","event":"ping","args":"ping"}'
  });
easySocket
    .remoteEmitUse((context, next) => {
    let client = context.client;
    let event = context.event;
    if (client.socket.readyState !== 1) {
      console.log('connection is not open')
    } else {
      client.socket.send(JSON.stringify({
        type: 'event',
        event: event.event,
        args: event.args
      }));
      next();
    }
  })
```
**context properties**:

| property | description |  |
| ------ | ------ | ------ |
| client | instance of EasySocket ||
| event | event and args ||

## reconnect Middleware
```js
const easySocket = new EasySocket({
    name: 'im',
    autoReconnect: true,
    pingMsg: '{"type":"event","event":"ping","args":"ping"}'
  });
easySocket
    .reconnectUse((context, next) => {
      console.log('reconnect...');
      next();
    }
  })
```
**context properties**:

| property | description |  |
| ------ | ------ | ------ |
| client | instance of EasySocket ||




## example and online demo

[chat example](https://github.com/wjkang/lazy-mock-im)

[online chat demo](http://jaycewu.coding.me/easy-socket-chat/#/)








