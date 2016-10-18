var ArgumentNullException = function() {};


function WampClientManager() {
  var self = this;

  this.protocols = ['wamp.2.json'];
  this.request_id = 1;
  this.subscription_id_list = [];


  var wampSerializer = new WampSerializer();
  var wampDeserializer = new WampDeserializer();
  var wampClientCore = new WampClientCore();
  var wampConnectRetryNum = -1;





  //////////////////////////////////////////
  //////////////////////////////////////////
  // Internal callbacks
  //////////////////////////////////////////
  //////////////////////////////////////////

  function onOpen() {
    mylog("[WAMP Client] control panel connected");
    this.on_hello_welcomed = false;

    var callback;
    callback = wampClientCore.getOpenCallback();

    if (callback != null) {
      callback();
    }
    return;
  };

  function onClose() {
    mylog("[WAMP Client] websocket disconnected");

    if (!this.on_hello_welcomed) {
      // Cannot connect (forward to oauth in ancient days)
    }

    var callback;
    callback = wampClientCore.getCloseCallback();

    if (callback != null) {
      callback();
    }

    if (this.on_hello_welcomed) {
      if (this.disconnected_callback != undefined)
        this.disconnected_callback();
    }
    return;
  };

  function onError(error) {
    if (this.errorCallback)
      this.errorCallback(error);

    return;
  };

  function onReceiveMessage(msg) {
    var data;
    var callback;

    //decrypt data

    //deserialize
    if (msg.data != undefined || msg.data != null)
      msg = msg.data;

    data = wampDeserializer.parse(msg);

    if (data == null) {
      mylog("[wamp perser] Syntax error : " + msg);
      //this.msg_part = msg ;
      return;
    }

    mylog(msg); // Message processed.


    switch (data[0]) {
      case WAMP_MSG_TYPE.WELCOME:
        // WAMP SPEC: [WELCOME, Session|id, Details|dict]

        if (this.challnge_flag) {
          this.challnge_flag = false;
          callback = wampClientCore.getAuthenticateCallback();
          if (callback != null) {
            callback(data);
          } else {
            mylog("[wamp perser] Callback does not exist.");
          }
        } else {
          callback = wampClientCore.getHelloCallback();

          if (callback != null) {
            callback(data);
          } else {
            mylog("[wamp perser] Callback does not exist.");
          }
        }
        break;
      case WAMP_MSG_TYPE.ABORT:
        // WAMP SPEC: [ABORT, Details|dict, Reason|uri]
        if (this.challnge_flag) {
          this.challnge_flag = false;
          callback = wampClientCore.getAuthenticateCallback();
          if (callback != null) {
            callback(data);
          } else {
            mylog("[wamp perser] Callback does not exist.");
          }
        } else {
          callback = wampClientCore.getHelloCallback();
          if (callback != null) {
            callback(data);
          } else {
            mylog("[wamp perser] Callback does not exist.");
          }
        }
        break;
      case WAMP_MSG_TYPE.CHALLENGE:
        // advanced WAMP SPEC: [CHALLENGE, AuthMethod|string, Extra|dict]
        this.challnge_flag = true;
        callback = wampClientCore.getHelloCallback();
        if (callback != null) {
          callback(data);
        } else {
          mylog("[wamp perser] Callback does not exist.");
        }
        break;
      case WAMP_MSG_TYPE.GOODBYE:
        // WAMP SPEC: [GOODBYE, Details|dict, Reason|uri]
        callback = wampClientCore.getGoodbyeCallback();
        if (callback != null) {
          callback(data);
        } else {
          mylog("[wamp perser] Callback does not exist.");
        }
        break;
      case WAMP_MSG_TYPE.HEARTBEAT:
        // advanced WAMP SPEC: [AUTHENTICATE, Signature|string, Extra|dict]
        callback = wampClientCore.getHeartbeatCallback();
        if (callback != null) {
          callback(data);
        } else {
          mylog("[wamp perser] Callback does not exist.");
        }
        break;
      case WAMP_MSG_TYPE.ERROR:
        // WAMP SPEC: [ERROR, REQUEST.Type|int, REQUEST.Request|id, Details|dict, Error|uri, (Arguments|list, ArgumentsKw|dict)]
        switch (data[1]) {
          case WAMP_MSG_TYPE.SUBSCRIBE:
            // WAMP SPEC: [ERROR, SUBSCRIBE, SUBSCRIBE.Request|id, Details|dict, Error|uri]
            callback = wampClientCore.getSubscribeCallback(data[2]);
            if (callback != null) {
              callback(data);
            } else {
              mylog("[wamp perser] Callback does not exist.");
            }
            break;
          case WAMP_MSG_TYPE.UNSUBSCRIBE:
            // WAMP SPEC: [ERROR, UNSUBSCRIBE, UNSUBSCRIBE.Request|id, Details|dict, Error|uri]
            callback = wampClientCore.getUnsubscribeCallback(data[2]);
            if (callback != null) {
              callback(data);
            } else {
              mylog("[wamp perser] Callback does not exist.");
            }
            break;
          case WAMP_MSG_TYPE.PUBLISH:
            // WAMP SPEC: [ERROR, PUBLISH, PUBLISH.Request|id, Details|dict, Error|uri]
            callback = wampClientCore.getPublishCallback(data[2]);
            if (callback != null) {
              callback(data);
            } else {
              mylog("[wamp perser] Callback does not exist.");
            }
            break;
          case WAMP_MSG_TYPE.INVOCATION:
            // WAMP SPEC: [ERROR, INVOCATION, INVOCATION.Request|id, Details|dict, Error|uri]
            // WAMP SPEC: [ERROR, INVOCATION, INVOCATION.Request|id, Details|dict, Error|uri, Arguments|list]
            // WAMP SPEC: [ERROR, INVOCATION, INVOCATION.Request|id, Details|dict, Error|uri, Arguments|list, ArgumentsKw|dict]
            callback = wampClientCore.getInvocationCallback(data[2]);
            if (callback != null) {
              callback(data);
            } else {
              mylog("[wamp perser] Callback does not exist.");
            }
            break;
          case WAMP_MSG_TYPE.CALL:
            // WAMP SPEC: [ERROR, CALL, CALL.Request|id, Details|dict, Error|uri]
            // WAMP SPEC: [ERROR, CALL, CALL.Request|id, Details|dict, Error|uri, Arguments|list]
            // WAMP SPEC: [ERROR, CALL, CALL.Request|id, Details|dict, Error|uri, Arguments|list, ArgumentsKw|dict]
            callback = wampClientCore.getCallCallback(data[2]);
            if (callback != null) {
              callback(data);
            } else {
              mylog("[wamp perser] Callback does not exist.");
            }
            break;
          case WAMP_MSG_TYPE.REGISTER:
            // WAMP SPEC: [ERROR, REGISTER, REGISTER.Request|id, Details|dict, Error|uri]
            callback = wampClientCore.getRegisterCallback(data[2]);
            if (callback != null) {
              callback(data);
            } else {
              mylog("[wamp perser] Callback does not exist.");
            }
            break;
          case WAMP_MSG_TYPE.UNREGISTER:
            // WAMP SPEC: [ERROR, UNREGISTER, UNREGISTER.Request|id, Details|dict, Error|uri]
            callback = wampClientCore.getUnregisterCallback(data[2]);
            if (callback != null) {
              callback(data);
            } else {
              mylog("[wamp perser] Callback does not exist.");
            }
            break;
          default:
            return null;
        }
        break;
      case WAMP_MSG_TYPE.PUBLISHED:
        // WAMP SPEC: [PUBLISHED, PUBLISH.Request|id, Publication|id]
        callback = wampClientCore.getPublishCallback(data[1]);
        if (callback != null) {
          callback(data);
        } else {
          mylog("[wamp perser] Callback does not exist.");
        }
        break;
      case WAMP_MSG_TYPE.SUBSCRIBED:
        // WAMP SPEC: [SUBSCRIBED, SUBSCRIBE.Request|id, Subscription|id]
        callback = wampClientCore.getSubscribeCallback(data[1]);
        wampClientCore.setEventCallback(wampClientCore.getEventCallback(data[1]), data[2]);
        //wampClientCore.deleteEventCallback(data[1]);
        if (callback != null) {
          callback(data);
        } else {
          mylog("[wamp perser] Callback does not exist.");
        }
        break;
      case WAMP_MSG_TYPE.UNSUBSCRIBED:
        // WAMP SPEC: [UNSUBSCRIBED, UNSUBSCRIBE.Request|id]
        callback = wampClientCore.getUnsubscribeCallback(data[1]);
        wampClientCore.deleteEventCallback(this.subscription_id_list[data[1]]);
        if (callback != null) {
          callback(data);
        } else {
          mylog("[wamp perser] Callback does not exist.");
        }
        break;
      case WAMP_MSG_TYPE.EVENT:
        // WAMP SPEC: [EVENT, SUBSCRIBED.Subscription|id, PUBLISHED.Publication|id, Details|dict]
        // WAMP SPEC: [EVENT, SUBSCRIBED.Subscription|id, PUBLISHED.Publication|id, Details|dict, PUBLISH.Arguments|list]
        // WAMP SPEC: [EVENT, SUBSCRIBED.Subscription|id, PUBLISHED.Publication|id, Details|dict, PUBLISH.Arguments|list, PUBLISH.ArgumentKw|dict]
        callback = wampClientCore.getEventCallback(data[1]);
        if (callback != null) {
          callback(data);
        } else {
          mylog("[wamp perser] Callback does not exist.");
        }
        break;
      case WAMP_MSG_TYPE.RESULT:
        // WAMP SPEC: [RESULT, CALL.Request|id, Details|dict]
        // WAMP SPEC: [RESULT, CALL.Request|id, Details|dict, YIELD.Arguments|list]
        // WAMP SPEC: [RESULT, CALL.Request|id, Details|dict, YIELD.Arguments|list, YIELD.ArgumentsKw|dict]
        callback = wampClientCore.getCallCallback(data[1]);
        if (callback != null) {
          callback(data);
        } else {
          mylog("[wamp perser] Callback does not exist.");
        }
        break;
      case WAMP_MSG_TYPE.REGISTERED:
        // WAMP SPEC: [REGISTERED, REGISTER.Request|id, Registration|id]
        callback = wampClientCore.getRegisterCallback(data[1]);
        if (callback != null) {
          callback(data);
        } else {
          mylog("[wamp perser] Callback does not exist.");
        }
        break;
      case WAMP_MSG_TYPE.UNREGISTERED:
        // WAMP SPEC: [UNREGISTERED, UNREGISTER.Request|id]
        callback = wampClientCore.getUnregisterCallback(data[1]);
        if (callback != null) {
          callback(data);
        } else {
          mylog("[wamp perser] Callback does not exist.");
        }
        break;
      case WAMP_MSG_TYPE.INVOCATION:
        // WAMP SPEC: [INVOCATION, Request|id, REGISTERED.Registration|id, Details|dict]
        // WAMP SPEC: [INVOCATION, Request|id, REGISTERED.Registration|id, Details|dict, CALL.Arguments|list]
        // WAMP SPEC: [INVOCATION, Request|id, REGISTERED.Registration|id, Details|dict, CALL.Arguments|list, CALL.ArgumentsKw|dict]
        callback = wampClientCore.getInvocationCallback(data[1]);
        if (callback != null) {
          callback(data);
        } else {
          mylog("[wamp perser] Callback does not exist.");
        }
        break;
      case WAMP_MSG_TYPE.INTERRUPT:
        // advanced WAMP SPEC: [INTERRUPT, INVOCATION.Request|id, Options|dict]
        callback = wampClientCore.getInterruptCallback(data[1]);
        if (callback != null) {
          callback(data);
        } else {
          mylog("[wamp perser] Callback does not exist.");
        }
        break;
      default:
        return null;
    }

    return data;
  };


  this.addOpenCallback = function(callback) {

    //set callback
    wampClientCore.setOpenCallback(callback);

    return;
  };

  this.setErrorCallback = function(callback) {
    self.errorCallback = callback;
    return;
  };

  this.deleteOpenCallback = function() {

    //set callback
    wampClientCore.deleteOpenCallback();

    return;
  };

  this.addCloseCallback = function(callback) {

    //set callback
    wampClientCore.setcloseCallback(callback);

    return;
  };

  this.deleteCloseCallback = function() {

    //set callback
    wampClientCore.deleteCloseCallback();

    return;
  };


  this.sendHello = function(realm, details, callback) {

    var _this = this;

    //serialize
    var data;
    data = wampSerializer.createHello(realm, details);

    //encrypt data

    //set callback
    wampClientCore.setHelloCallback(function() {
      _this.on_hello_welcomed = true;
      callback.apply(this, arguments);
    });

    //send data
    self.WampClientTransport.send(data);

  };

  this.sendAuthenticate = function(signature, extra, callback) {

    //serialize
    var data;
    data = wampSerializer.createAuthenticate(signature, extra);

    //encrypt data

    //set callback
    wampClientCore.setAuthenticateCallback(callback);

    //send data
    self.WampClientTransport.send(data);

  };

  this.sendGoodbye = function(details, reason, callback) {

    //serialize
    var data;
    data = wampSerializer.createGoodbye(details, reason);

    //encrypt data

    //set callback
    wampClientCore.setGoodbyeCallback(callback);

    //send data
    self.WampClientTransport.send(data);
  };

  this.sendHeartbeat = function(incomingSeq, outgoingSeq, discard) {

    //serialize
    var data;
    data = wampSerializer.createHeartbeat(incomingSeq, outgoingSeq, discard);

    //encrypt data

    //send data
    self.WampClientTransport.send(data);
  };

  this.sendError = function(type, request, details, error, arguments, argumentsKw) {

    //serialize
    var data;
    data = wampSerializer.createError(type, request, details, error, arguments, argumentsKw);

    //encrypt data

    //send data
    self.WampClientTransport.send(data);
  };

  this.sendPublish = function(options, topic, arguments, argumentsKw, callback) {

    //serialize
    var data;
    var request;
    request = this.request_id;
    this.request_id++;
    data = wampSerializer.createPublish(request, options, topic, arguments, argumentsKw);

    //encrypt data

    //set callback
    wampClientCore.setPublishCallback(callback, request);

    //send data
    self.WampClientTransport.send(data);
  };

  this.sendSubscribe = function(options, topic, eventfunc, callback) {

    //serialize
    var data;
    var request;
    request = this.request_id;
    this.request_id++;
    data = wampSerializer.createSubscribe(request, options, topic);

    //encrypt data

    //set callback
    wampClientCore.setSubscribeCallback(callback, request);

    //set event callback
    wampClientCore.setEventCallback(eventfunc, request);

    //send data
    self.WampClientTransport.send(data);
  };

  this.sendUnsubscribe = function(subscription, callback) {

    //serialize
    var data;
    var request;
    request = this.request_id;
    this.request_id++;
    data = wampSerializer.createUnsubscribe(request, subscription);

    //encrypt data

    //set callback
    wampClientCore.setUnsubscribeCallback(callback, request);

    //set Unsubscribe request id - subscription id
    this.subscription_id_list[request] = subscription;

    //send data
    self.WampClientTransport.send(data);

  };

  this.sendCall = function(options, procedure, arguments, argumentsKw, callback) {

    //serialize
    var data;
    var request;
    request = this.request_id;
    this.request_id++;
    data = wampSerializer.createCall(request, options, procedure, arguments, argumentsKw);

    //encrypt data

    //set callback
    wampClientCore.setCallCallback(callback, request);

    //send data
    self.WampClientTransport.send(data);
  };

  this.sendCancel = function(request, options, callback) {

    //serialize
    var data;
    data = wampSerializer.createCancel(request, options);

    //encrypt data

    //set callback
    wampClientCore.setCancelCallback(callback);

    //send data
    self.WampClientTransport.send(data);
  };

  this.sendRegister = function(options, procedure, callback) {

    //serialize
    var data;
    var request;
    request = this.request_id;
    this.request_id++;
    data = wampSerializer.createRegister(request, options, procedure);

    //encrypt data

    //set callback
    wampClientCore.setRegisterCallback(callback, request);

    //send data
    self.WampClientTransport.send(data);
  };

  this.sendUnregister = function(registration, callback) {

    //serialize
    var data;
    var request;
    request = this.request_id;
    this.request_id++;
    data = wampSerializer.createUnregister(request, registration);

    //encrypt data

    //set callback
    wampClientCore.setUnregisterCallback(callback, request);

    //send data
    self.WampClientTransport.send(data);
  };

  this.sendYield = function(request, options, arguments, argumentsKw) {

    //serialize
    var data;
    data = wampSerializer.createYield(request, options, arguments, argumentsKw);

    //encrypt data

    //send data
    self.WampClientTransport.send(data);
  };


  this.addGoodbyeCallback = function(callback) {

    //set callback
    wampClientCore.setGoodbyeCallback(callback);

    return;
  };

  this.deleteGoodbyeCallback = function() {

    //delete callback
    wampClientCore.deleteGoodbyeCallback();

    return;
  };

  this.addHeartbeatCallback = function(callback) {

    //set callback
    wampClientCore.setHeartbeatCallback(callback);

    return;
  };

  this.deleteHeartbeatCallback = function() {

    //delete callback
    wampClientCore.deleteHeartbeatCallback();

    return;
  };

  this.addInvocationCallback = function(request, callback) {

    //set callback
    wampClientCore.setInvocationCallback(callback, request);

    return;
  };

  this.deleteInvocationCallback = function() {

    //delete callback
    wampClientCore.deleteInvocationCallback();

    return;
  };

  var devlist_cache;

  this.connect = function(scope, manifest, connected_callback, disconnected_callback) {

    self.connected_callback = connected_callback;
    self.disconnected_callback = disconnected_callback;

    // Local (direct) connection mode
    self.addOpenCallback(function() {
      self.sendHello("v1", {
      //self.sendHello("default", {
        "roles": {
          "caller": {},
          "subscriber": {}
        },
        "manifest": manifest
      }, function() {
        // request device list
        self.sendCall({}, "com.sonycsl.kadecot.provider.procedure.getDeviceList", [], {}, function(ret) {
          connected_callback(ret[4].deviceList, self);
        });
      });
    });
    self.setErrorCallback(function(msg) {
      if (disconnected_callback !== undefined) {
        disconnected_callback();
      }
    });
    if (scope === undefined) {
      scope = "com.sonycsl.kadecot";
      console.log("[WAMP Client] WARNING:The access scope is automatically set to " + scope);
    }
    self.scope = scope;
    console.log("[WAMP Client] connecting to control panel");

    //this.savedTokenTrial = true ;
    self.WampClientTransport.open({
      scope: scope,
      onopen: function() {
        onOpen.call(self);
      },
      onclose: function(event) {
        onClose.call(self, event);
      },
      onmessage: function(event) {
        onReceiveMessage.call(self, event);
      },
      onerror: function(error) {
        onError.call(self, error);
      }
    });
  };


  this.disconnect = function() {
    mylog("[WAMP Client] control panel disconnecting");
    self.WampClientTransport.close();

    return this;
  };


  // Please let this dynamically load from devices db
  function getRPCPrefix(protocol, deviceType) {
    return 'com.sonycsl.kadecot.' + protocol + '.procedure.' + deviceType + '.';
  }


  this.callJSONStyle = function(jsonurl, successcallback, errorcallback) {
    var wamp = this;
    if (typeof errorcallback != 'function') {
      errorcallback = function(msg) {
        console.log(msg);
      };
    }
    var srcstr = decodeURIComponent(jsonurl);

    function getUntilSep(sepstr) {
      var retstr;
      var sep_i = srcstr.indexOf(sepstr);
      if (sep_i >= 0) {
        retstr = srcstr.substring(0, sep_i);
        srcstr = srcstr.substring(sep_i + sepstr.length);
      } else {
        errorcallback('Illegal JSONP url:' + jsonurl);
      }
      return retstr;
    }
    var payload = getUntilSep('jsonp/v1/devices/');
    if (payload == undefined) return;

    var devid = getUntilSep('?');
    if (devid == undefined) return;
    devid = parseInt(devid);

    if (devlist_cache != undefined) {
      var devobj;
      devlist_cache.forEach(function(dev) {
        if (dev.deviceId == devid) devobj = dev;
      });
      if (devobj == undefined) {
        errorcallback('No device found for id ' + devid);
        return;
      } else {
        var urlVars = {};
        var urlterms = srcstr.split('&');
        urlterms.forEach(function(term) {
          var eq = term.split('=');
          if (eq.length != 2) return;
          urlVars[eq[0]] = eq[1];
        });

        if (urlVars.procedure == undefined) {
          errorcallback('No procedure found in jsonp url:' + jsonurl);
          return;
        }
        urlVars.params = (urlVars.params == undefined ? {} : JSON.parse(urlVars.params));

        // call body
        wamp.sendCall({
          "deviceId": devid
        }, getRPCPrefix(devobj.protocol, devobj.deviceType) + urlVars.procedure, [], urlVars.params, successcallback);
      }
    } else {
      errorcallback('No device list is cached.');
      return;
    }
  }

};
