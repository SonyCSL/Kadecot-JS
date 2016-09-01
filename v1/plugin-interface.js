'use strict';

// Load libraries
const autobahn = require('autobahn');

class PluginInterface {
  /**
   * Constructor
   * @param  {String} realm         [description]
   * @param  {String} routerURL     [description]
   * @param  {String} pluginPrefix  [description]
   */
  constructor (realm, routerURL, pluginPrefix) {
    this.realm = realm;
    this.routerURL = routerURL;
    this.pluginPrefix = pluginPrefix;
    this.log = function (msg) {
      console.log(`${this.pluginPrefix}: ${msg}`);
    };
    this.devices = {};
  }

  /**
   * Connect to router.
   * @param  {Object}   callbacks         [description]
   * @param  {Function} callbacks.onopen  [description]
   * @param  {Function} callbacks.onclose [description]
   */
  connectRouter (callbacks) {
    this.connection = new autobahn.Connection({
      realm: this.realm,
      url: this.routerURL
    });

    this.connection.onclose = () => {
      if (typeof callbacks.onclose === 'function') {
        callbacks.onclose.call(this);
      }
      this.session = undefined;
    };

    this.connection.onopen = (session) => {
      this.session = session;
      this.log(`Connection to ${this.routerURL} success.`);
      this.session.call('com.sonycsl.kadecot.provider.procedure.registerplugin', [this.session.id, this.pluginPrefix]);

      if (typeof callbacks.onopen === 'function') {
        callbacks.onopen.call(this);
      }
    };
    this.connection.open();

    this.log('Plugin loaded.');
  }

  /**
   * Register device
   * @param  {String} uuid        [description]
   * @param  {String} deviceType  [description]
   * @param  {String} description [description]
   * @param  {String} nickname    [description]
   * @return {Promise<autobahn.Result,autobahn.Error>}   [description]
   */
  registerDevice (uuid, deviceType, description, nickname) {
    if (!this.session) {
      return Promise.reject(new Error('No session'));
    }
    const deviceInfo = {
      uuid: uuid,
      protocol: this.pluginPrefix.split('.').reverse()[0],
      deviceType: deviceType,
      description: description,
      nickname: nickname
    };
    this.devices[uuid] = deviceInfo;

    const promise =
      this.session.call('com.sonycsl.kadecot.provider.procedure.registerdevice', [this.pluginPrefix], deviceInfo)
        .then((re) => {
          if (re.success) {
            this.devices[uuid].deviceId = re.deviceId;
          }
          return re;
        });
    return promise;
  }

  /**
   * Unregister Device
   * @param  {String} uuid [description]
   * @return {Promise<autobahn.Result,autobahn.Error>}      [description]
   */
  unregisterDevice (uuid) {
    if (!this.session) {
      return Promise.reject(new Error('No session'));
    }
    const promise =
      this.session.call('com.sonycsl.kadecot.provider.procedure.unregisterdevice', [uuid])
        .then((re) => {
          this.devices[uuid] = undefined;
          return re;
        });
    return promise;
  }

  /**
   * registerProcedures
   * proclist is an array of the procedure definition object:
   * Example of such object:
   * {
   *   // the real name is connected to plugin prefix+'.procedure.'
   *	 name:'GeneralLighting.set',
   *   procedure: function (deviceIdArray, argObj) {
   *		 // deviceIdArray is an array of devices. argObj is the parameter given by the procedure caller.
   *		 return {};
   *	 }
   * }
   *
   * @param  {Object[]} procList [description]
   * @return {Promise<autobahn.Registration[],autobahn.Error>} [description]
   */
  registerProcedures (procList) {
    const procedures = procList.map((procInfo) => {
      return this.session.register(`${this.pluginPrefix}.procedure.${procInfo.name}`, (deviceIdArray, argObj, details) => {
        return new Promise((res,rej) => {
		Promise.all([ // Use Promise.all, because procInfo.procedure can return either real value or promise
			procInfo.procedure(deviceIdArray, argObj)
		]).then(function(resArray){
			resArray[0].success = true ;
			res( new autobahn.Result([ deviceIdArray[0] ], resArray[0]) ) ;
			//res( { success: true, procedure: details.procedure, result: resArray[0] } ) ;
		}).catch(function(err){
			err.success = false ;
			rej( new autobahn.Result([ deviceIdArray[0] ], err) ) ;
			//rej( { success: false, procedure: details.procedure, reason: err } ) ;
		}) ;
	}) ;
      });
    });
    return Promise.all(procedures);
  }

  /**
   * [publish description]
   * @param  {String} topic     [description]
   * @param  {Array}  argsArray [description]
   * @param  {Object}  argsObject [description]
   */
  publish (topic, argsArray, argsObject) {
    if (this.session == undefined || !(argsArray instanceof Array)) return;
    this.session.publish(`${this.pluginPrefix}.topic.${topic}`, argsArray, argsObject);
  }
}

module.exports = PluginInterface;
