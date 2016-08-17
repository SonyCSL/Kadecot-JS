'use strict';
//////////////////////////////////////
// Load libraries
const autobahn = require('autobahn');
const when = require('when');

class PluginInterface {
  constructor (realm, router_url, plugin_prefix) {
    this.realm = realm;
    this.router_url = router_url;
    this.plugin_prefix = plugin_prefix;
    this.log = function(msg) {
      console.log(this.plugin_prefix + ':' + msg);
    };
    this.devices = {};
  }

  connectRouter (callbacks) {
    this.connection = new autobahn.Connection({
      realm: this.realm,
      url: this.router_url
    });

    this.connection.onclose = () => {
      if (typeof callbacks.onclose == 'function') {
        callbacks.onclose.call(this);
      }
      this.session = undefined;
    };
    this.connection.onopen = (session) => {
      this.session = session;
      this.log('connection to ' + this.router_url + ' success.');
      this.session.call('com.sonycsl.kadecot.provider.procedure.registerplugin', [this.session.id, this.plugin_prefix]);

      if (typeof callbacks.onopen == 'function') {
        callbacks.onopen.call(this);
      }
    };
    this.connection.open();

    this.log('Plugin loaded.');
  }

  // Should be changed to return promise, rather than calling onreegisteredfunc callback..
  registerDevice (uuid, deviceType, description, nickname) {
    if (!this.session) {
      return Promise.reject(new Error('No session'));
    }
    const deviceInfo = {
      uuid: uuid,
      protocol: this.plugin_prefix.substring(this.plugin_prefix.lastIndexOf('.') + 1),
      deviceType: deviceType,
      description: description,
      nickname: nickname
    };
    this.devices[uuid] = deviceInfo;

    const promise =
      this.session.call('com.sonycsl.kadecot.provider.procedure.registerdevice', [this.plugin_prefix], deviceInfo)
        .then((re) => {
          if (re.success) {
            this.devices[uuid].deviceId = re.deviceId;
          }
          return re;
        });
    return promise;
  }

  unregisterDevice (uuid) {
    if (!this.session) {
      return Promise.reject(new Error('No session'));
    }
    const promise =
      this.session.call('com.sonycsl.kadecot.provider.procedure.unregisterdevice', [uuid])
      .then((re) => {
        delete this.devices[uuid];
        this.devices[uuid] = undefined;
        return re;
      });
    return promise;
  }

  // registerProcedures
  // proclist is an array of the procedure definition object:
  // Example of such object:
  //{
  //	name:'GeneralLighting.set' //=> the real name is connected to plugin prefix+'.procedure.'
  //	,procedure:function(deviceIdArray, argObj){
  //		// deviceIdArray is an array of devices. argObj is the parameter given by the procedure caller.
  //		return {} ;
  //	}
  //}

  registerProcedures (proclist) {
    const procedures = [];
    proclist.forEach((proc_info) => {
      procedures.push(this.session.register(this.plugin_prefix + '.procedure.' + proc_info.name, (deviceIdArray, argObj) => {
        return {
          success: true,
          procedure: arguments[2].procedure,
          value: proc_info.procedure.call(this, deviceIdArray, argObj)
        };
      }));
    });
    return when.all(procedures);
  }

  publish (topic, arg_array) {
    if (this.session == undefined || !(arg_array instanceof Array)) return;
    this.session.publish(this.plugin_prefix + '.procedure.' + topic, arg_array);
  }
}

module.exports = PluginInterface;
