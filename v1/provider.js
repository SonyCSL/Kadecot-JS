var PREFIX = 'com.sonycsl.kadecot.provider';

//////////////////////////////////////
// Setup & utilities
var REALM, ROUTER_URL;

function log(msg) {
  console.log(REALM + ':main: ' + msg);
}
//////////////////////////////////////
// Load libraries
var autobahn, when;
try {
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
      require('./plugins/' + dirname + '/index.js').init(pluginInterface);
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
        return {
          deviceList: dl
        };
      }), session.register(PREFIX + '.procedure.registerplugin', function(args, kwargs, details) {
        log("Plugin registration requested:" + JSON.stringify(args));
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
        console.log('RegisterDevice:' + JSON.stringify(arguments));
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
        devices[key] = d;
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

  var fs = require('fs');

  cloud = require('./cloud.js');

  var REGISTERED_INFO_CACHE_FILE = './' + REALM + '/registered.txt';
  fs.stat(REGISTERED_INFO_CACHE_FILE, function(err, stat) {
    if (err != null) return;
    var cache = fs.readFileSync(REGISTERED_INFO_CACHE_FILE).toString().split("\n");
    cloud.connect(cache[0], cache[1]);
  });

  htserv = require('./htserv.js').start(31413, {
    registered: function(re) {
      log('Terminal token:' + re.terminal_token);
      log('Bridge server :' + re.bridge_server);

      fs.writeFile(REGISTERED_INFO_CACHE_FILE, re.terminal_token + "\n" + re.bridge_server);
      cloud.connect(re.terminal_token, re.bridge_server);
    }
  });
};
