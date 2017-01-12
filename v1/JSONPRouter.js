'use strict';

const express = require('express');
const cors = require('cors');

module.exports = function factory (htserv) {
  const JSONPRouter = express();

  JSONPRouter.set('jsonp callback name', 'callback');

  JSONPRouter.use(cors());

  JSONPRouter.use('/*', (req, res, next) => {
    if (!htserv.session) res.status(500).jsonp({ error: 'Server isn\'t ready yet.'});
    else next();
  });

  JSONPRouter.use('/:deviceId', (req, res) => {
    const deviceId = parseInt(req.params.deviceId, 10);
    const params = JSON.parse(req.query.params || '{}');
    let procedure = req.query.procedure;

    Promise.resolve()
      .then(() => {
        return htserv.session.call('com.sonycsl.kadecot.provider.procedure.getDeviceList');
      })
      .then((result) => {
        return result.kwargs.deviceList.filter((d) => d.deviceId === deviceId);
      })
      .then((device) => {
        if (device.length !== 1) {
          return Promise.reject(new Error('Device is not found.'));
        } else {
          return device[0];
        }
      })
      .then((deviceInfo) => {
        if (deviceInfo.protocol === 'echonetlite') {
          procedure = `${deviceInfo.deviceType}.${procedure}`;
        }
        const procedureName = `${deviceInfo.prefix}.procedure.${procedure}`;
        return htserv.session.call(
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
    htserv.session.call('com.sonycsl.kadecot.provider.procedure.getDeviceList')
      .then((result) => {
        res.jsonp(result.kwargs);
      })
      .catch((error) => {
        res.jsonp({ error: error.message || error });
        return Promise.resolve();
      });
  });

  return JSONPRouter;
};
