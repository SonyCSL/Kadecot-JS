var PREFIX = 'com.sonycsl.kadecot.provider';

//////////////////////////////////////
// Setup & utilities
var REALM, ROUTER_URL;

function log(msg) {
  console.log(REALM + ':main: ' + msg);
}
//////////////////////////////////////
// Load libraries
var fs, autobahn, when;
try {
  fs = require('fs');
  autobahn = require('autobahn');
  when = require('when');
} catch (e) { // When running in browser, AutobahnJS will be included without a module system
  var when = autobahn.when;
}
var PluginInterface = require('./plugin-interface.js');

//////////////////////////////////////
// Just start plugins

function init_plugins() {
  log('starting plugins.');
  plugins = [];
  var fs = require('fs');

  var PLUGINS_FOLDER = './' + REALM + '/plugins/';

  fs.readdir(PLUGINS_FOLDER, function(err, files) {
    if (err) throw err;

    files.filter(function(dirname) {
      return fs.lstatSync(PLUGINS_FOLDER + dirname).isDirectory();
    }).forEach(function(dirname) {
      var pluginInterface = new PluginInterface(REALM, ROUTER_URL, dirname /* as PLUGIN_PREFIX */ );
      require('./plugins/' + dirname + '/index.js').init.call(pluginInterface);
    });
  });
}

var plugins = {}; // prefix -> plugin object including session_id
var plugin_session_id_to_prefix = {};

function register_plugin(session_id, prefix) {
  plugins[prefix] = {
    session_id: session_id
  };
  plugin_session_id_to_prefix[session_id] = prefix;
  log('Plugin ' + prefix + ' registered');
}

function unregister_plugin(session_id) {
  var prefix = plugin_session_id_to_prefix[session_id];
  if (prefix === undefined) {
    return;
  } // the session is not plugin.

  delete plugins[prefix];
  delete plugin_session_id_to_prefix[session_id];
  plugins[prefix] = plugin_session_id_to_prefix[session_id] = undefined;
  log('Plugin ' + prefix + ' unregistered');
}

var devices = {};
var deviceid_count = 1;

var htserv, cloud;

