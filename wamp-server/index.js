'use strict';

const co = require('co');
const autobahn = require('autobahn');
const fs = require('fs-promise');
const path = require('path');
const PluginInterface = require('./plugin-interface.js');
const cloud = require('./cloud.js');

// Shims
const entries = require('object.entries');
if (!Object.entries) {
  entries.shim();
}

const log4js = require('log4js');
const logger = log4js.getLogger();

class WampServer {
  constructor (config) {
    this.ROUTER_URL = config.url;
    this.log = config.log || console.log.bind(console) || logger.debug.bind(logger);
  }

  // Static
  static get PREFIX () {
    return 'com.sonycsl.kadecot.provider';
  }

  static get REALM () {
    return 'v1';
  }

  init (fn) {
    this.plugins = {};
    this.pluginSessionIdToPrefix = {};
    this.devices = {};
    this.deviceCount = 1;
    this._createAutobahn();
    this._cloudInit();
  }

  _cloudInit () {
    const REGISTERED_INFO_CACHE_FILE = path.resolve(__dirname, 'registered.txt');
    fs.stat(REGISTERED_INFO_CACHE_FILE)
      .then(() => {
        const cache = fs.readFileSync(REGISTERED_INFO_CACHE_FILE, 'utf8').split('\n');
        cloud.connect(cache[0], cache[1], this.ROUTER_URL);
      });

    require('./htserv').start(31413, {
      registered: (re) => {
        this.log(`Terminal token: ${re.terminal_token}`);
        this.log(`Bridge server : ${re.bridge_server}`);

        fs.writeFileSync(
          REGISTERED_INFO_CACHE_FILE,
          `${re.terminal_token}\n${re.bridge_server}`
        );
        cloud.connect(re.terminal_token, re.bridge_server, this.ROUTER_URL);
      }
    });
  }

  registerPlugin (sessionId, prefix) {
    this.plugins[prefix] = {
      session_id: sessionId
    };
    this.pluginSessionIdToPrefix[sessionId] = prefix;
    this.log(`Plugin ${prefix} registered`);
  }

  unregisterPlugin (sessionId) {
    const prefix = this.pluginSessionIdToPrefix[sessionId];
    if (!prefix) return; // the session is not plugin.

    this.plugins[prefix] = this.pluginSessionIdToPrefix[sessionId] = undefined;
    this.log(`Plugin ${prefix} unregistered`);
  }

  get procedures () {
    // `${WampServer.PREFIX}.procedure.${objectKey}`
    return {
      getDeviceList: (args, kwargs, details) => {
        const deviceList = [];
        for (let uuid in this.devices) {
          deviceList.push(this.devices[ uuid ]);
        }
        return { deviceList: deviceList };
      },
      registerplugin: (args, kwargs, details) => {
        const sessionId = args[0];
        const prefix = args[1];
        if (this.plugins[prefix]) {
          this.log(`Duplicate plugin registration request for ${prefix}`);
          this.session.call('wamp.session.kill', [ sessionId ], {
            reason: 'A plugin with same prefix already registered.',
            message: 'A plugin with same prefix already registered.'
          });
        } else {
          this.registerPlugin(sessionId, prefix);
        }
      },
      registerdevice: (args, kwargs, details) => {
        const pluginPrefix = args[0];
        const device = kwargs;
        const key = `${pluginPrefix}.${device.uuid}`;

        if (!this.devices[key]) {
          device.deviceId = this.deviceCount++;
          device.status = true;
          this.devices[key] = device;

          this.log(`Device ${device.deviceId} : ${kwargs.protocol} : ${kwargs.deviceType} / ${kwargs.uuid} registered.`);
        }

        return {
          success: true,
          deviceId: this.devices[key].deviceId
        };
      },
      unregisterdevice: (args, kwargs, details) => {
        const pluginPrefix = args[0];
        const device = kwargs;
        const key = `${pluginPrefix}.${device.uuid}`;

        if (this.devices[key]) {
          this.devices[key].status = false;
        }

        return { success: true };
      }
    };
  }

  _createAutobahn () {
    this.connection =
      new autobahn.Connection({
        url: this.ROUTER_URL,
        realm: WampServer.REALM,
        authmethods: [ 'ticket' ],
        authid: 'kadecot-provider',
        onchallenge: (session, method /*, extra*/) => {
          if (method === 'ticket') {
            return 'KADECOT_PROVIDER';
          } else {
            throw new Error('Failed to authenticate');
          }
        }
      });

    this.connection.onopen = (session) => {
      this.log('Connection to wamp router open.');
      this.session = session;

      const promises = [];

      // Register procedures
      Object.entries(this.procedures).map((arr) => {
        const methodName = arr[0];
        const method = arr[1];

        return session.register(
          `${WampServer.PREFIX}.procedure.${methodName}`,
          method.bind(this)
        );
      }).forEach((p) => {
        promises.push(p);
      });

      // Subscribe core
      promises.push(
        // session.subscribe('wamp.session.on_join', (args) => {
        // 	this.log('Published (wamp.session.on_join): ', args);
        // 	session.call('wamp.session.get', [ args[0].session ]);
        // }),
        session.subscribe('wamp.session.on_leave', (args) => {
          this.unregisterPlugin(args[0]);
        })
      );

      Promise.all(promises)
        .then(() => {
          this.log('All procedures/topics registered.');
          return this.initPluginsAsync();
        })
        .catch((_err) => {
          this.log('Registration/Subscription failed!', _err);
        });
    };

    this.connection.open();
  }

  initPluginsAsync () {
    const PLUGINS_FOLDER = path.resolve(__dirname, '../', 'plugins');

    return fs.readdir(PLUGINS_FOLDER)
      .then((files) => {
        return files.filter((dirname) => {
          const stats = fs.lstatSync(path.resolve(PLUGINS_FOLDER, dirname));
          return stats.isDirectory();
        });
      })
      .then((files) => {
        files.forEach((dirname) => {
          const pluginInterface =
            new PluginInterface(WampServer.REALM, this.ROUTER_URL, dirname /* as PLUGIN_PREFIX */ );
          require(path.resolve(PLUGINS_FOLDER, dirname)).init(pluginInterface);
        });
      });
  }

}

module.exports = WampServer;
