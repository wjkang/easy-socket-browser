import compose from './compose';
import Emitter from './Emitter';

export default class EasySocket extends Emitter {
    static clients = new Map();
    constructor(config) {
        super();
        if (!config || !config.name) {
            throw new Error('name is required!');
        }
        this.name = config.name;
        this.url = config.url;
        this.connected = false;
        this.autoReconnect = config.autoReconnect;
        this.forbidReconnect = config.autoReconnect;// 调用close 的时候设置forbidReconnect=false,而不是autoReconnect，避免同一个实例close后再调用connet,是否重连配置不一致
        this.reconnectTimeout = config.reconnectTimeout || 10000;
        this.pingTimeout = config.pingTimeout || 15000;//默认15000毫秒没有收到消息则发送ping
        this.pongTimeout = config.pongTimeout || 3000;//发送ping之后，未收到消息超时时间，默认3000毫秒
        this.pingMsg = config.pingMsg || "ping";

        this.openMiddleware = [];
        this.closeMiddleware = [];
        this.messageMiddleware = [];
        this.errorMiddleware = [];
        this.remoteEmitMiddleware = [];
        this.reconnectMiddleware = [];

        this.openFn = Promise.resolve();
        this.closeFn = Promise.resolve();
        this.messageFn = Promise.resolve();
        this.errorFn = Promise.resolve();
        this.remoteEmitFn = Promise.resolve();
        this.reconnectFn = Promise.resolve();

        EasySocket.clients.set(this.name, this);
    }
    openUse(fn) {
        this.openMiddleware.push(fn);
        return this;
    }
    closeUse(fn, runtime) {
        this.closeMiddleware.push(fn);
        if (runtime) {
            this.closeFn = compose(this.closeMiddleware);
        }
        return this;
    }
    messageUse(fn, runtime) {
        this.messageMiddleware.push(fn);
        if (runtime) {
            this.messageFn = compose(this.messageMiddleware);
        }
        return this;
    }
    errorUse(fn, runtime) {
        this.errorMiddleware.push(fn);
        if (runtime) {
            this.errorFn = compose(this.errorMiddleware);
        }
        return this;
    }
    remoteEmitUse(fn, runtime) {
        this.remoteEmitMiddleware.push(fn);
        if (runtime) {
            this.remoteEmitFn = compose(this.remoteEmitMiddleware);
        }
        return this;
    }
    reconnectUse(fn, runtime) {
        this.reconnectMiddleware.push(fn);
        if (runtime) {
            this.reconnectFn = compose(this.reconnectMiddleware);
        }
        return this;
    }
    connect(url) {

        this.url = url || this.url;
        this.forbidReconnect = this.autoReconnect;//手动close,会将forbidReconnect设置为false,再次调用connect重新设置

        if (!this.url) {
            throw new Error('url is required!');
        }
        try {
            this.socket = new WebSocket(this.url, 'echo-protocol');
        } catch (e) {
            if (this.autoReconnect) {
                this.reconnect();
            }
            throw e;
        }

        this.openFn = compose(this.openMiddleware);
        this.socket.addEventListener('open', (event) => {
            let context = { client: this, event };
            this.openFn(context).catch(error => { console.log(error) });
            if (this.autoReconnect) {
                this.heartCheck();
            }
        });

        this.closeFn = compose(this.closeMiddleware);
        this.socket.addEventListener('close', (event) => {
            let context = { client: this, event };
            this.closeFn(context).then(() => {
                // EasySocket.clients.delete(this.name);
                // this.socket = null;
                // this.connected = false;
            }).catch(error => {
                console.log(error)
            });
            if (this.autoReconnect) {
                this.reconnect();
            }
        });

        this.messageFn = compose(this.messageMiddleware);
        this.socket.addEventListener('message', (event) => {
            let res;
            try {
                res = JSON.parse(event.data);
            } catch (error) {
                res = event.data;
            }
            let context = { client: this, event, res };
            this.messageFn(context).then(() => {

            }).catch(error => {
                console.log(error)
            });
            if (this.autoReconnect) {
                this.heartCheck();
            }
        });

        this.errorFn = compose(this.errorMiddleware);
        this.socket.addEventListener('error', (event) => {
            let context = { client: this, event };
            this.errorFn(context).then(() => {

            }).catch(error => {
                console.log(error)
            });
            if (this.autoReconnect) {
                this.reconnect();
            }
        });

        this.remoteEmitFn = compose(this.remoteEmitMiddleware);
        this.reconnectFn = compose(this.reconnectMiddleware);
        this.connected = true;
        return this;
    }
    reconnect() {
        //手动断开，不进行重连
        if (this.lockReconnect || !this.forbidReconnect) {
            return;
        }
        this.lockReconnect = true;//new WebSocket失败后重连，旧的WebSocket实例会触发error导致再次重连，旧的实例回收也会触发close导致重连
        //一段时间后重新连接
        setTimeout(() => {
            let context = { client: this };
            this.reconnectFn(context).then(() => {

            }).catch(error => {
                console.log(error)
            });
            this.lockReconnect = false;
            this.connect();
        }, this.reconnectTimeout);
    }
    close() {
        this.connected = false;
        this.forbidReconnect = false;//标记手动关闭，避免触发close事件的时候进行重连
        this.heartReset();
        this.socket.close();
    }
    emit(event, args, isLocal = false) {
        let arr = [event, args];
        if (isLocal) {
            super.emit.apply(this, arr);
            return this;
        }
        let evt = {
            event: event,
            args: args
        }
        let remoteEmitContext = { client: this, event: evt };
        this.remoteEmitFn(remoteEmitContext).catch(error => { console.log(error) })
        return this;
    }
    heartCheck() {
        this.heartReset();
        this.heartStart();
    }
    heartStart() {
        this.pingTimeoutId = setTimeout(() => {
            //这里发送一个心跳，后端收到后，返回一个心跳消息
            this.socket.send(this.pingMsg);
            //接收到心跳信息说明连接正常,会执行heartCheck(),重置心跳(清除下面定时器)
            this.pongTimeoutId = setTimeout(() => {
                //此定时器有运行的机会，说明发送ping后，设置的超时时间内未收到返回信息
                this.socket.close();//不直接调用reconnect，避免旧WebSocket实例没有真正关闭，导致不可预料的问题
            }, this.pongTimeout);
        }, this.pingTimeout);
    }
    heartReset() {
        clearTimeout(this.pingTimeoutId);
        clearTimeout(this.pongTimeoutId);
    }

}