exports.init = function(_REALM, _ROUTER_URL) {
  init_authtest(_REALM, _ROUTER_URL) ;
  return ;
  REALM = _REALM;
  ROUTER_URL = _ROUTER_URL;

  //////////////////////////////////////
  // Connect to Wamp router
  var connection = new autobahn.Connection({
    url: ROUTER_URL,
    realm: REALM,
    authmethods: ["ticket"],
    authid: "kadecot-provider",
    onchallenge: (session, method, extra) => {
      if (method === "ticket") {
        return "KADECOT_PROVIDER";
      } else {
        throw new Error('Failed to authenticate');
      }
    }
  });

  connection.onopen = function(session) {
    log('Connection to wamp router open.');

    var dl = [
      session.register(PREFIX + '.procedure.getDeviceList', function(args, kwargs, details) {
        var dl = [];
        for (uuid in devices) dl.push(devices[uuid]);
        return new autobahn.Result([], {
          deviceList: dl
        });
      }), session.register(PREFIX + '.procedure.registerplugin', function(args, kwargs, details) {
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
      }), session.register(PREFIX + '.procedure.registerdevice', function(args, kwargs, details) {
        var plugin_prefix = args[0];
        var d = kwargs; //JSON.parse(JSON.stringify(args[0])) ;
        var key = plugin_prefix + "." + d.uuid;
        if (devices[key] != undefined) {
          return {
            success: true,
            deviceId: devices[key].deviceId
          };
        }
        d.deviceId = deviceid_count++;
        d.status = true;
        d.prefix = plugin_prefix;
        devices[key] = d;

        console.log('Device '+d.deviceId+':'+kwargs.protocol+':'+kwargs.deviceType+'/'+kwargs.uuid+' registered.');

        return {
          success: true,
          deviceId: d.deviceId
        };
      }), session.register(PREFIX + '.procedure.unregisterdevice', function(args, kwargs, details) {
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

    when.all(dl).then(
      function() {
        log("All procedures/topics registered.");

        // init plugins
        init_plugins();
      },
      function() {
        log("Registration/Subscription failed!", arguments);
      }
    );
  };

  connection.open();

  cloud = require('./cloud.js');

  cloud.REGISTERED_INFO_CACHE_FILE = './' + REALM + '/registered.txt';

  fs.stat(cloud.REGISTERED_INFO_CACHE_FILE, function(err, stat) {
    if (err != null) return;
    var cache = fs.readFileSync(cloud.REGISTERED_INFO_CACHE_FILE).toString().split("\n");
    cloud.connect(cache[0], cache[1], ROUTER_URL);
  });

  htserv = require('./htserv.js')({
    routerURL: ROUTER_URL,
    realm: REALM,
    callbacks: {
      registered: function (re) {
        log('Terminal token:' + re.terminal_token);
        log('Bridge server :' + re.bridge_server);

        fs.writeFile(cloud.REGISTERED_INFO_CACHE_FILE, re.terminal_token + "\n" + re.bridge_server);
        cloud.connect(re.terminal_token, re.bridge_server, ROUTER_URL);
      }
    }
  }).start(31413);
};






var USERDB ;

function connect_controler_to_realm( realm , username , secret ){
	var conn_client = new autobahn.Connection({
	   url: ROUTER_URL,
	   realm: realm,
	   authmethods: ["wampcra"],
	   authid: username,
	   onchallenge: (session, method, extra) => {
		   if (method === "wampcra") {
		      //console.log("authenticating via '" + method + "' and challenge '" + extra.challenge + "'");
		      log('Connecting the manager to realm "'+realm+'"') ;
		      return autobahn.auth_cra.sign(secret, extra.challenge);
		   } else {
		      throw "don't know how to authenticate using '" + method + "'";
		   }
	   }

	});
	conn_client.onopen = function (session, details) {
		// console.log('AuthConnClientOpen:'+JSON.stringify(arguments)) ;


		var devices = {hi:{msg:'HIOBJECT'},hi2:{msg:'HIOBJECT2'}}
		session.register(PREFIX + '.procedure.getDeviceList', function(args, kwargs, details) {
		  var dl = [];
		  for (uuid in devices) dl.push(devices[uuid]);
		  return new autobahn.Result([], {
		    deviceList: dl
		  });
		}) ;

	};
	conn_client.onclose = function (reason, details) {
		if( details.reason == 'wamp.error.not_authorized' )
			log('Login failed.') ;
		else
			console.log("disconnected", reason, details.reason, details);
	}

	conn_client.open();
}




function init_authtest(_REALM, _ROUTER_URL){
  REALM = _REALM;
  ROUTER_URL = _ROUTER_URL;

  USERDB = fs.readFileSync( 'users.json' , 'utf-8' ) ;
  USERDB = JSON.parse(USERDB) ;

  //////////////////////////////////////
  // Connect superuser to Wamp router
  var connection = new autobahn.Connection({
    url: 'ws://localhost:41314/ws',
    realm: 'v1',
    authmethods: ["ticket"],
    authid: "superuser",
    onchallenge: (session, method, extra) => {
      if (method === "ticket") {
        return 'root' ;
      } else {
        throw new Error('Failed to authenticate');
      }
    }
  });

  connection.onopen = function(session) {
    log('Connection to wamp router.');

    session.register('admin.authenticate', (args, kwargs, details) => {
	//log('Authenticate input:'+JSON.stringify(args)) ;
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
        log("Registration success");

	for( var usr in USERDB ){
		var u = USERDB[usr] ;
		connect_controler_to_realm( u.realm , usr , u.secret ) ;
	}

      },
      () => {   // Registration failed
        log("Registration failed", arguments);
      }
    );


      var devices = {hi:{msg:'HIOBJECT'},hi2:{msg:'HIOBJECT2'}}
      session.register(PREFIX + '.procedure.getDeviceList', function(args, kwargs, details) {
        var dl = [];
        for (uuid in devices) dl.push(devices[uuid]);
        return new autobahn.Result([], {
          deviceList: dl
        });
      }) ;

  };

  connection.open();
}
