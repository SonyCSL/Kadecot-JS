'use strict';

// Load libraries
const autobahn = require('autobahn');
const isError = require('lodash.iserror');

class PluginInterface {
  constructor ( pluginPrefix ) {
    this.pluginPrefix = pluginPrefix;
    this.log = (msg) => {
      console.log(`${this.pluginPrefix}: ${msg}`);
    };
    this.devices = {};

    this.sessions = [] ;
    this.registeredProcs = [] ;
  }

  onSessionOpened ( session ){
	this.sessions.push(session) ;
	session.call('admin.registerplugin', [session.id, this.pluginPrefix]);

	// register already found devices
	for( var uuid in this.devices ){
		session.call('admin.registerdevice', [this.pluginPrefix], this.devices[uuid]) ;
	}

	// register already added procedures

	const procedures = this.registeredProcs.map((procInfo) => {
          return session.register(
            `${this.pluginPrefix}.procedure.${procInfo.name}`,
            (deviceIdArray, argObj, details) => {
              // Support to return either real value or promise
              return Promise.resolve(procInfo.procedure(deviceIdArray, argObj))
                .then((res) => {
                  res.success = true;
                  const resultInstance =
                    new autobahn.Result([ deviceIdArray[0] ], res);
                  return Promise.resolve(resultInstance);
                })
                .catch((err) => {
                  if (isError(err) || typeof err !== 'object') {
                    err = { error: err };
                  }
                  err.success = false;
                  const resultInstance =
                    new autobahn.Result([ deviceIdArray[0] ], err);
                  return Promise.resolve(resultInstance);
                });
            }
          );
        });

        return Promise.all(procedures);
  }

  onSessionClosed ( session ){
	this.sessions = this.sessions.filter( s => {
		return s != session ;
	}) ;
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
    return new Promise( (acpt,rjct) => {
	const deviceInfo = {
	      uuid: uuid,
	      protocol: this.pluginPrefix.split('.').reverse()[0],
	      deviceType: deviceType,
	      description: description,
	      nickname: nickname,
	      deviceIdMap: {}
	};
	this.devices[uuid] = deviceInfo;

	var ps = [] ;
	this.sessions.forEach(session => {
		ps.push(
			session.call('admin.registerdevice', [this.pluginPrefix], deviceInfo)
		) ;
	}) ;

	Promise.all(ps).then(re=>{
		for( var si=0;si<this.sessions.length;++si ){
			this.devices[uuid].deviceIdMap[this.sessions[si].id] = re[si] ;
		}
		acpt( this.devices[uuid].deviceIdMap ) ;
	}) ;
    }) ;
  }

  /**
   * Unregister Device
   * @param  {String} uuid [description]
   * @return {Promise<autobahn.Result,autobahn.Error>}      [description]
   */
  unregisterDevice (uuid) {
    return new Promise( (acpt,rjct) => {
	var ps = [] ;
	this.sessions.forEach(session => {
		ps.push( session.call('admin.unregisterdevice', [uuid]) ) ;
	}) ;
	Promise.all(ps).then(() => {
		this.devices[uuid] = undefined;
		acpt(uuid) ;
	}) ;
    } ) ;
  }

  /**
   * registerProcedures
   * proclist is an array of the procedure definition object:
   * Example of such object:
   * {
   *   // the real name is connected to plugin prefix+'.procedure.'
   *   name:'GeneralLighting.set',
   *   procedure: function (deviceIdArray, argObj) {
   *     // deviceIdArray is an array of devices. argObj is the parameter given by the procedure caller.
   *     return {};
   *   }
   * }
   *
   * @param  {Object[]} procList [description]
   * @return {Promise<autobahn.Registration[],autobahn.Error>} [description]
   */
  registerProcedures (procList) {
    Array.prototype.push.apply(this.registeredProcs, procList);

    var procedures = [] ;

    procList.forEach( procInfo => {
	this.sessions.forEach(session => {
	  this.log('Register '+`${this.pluginPrefix}.procedure.${procInfo.name}`) ;

	  procedures.push(
            session.register(
	        `${this.pluginPrefix}.procedure.${procInfo.name}`,
	        (deviceIdArray, argObj, details) => {
	          // Support to return either real value or promise

	          return Promise.resolve(procInfo.procedure(deviceIdArray, argObj))
	            .then((res) => {
	              res.success = true;
	              const resultInstance =
	                new autobahn.Result([ deviceIdArray[0] ], res);
	              return Promise.resolve(resultInstance);
	            })
	            .catch((err) => {
	              if (isError(err) || typeof err !== 'object') {
	                err = { error: err };
	              }
	              err.success = false;
	              const resultInstance =
	                new autobahn.Result([ deviceIdArray[0] ], err);
	              return Promise.resolve(resultInstance);
	            });
	        }
	    )
	  ) ;
        }) ;
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
	if ( !(argsArray instanceof Array)) return;
	this.sessions.forEach(session => {
		session.publish(`${this.pluginPrefix}.topic.${topic}`, argsArray, argsObject);
	}) ;
  }
}

module.exports = PluginInterface;
