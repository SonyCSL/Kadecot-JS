//////////////////////////////////////
// Setup & utilities
var REALM ;
const LOCAL_ROUTER_URL = 'ws://localhost:41314/ws' ;
const SUPERUSER_PASS = process.env.ROOTPASS ;

function log(msg) {
  console.log(REALM + ':main: ' + msg);
}
//////////////////////////////////////
// Load libraries
var fs, autobahn;
try {
  fs = require('fs');
  autobahn = require('autobahn');
} catch (e) { // When running in browser, AutobahnJS will be included without a module system
}
var PluginInterface = require('./plugin-interface.js');

//////////////////////////////////////
// Just start plugins

var htserv, cloud;

var plugins = {};


exports.init = function(_REALM){

 function connect_plugins(ROUTER_URL , username , secret ) {

  var PLUGINS_FOLDER = './' + REALM + '/plugins/';

  try {
	fs.statSync( PLUGINS_FOLDER ) ;
  } catch(e){
	log('No plugins exists. (possibly in bridge mode)') ;
	return false ;
  }

  fs.readdir(PLUGINS_FOLDER, (err, files) => {
    if (err) throw err;

    var pluginPromiseArray = [] ;

    files.filter(dirname => {
      return fs.lstatSync(PLUGINS_FOLDER + dirname).isDirectory();
    }).forEach(dirname => {
	pluginPromiseArray.push(new Promise((acpt,rjct)=>{
		var session ;
		var conn_plugin = new autobahn.Connection({
		   url: ROUTER_URL
		   ,realm: REALM
		   ,authmethods: ["wampcra"]
		   ,authid: username
		   ,onchallenge: (session, method, extra) => {
			   if (method === "wampcra") {
			      //log("authenticating via '" + method + "' and challenge '" + extra.challenge + "'");
			      //log('Connecting the plugin '+dirname+' to realm "'+REALM+'"') ;
			      return autobahn.auth_cra.sign(secret, extra.challenge);
			   } else {
			      throw "don't know how to authenticate using '" + method + "'";
			   }
		   }

		});
		conn_plugin.onopen = (_session, details) => {
			session = _session ;
			var pi = plugins[dirname] ;
			if( pi == undefined ){
				pi = new PluginInterface(dirname) ; // dirname as PLUGIN_PREFIX 
				plugins[dirname] = pi ;
				pi.onSessionOpened(session) ;

				require('./plugins/' + dirname + '/index.js').init.call(pi) ;
			} else
				pi.onSessionOpened(session) ;

			acpt() ;
		};
		conn_plugin.onclose = (reason, details) => {
			if( details.reason == 'wamp.error.not_authorized' )
				rjct('Login failed.') ;
			else {
				console.log("disconnected", reason, details.reason, details);
				plugins[dirname].onSessionClosed(session) ;
			}
		} ;

		conn_plugin.open();

	})) ;
    });
    Promise.all(pluginPromiseArray).then(()=>{log('All plugins loaded');}).catch(console.error) ;
  });

  return true ;
 }



  function connect_each_controler_to_realm( realm ){
    return new Promise( (acpt,rjct) => {
	var conn_ctrl = new autobahn.Connection({
	    url: LOCAL_ROUTER_URL,
	    realm: realm,
	    authmethods: ["ticket"],
	    authid: "superuser",
	    onchallenge: (session, method, extra) => {
	      if (method === "ticket") {
	        return SUPERUSER_PASS ;
	      } else {
	        throw new Error('Failed to authenticate');
	      }
	    }
	});
	conn_ctrl.onopen = function (session, details) {
		log('The controller is connected to '+realm) ;

		// Define plugin specific variables/functions

		var plugins = {}; // prefix -> plugin object including session_id
		var plugin_session_id_to_prefix = {};

		function register_plugin(session_id, prefix) {
		  plugins[prefix] = {
		    session_id: session_id
		  };
		  plugin_session_id_to_prefix[session_id] = prefix;
		  log('Plugin ' + prefix + ' registered for realm '+realm);
		}

		function unregister_plugin(session_id) {
		  var prefix = plugin_session_id_to_prefix[session_id];
		  if (prefix === undefined) {
		    return;
		  } // the session is not plugin.

		  delete plugins[prefix];
		  delete plugin_session_id_to_prefix[session_id];
		  plugins[prefix] = plugin_session_id_to_prefix[session_id] = undefined;
		  log('Plugin ' + prefix + ' unregistered from realm '+realm);
		}

		var devices = {};
		var deviceid_count = 1;

		// Register admin (+alpha) procedures
		var dl = [
		      session.register('com.sonycsl.kadecot.provider.procedure.getDeviceList', function(args, kwargs, details) {
		        var devl = [];
		        for (uuid in devices){
				var dv = JSON.parse(JSON.stringify(devices[uuid])) ;
				dv.deviceId = dv.deviceIdMap[session.id] ;
				dv.deviceIdMap = undefined ;
				devl.push(dv);
			}
		        return new autobahn.Result([], {
		          deviceList: devl
		        });
		      }), session.register('admin.registerplugin', function(args, kwargs, details) {
		        //log("Plugin registration requested:" + JSON.stringify(args));
		        var session_id = args[0],
		          prefix = args[1];
		        if (plugins[prefix] != undefined) {
		          log('Duplicate plugin registration request for ' + prefix);
		          session.call("wamp.session.kill", [session_id], {
		            reason: "A plugin with same prefix already registered.",
		            message: "A plugin with same prefix already registered."
		          }); //.then(session.log, session.log)
		          return;
		        }
		        register_plugin(session_id, prefix);
		      })
		      //, session.subscribe('wamp.session.on_join', function(args){
		      //	log("Published (wamp.session.on_join) :", JSON.stringify(args));
		      //	session.call("wamp.session.get", [args[0].session]).then(console.log, console.log)
		      //})
		      , session.subscribe('wamp.session.on_leave', function(args) {
		        unregister_plugin(args[0]);
		      }), session.register('admin.registerdevice', function(args, kwargs, details) {
		        var plugin_prefix = args[0];
		        var d = kwargs; //JSON.parse(JSON.stringify(args[0])) ;
		        var key = plugin_prefix + "." + d.uuid;
		        if (devices[key] != undefined) {
			  if( devices[key].deviceIdMap[ session.id ] == undefined )
			    devices[key].deviceIdMap[ session.id ] = deviceid_count++ ;
			  return devices[key].deviceIdMap[ session.id ] ;
		        }

			var newDevId = deviceid_count++;
		        d.status = true;
		        d.prefix = plugin_prefix;
			d.deviceIdMap[ session.id ] = newDevId ;
		        devices[key] = d;

		        log('Device '+newDevId+':'+kwargs.protocol+':'+kwargs.deviceType+'/'+kwargs.uuid+' registered for realm '+realm);

		        return newDevId ;
		      }), session.register('admin.unregisterdevice', function(args, kwargs, details) {
		        var uuid = args[0];
		        var key = plugin_prefix + "." + uuid;
		        if (devices[key] != undefined) {
		          devices[key].status = false;
		        }
		        return {
		          success: true
		        };
		      })
		];

		Promise.all(dl).then(acpt).catch(rjct) ;

	};
	conn_ctrl.onclose = function (reason, details) {
		if( details.reason == 'wamp.error.not_authorized' )
			rjct('Login failed.') ;
		else
			console.log("disconnected", reason, details.reason, details);
	}

	conn_ctrl.open();
    } ) ;
  }


  function start_web_jsonp_server(){

	htserv = require('./htserv.js')({
	    routerURL: LOCAL_ROUTER_URL,
	    realm: REALM,
	    username: default_user_name,
	    secret: default_user_secret,
	    callbacks: {
	      // called when /api?func=CALLBACK_NAME&KEY1=VALUE1&KEY2=VALUE2..  is accessed.
	      CALLBACK_NAME: function (re) {
		log('API access to func=testapi. Params='+JSON.stringify(re)) ;
	      }
	    }
	}).start(31413);
  }


  var default_user_name , default_user_secret ;
  {
	// Find the default user (assigned realm is 'v1.0')
	var USERDB = fs.readFileSync( 'users.json' , 'utf-8' ) ;
	USERDB = JSON.parse(USERDB) ;

	for( var u in USERDB ){
		if( USERDB[u].realm == 'v1.0' ){
			default_user_name = u ;
			default_user_secret = USERDB[u].secret ;
			break ;
		}
	}
	if( default_user_name == undefined ){
		log( 'The default user (whose realm is "v1.0") was not found.' ) ;
	}
  }



  return new Promise( (acpt,rjct) => {
	REALM = _REALM ;

	//////////////////////////////////////
	// Connect superuser to Wamp router
	var connection = new autobahn.Connection({
	    url: LOCAL_ROUTER_URL,
	    realm: REALM,
	    authmethods: ["ticket"],
	    authid: "superuser",
	    onchallenge: (session, method, extra) => {
	      if (method === "ticket") {
	        return SUPERUSER_PASS ;
	      } else {
	        throw new Error('Failed to authenticate');
	      }
	    }
	});

	connection.onopen = function(session) {
	    session.register('admin.authenticate', (args, kwargs, details) => {
		//log('Authenticate input:'+JSON.stringify(args)) ;

		// load each time
		var USERDB = fs.readFileSync( 'users.json' , 'utf-8' ) ;
		USERDB = JSON.parse(USERDB) ;

		var realm = args[0];
		var authid = args[1];
		var details = args[2];
		if (USERDB[authid] !== undefined) {
		   return USERDB[authid];
		} else {
		   throw "no such user";
		}
	      }).then(
	      () => {	// Registration success
	        log("Authenticator was successfully registered");

		// load each time
		var USERDB = fs.readFileSync( 'users.json' , 'utf-8' ) ;
		USERDB = JSON.parse(USERDB) ;

		var ctrl_conn_promises = [] ;
		for( var usr in USERDB ){
			(()=>{
				var rlm = USERDB[usr].realm ;
				ctrl_conn_promises.push(new Promise( (ac,rj) => {
					connect_each_controler_to_realm( rlm ).then(ac).catch(rj) ;
				})) ;
			})() ;
		}

		Promise.all(ctrl_conn_promises).then(() => {
			acpt();


			////////////////////////////////////////////////
			////////////////////////////////////////////////
			/// Can now login.
			////////////////////////////////////////////////

			// local connection
			if( connect_plugins( LOCAL_ROUTER_URL , default_user_name , default_user_secret ) )
				start_web_jsonp_server();	// Plugin exists.
			else
				log('JSONP server is not started because no plugins are available for access.') ;

		}).catch(rjct) ;

	      }).catch(() => {   // Registration failed
	        console.log("Registration failed", arguments);
		rjct('admin.authenticate cannot be registered') ;
	      });
	} ;

	connection.open();

  } ) ;
};
