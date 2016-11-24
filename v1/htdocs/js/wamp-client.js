function mylog(msg) { /*console.log(msg);*/ };
var ArgumentNullException = function() {};
var WAMP_MSG_TYPE = {
  HELLO: 1,
  WELCOME: 2,
  ABORT: 3,
  CHALLENGE: 4,
  AUTHENTICATE: 5,
  GOODBYE: 6,
  HEARTBEAT: 7,
  ERROR: 8,
  PUBLISH: 16,
  PUBLISHED: 17,
  SUBSCRIBE: 32,
  SUBSCRIBED: 33,
  UNSUBSCRIBE: 34,
  UNSUBSCRIBED: 35,
  EVENT: 36,
  CALL: 48,
  CANCEL: 49,
  RESULT: 50,
  REGISTER: 64,
  REGISTERED: 65,
  UNREGISTER: 66,
  UNREGISTERED: 67,
  INVOCATION: 68,
  INTERRUPT: 69,
  YIELD: 70
};
var WampClientCore = (function() {
  var wampClientCore = function() {
    this.openCallback = {
      func: null
    };
    this.closeCallback = {
      func: null
    };
    this.helloCallback = {
      func: null
    };
    this.authenticateCallback = {
      func: null
    };
    this.goodbyeCallback = {
      func: null
    };
    this.heartbeatCallback = {
      func: null
    };
    this.publishCallback = {
      func: []
    };
    this.subscribeCallback = {
      func: []
    };
    this.unsubscribeCallback = {
      func: []
    };
    this.callCallback = {
      func: []
    };
    this.cancelCallback = {
      func: []
    };
    this.registerCallback = {
      func: []
    };
    this.unregisterCallback = {
      func: []
    };
    this.eventCallback = {
      func: []
    };
    this.invocationCallback = {
      func: []
    };
    this.interruptCallback = {
      func: []
    }
  };
  wampClientCore.prototype.setOpenCallback = function(func) {
    this.openCallback.func = func;
    return 0
  };
  wampClientCore.prototype.getOpenCallback = function() {
    return this.openCallback.func
  };
  wampClientCore.prototype.setcloseCallback = function(func) {
    this.closeCallback.func = func;
    return 0
  };
  wampClientCore.prototype.getCloseCallback = function() {
    return this.closeCallback.func
  };
  wampClientCore.prototype.setHelloCallback = function(func) {
    this.helloCallback.func = func;
    return 0
  };
  wampClientCore.prototype.getHelloCallback = function() {
    return this.helloCallback.func
  };
  wampClientCore.prototype.setAuthenticateCallback = function(func) {
    this.authenticateCallback.func = func;
    return 0
  };
  wampClientCore.prototype.getAuthenticateCallback = function() {
    return this.authenticateCallback.func
  };
  wampClientCore.prototype.setGoodbyeCallback = function(func) {
    this.goodbyeCallback.func = func;
    return 0
  };
  wampClientCore.prototype.deleteGoodbyeCallback = function() {
    this.goodbyeCallback.func = null;
    return 0
  };
  wampClientCore.prototype.getGoodbyeCallback = function() {
    return this.goodbyeCallback.func
  };
  wampClientCore.prototype.setHeartbeatCallback = function(func) {
    this.heartbeatCallback.func = func;
    return 0
  };
  wampClientCore.prototype.deleteHeartbeatCallback = function() {
    this.heartbeatCallback.func = null;
    return 0
  };
  wampClientCore.prototype.getHeartbeatCallback = function() {
    return this.heartbeatCallback.func
  };
  wampClientCore.prototype.setPublishCallback = function(func, request) {
    this.publishCallback.func[request] = func;
    return 0
  };
  wampClientCore.prototype.getPublishCallback = function(request) {
    return this.publishCallback.func[request]
  };
  wampClientCore.prototype.setSubscribeCallback = function(func, request) {
    this.subscribeCallback.func[request] = func;
    return 0
  };
  wampClientCore.prototype.getSubscribeCallback = function(request) {
    return this.subscribeCallback.func[request]
  };
  wampClientCore.prototype.setUnsubscribeCallback = function(func, request) {
    this.unsubscribeCallback.func[request] = func;
    return 0
  };
  wampClientCore.prototype.getUnsubscribeCallback = function(request) {
    return this.unsubscribeCallback.func[request]
  };
  wampClientCore.prototype.setCallCallback = function(func, request) {
    this.callCallback.func[request] = func;
    return 0
  };
  wampClientCore.prototype.getCallCallback = function(request) {
    return this.callCallback.func[request]
  };
  wampClientCore.prototype.setCancelCallback = function(func, request) {
    this.cancelCallback.func[request] = func;
    return 0
  };
  wampClientCore.prototype.getCancelCallback = function(request) {
    return this.cancelCallback.func[request]
  };
  wampClientCore.prototype.setRegisterCallback = function(func, request) {
    this.registerCallback.func[request] = func;
    return 0
  };
  wampClientCore.prototype.getRegisterCallback = function(request) {
    return this.registerCallback.func[request]
  };
  wampClientCore.prototype.setUnregisterCallback = function(func, request) {
    this.unregisterCallback.func[request] = func;
    return 0
  };
  wampClientCore.prototype.getUnregisterCallback = function(request) {
    return this.unregisterCallback.func[request]
  };
  wampClientCore.prototype.setEventCallback = function(func, request) {
    this.eventCallback.func[request] = func;
    return 0
  };
  wampClientCore.prototype.deleteEventCallback = function(request) {
    this.eventCallback.func[request] = null;
    return 0
  };
  wampClientCore.prototype.getEventCallback = function(request) {
    return this.eventCallback.func[request]
  };
  wampClientCore.prototype.setInvocationCallback = function(func, request) {
    this.invocationCallback.func[request] = func;
    return 0
  };
  wampClientCore.prototype.deleteInvocationCallback = function(request) {
    this.invocationCallback.func[request] = null;
    return 0
  };
  wampClientCore.prototype.getInvocationCallback = function(request) {
    return this.invocationCallback.func[request]
  };
  wampClientCore.prototype.setInterruptCallback = function(func, request) {
    this.interruptCallback.func[request] = func;
    return 0
  };
  wampClientCore.prototype.deleteInterruptCallback = function(request) {
    this.interruptCallback.func[request] = null;
    return 0
  };
  wampClientCore.prototype.getInterruptCallback = function(request) {
    return this.interruptCallback.func[request]
  };
  return wampClientCore
})();
var WampSerializer = (function() {
  var wampSerializer = function() {};
  wampSerializer.prototype.createHello = function(realm, details) {
    var data;
    if (!realm) throw new ArgumentNullException();
    if (!details) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.HELLO, realm, details]);
    mylog("[wamp][HELLO] " + data);
    return data
  };
  wampSerializer.prototype.createWelcome = function(session, details) {
    var data;
    if (!session) throw new ArgumentNullException();
    if (!details) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.WELCOME, session, details]);
    mylog("[wamp][WELCOME] " + data);
    return data
  };
  wampSerializer.prototype.createAbort = function(details, reason) {
    var data;
    if (!details) throw new ArgumentNullException();
    if (!reason) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.ABORT, details, reason]);
    mylog("[wamp][ABORT] " + data);
    return data
  };
  wampSerializer.prototype.createChallenge = function(authMethod, extra) {
    var data;
    if (!authMethod) throw new ArgumentNullException();
    if (!extra) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.CHALLENGE, authMethod, extra]);
    mylog("[wamp][CHALLENGE] " + data);
    return data
  };
  wampSerializer.prototype.createAuthenticate = function(signature, extra) {
    var data;
    if (!signature) throw new ArgumentNullException();
    if (!extra) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.AUTHENTICATE, signature, extra]);
    mylog("[wamp][AUTHENTICATE] " + data);
    return data
  };
  wampSerializer.prototype.createGoodbye = function(details, reason) {
    var data;
    if (!details) throw new ArgumentNullException();
    if (!reason) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.GOODBYE, details, reason]);
    mylog("[wamp][GOODBYE] " + data);
    return data
  };
  wampSerializer.prototype.createHeartbeat = function(incomingSeq, outgoingSeq, discard) {
    var data;
    if (!incomingSeq) throw new ArgumentNullException();
    if (!outgoingSeq) throw new ArgumentNullException();
    if (discard == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.HEARTBEAT, incomingSeq, outgoingSeq])
    } else {
      data = JSON.stringify([WAMP_MSG_TYPE.HEARTBEAT, incomingSeq, outgoingSeq, discard])
    }
    mylog("[wamp][HEARTBEAT] " + data);
    return data
  };
  wampSerializer.prototype.createError = function(type, request, details, error, arguments, argumentsKw) {
    var data;
    if (!type) throw new ArgumentNullException();
    if (!request) throw new ArgumentNullException();
    if (!details) throw new ArgumentNullException();
    if (!error) throw new ArgumentNullException();
    if (arguments == null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.ERROR, type, request, details, error])
    } else if (arguments != null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.ERROR, type, request, details, error, arguments])
    } else {
      data = JSON.stringify([WAMP_MSG_TYPE.ERROR, type, request, details, error, arguments, argumentsKw])
    }
    mylog("[wamp][ERROR] " + data);
    return data
  };
  wampSerializer.prototype.createPublish = function(request, options, topic, arguments, argumentsKw) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!options) throw new ArgumentNullException();
    if (!topic) throw new ArgumentNullException();
    if (arguments == null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.PUBLISH, request, options, topic])
    } else if (arguments != null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.PUBLISH, request, options, topic, arguments])
    } else {
      data = JSON.stringify([WAMP_MSG_TYPE.PUBLISH, request, options, topic, arguments, argumentsKw])
    }
    mylog("[wamp][PUBLISH] " + data);
    return data
  };
  wampSerializer.prototype.createPublished = function(request, publication) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!publication) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.PUBLISHED, request, publication]);
    mylog("[wamp][PUBLISHED] " + data);
    return data
  };
  wampSerializer.prototype.createSubscribe = function(request, options, topic) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!options) throw new ArgumentNullException();
    if (!topic) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.SUBSCRIBE, request, options, topic]);
    mylog("[wamp][SUBSCRIBE] " + data);
    return data
  };
  wampSerializer.prototype.createSubscribed = function(request, subscription) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!subscription) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.SUBSCRIBED, request, subscription]);
    mylog("[wamp][SUBSCRIBED] " + data);
    return data
  };
  wampSerializer.prototype.createUnsubscribe = function(request, subscription) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!subscription) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.UNSUBSCRIBE, request, subscription]);
    mylog("[wamp][UNSUBSCRIBE] " + data);
    return data
  };
  wampSerializer.prototype.createUnsubscribed = function(request) {
    var data;
    if (!request) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.UNSUBSCRIBED, request]);
    mylog("[wamp][UNSUBSCRIBED] " + data);
    return data
  };
  wampSerializer.prototype.createEvent = function(subscription, publication, details, arguments, argumentsKw) {
    var data;
    if (!subscription) throw new ArgumentNullException();
    if (!publication) throw new ArgumentNullException();
    if (!details) throw new ArgumentNullException();
    if (arguments == null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.EVENT, subscription, publication, details])
    } else if (arguments != null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.EVENT, subscription, publication, details, arguments])
    } else {
      data = JSON.stringify([WAMP_MSG_TYPE.EVENT, subscription, publication, details, arguments, argumentsKw])
    }
    mylog("[wamp][EVENT] " + data);
    return data
  };
  wampSerializer.prototype.createCall = function(request, options, procedure, arguments, argumentsKw) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!options) throw new ArgumentNullException();
    if (!procedure) throw new ArgumentNullException();
    if (arguments == null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.CALL, request, options, procedure])
    } else if (arguments != null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.CALL, request, options, procedure, arguments])
    } else {
      data = JSON.stringify([WAMP_MSG_TYPE.CALL, request, options, procedure, arguments, argumentsKw])
    }
    mylog("[wamp][CALL] " + data);
    return data
  };
  wampSerializer.prototype.createCancel = function(request, options) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!options) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.CANCEL, request, options]);
    mylog("[wamp][CANCEL] " + data);
    return data
  };
  wampSerializer.prototype.createResult = function(request, details, arguments, argumentsKw) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!details) throw new ArgumentNullException();
    if (arguments == null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.RESULT, request, details])
    } else if (arguments != null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.RESULT, request, details, arguments])
    } else {
      data = JSON.stringify([WAMP_MSG_TYPE.RESULT, request, details, arguments, argumentsKw])
    }
    mylog("[wamp][RESULT] " + data);
    return data
  };
  wampSerializer.prototype.createRegister = function(request, options, procedure) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!options) throw new ArgumentNullException();
    if (!procedure) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.REGISTER, request, options, procedure]);
    mylog("[wamp][REGISTER] " + data);
    return data
  };
  wampSerializer.prototype.createRegistered = function(request, registration) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!registration) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.REGISTERED, request, registration]);
    mylog("[wamp][REGISTERED] " + data);
    return data
  };
  wampSerializer.prototype.createUnregister = function(request, registration) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!registration) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.UNREGISTER, request, registration]);
    mylog("[wamp][UNREGISTER] " + data);
    return data
  };
  wampSerializer.prototype.createUnregistered = function(request) {
    var data;
    if (!request) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.UNREGISTERED, request]);
    mylog("[wamp][UNREGISTERED] " + data);
    return data
  };
  wampSerializer.prototype.createInvocation = function(request, registration, details, arguments, argumentsKw) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!registration) throw new ArgumentNullException();
    if (!details) throw new ArgumentNullException();
    if (arguments == null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.INVOCATION, request, registration, details])
    } else if (arguments != null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.INVOCATION, request, registration, details, arguments])
    } else {
      data = JSON.stringify([WAMP_MSG_TYPE.INVOCATION, request, registration, details, arguments, argumentsKw])
    }
    mylog("[wamp][INVOCATION] " + data);
    return data
  };
  wampSerializer.prototype.createInterrupt = function(request, options) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!options) throw new ArgumentNullException();
    data = JSON.stringify([WAMP_MSG_TYPE.INTERRUPT, request, options]);
    mylog("[wamp][INTERRUPT] " + data);
    return data
  };
  wampSerializer.prototype.createYield = function(request, options, arguments, argumentsKw) {
    var data;
    if (!request) throw new ArgumentNullException();
    if (!options) throw new ArgumentNullException();
    if (arguments == null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.YIELD, request, options])
    } else if (arguments != null && argumentsKw == null) {
      data = JSON.stringify([WAMP_MSG_TYPE.YIELD, request, options, arguments])
    } else {
      data = JSON.stringify([WAMP_MSG_TYPE.YIELD, request, options, arguments, argumentsKw])
    }
    mylog("[wamp][YIELD] " + data);
    return data
  };
  return wampSerializer
})();
var WampDeserializer = (function() {
  var WampDeserializer = function() {};
  WampDeserializer.prototype.parse = function(msg) {
    var data;
    if (!msg) throw new ArgumentNullException();
    mylog("[wamp perser] message received", msg);
    data = JSON.parse(msg);
    if (!(data instanceof Array) || data.length < 2) {
      return null
    }
    switch (data[0]) {
      case WAMP_MSG_TYPE.HELLO:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.WELCOME:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.ABORT:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.CHALLENGE:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.AUTHENTICATE:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.GOODBYE:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.HEARTBEAT:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.ERROR:
        if (data.length < 5) {
          return null
        }
        switch (data[1]) {
          case WAMP_MSG_TYPE.GOODBYE:
          case WAMP_MSG_TYPE.YIELD:
          case WAMP_MSG_TYPE.ERROR:
          case WAMP_MSG_TYPE.SUBSCRIBE:
          case WAMP_MSG_TYPE.UNSUBSCRIBE:
          case WAMP_MSG_TYPE.PUBLISH:
          case WAMP_MSG_TYPE.INVOCATION:
          case WAMP_MSG_TYPE.CALL:
            break;
          case WAMP_MSG_TYPE.REGISTER:
          case WAMP_MSG_TYPE.UNREGISTER:
            break;
          default:
            return null
        }
        break;
      case WAMP_MSG_TYPE.PUBLISH:
        if (data.length < 4) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.PUBLISHED:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.SUBSCRIBE:
        if (data.length < 4) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.SUBSCRIBED:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.UNSUBSCRIBE:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.UNSUBSCRIBED:
        if (data.length < 2) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.EVENT:
        if (data.length < 4) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.CALL:
        if (data.length < 4) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.CANCEL:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.RESULT:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.REGISTER:
        if (data.length < 4) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.REGISTERED:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.UNREGISTER:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.UNREGISTERED:
        if (data.length < 2) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.INVOCATION:
        if (data.length < 4) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.INTERRUPT:
        if (data.length < 3) {
          return null
        }
        break;
      case WAMP_MSG_TYPE.YIELD:
        if (data.length < 3) {
          return null
        }
        break;
      default:
        return null
    }
    return data
  };
  return WampDeserializer
})();
