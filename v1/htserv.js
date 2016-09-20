'use strict';

const express = require('express');
const path = require('path');
const autobahn = require('autobahn');

class HTTPServer {
  constructor (realm, routerURL, callbacks) {
    this.realm = realm;
    this.routerURL = routerURL;
    this.callbacks = callbacks;

    this.initWAMPClient();
    this.initServer();
  }

  initWAMPClient () {
    this.connection = new autobahn.Connection({
      realm: this.realm,
      url: this.routerURL
    });

    this.connection.onclose = () => {};
    this.connection.onopen = (session) => {
      this.session = session;
    };
    this.connection.open();
  }

  initServer () {
    this.app = express();

    this.app.get('/api', function(req, res) {
      if (typeof this.callbacks[req.query.func] === 'function') {
        this.callbacks[req.query.func](req.query);
        res.jsonp({
          success: true
        });
        return;
      }
    });

    this.app.use(express.static(path.resolve(__dirname, './htservdocs')));

    this.app.set('jsonp callback name', 'callback');
    const JSONPRouter = express.Router();

    JSONPRouter.use('/*', (req, res, next) => {
      if (!this.session) res.status(500).jsonp({ error: 'Server isn\'t ready yet.'});
      else next();
    });

    JSONPRouter.use('/:deviceId', (req, res) => {
      const deviceId = parseInt(req.params.deviceId, 10);
      const params = JSON.parse(req.query.params || '{}');
      let procedure = req.query.procedure;

      Promise.resolve()
        .then(() => {
          return this.session.call('com.sonycsl.kadecot.provider.procedure.getDeviceList');
        })
        .then((result) => {
          return result.kwargs.deviceList.filter((d) => d.deviceId === deviceId);
        })
        .then((device) => {
          if (device.length !== 1) {
            return Promise.reject(new Error('Device is not fould.'));
          } else {
            return device[0];
          }
        })
        .then((deviceInfo) => {
          if (deviceInfo.protocol === 'echonetlite') {
            procedure = `${deviceInfo.deviceType}.${procedure}`;
          }
          const procedureName = `${deviceInfo.prefix}.procedure.${procedure}`;
          return this.session.call(
            procedureName,
            [ deviceId ],
            params
          );
        })
        .then((result) => {
          res.jsonp(result.kwargs);
        })
        .catch((error) => {
          res.jsonp({ error: error.message || error });
          return Promise.resolve();
        });
    });

    JSONPRouter.use('/', (req, res) => {
      this.session.call('com.sonycsl.kadecot.provider.procedure.getDeviceList')
        .then((result) => {
          res.jsonp(result.kwargs);
        })
        .catch((error) => {
          res.jsonp({ error: error.message || error });
          return Promise.resolve();
        });
    });

    this.app.use(`/jsonp/${this.realm}/devices`, JSONPRouter);
  }

  start (portNo) {
    this.app.listen(portNo, function() {
      console.log(`Web insterface is listening HTTP access on ${portNo}`);
    });
  }
}

module.exports = function (args) {
  return new HTTPServer(args.realm, args.routerURL, args.callbacks);
};
