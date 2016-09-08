/**
 * (c) 2016- 3846masa
 */
'use strict';

const manager = require('deviceconnect-manager/deviceconnect-manager');
const http = require('http');
const path = require('path');
const axios = require('axios');
const _ = require('./lodash');

const PORT = 4035;

class GotAPIManagerPlugin {
  constructor (_pluginInterface) {
    this._pluginInterface = _pluginInterface;
    this._services = {};
    http.createServer(manager).listen(PORT, () => {
      console.log('listen on port 4035');
      this._init();
    });
  }

  _init () {
    this._axios = axios.create({
      baseURL: `http://localhost:${PORT}/gotapi/`
    });
    this._pluginInterface.connectRouter({
      onopen: () => {
        this.registerGotAPIManager().bind(this);
        this._checkDevices().bind(this);
      },
      onclose: (function () {}).bind(this)
    });
  }

  _checkDevices () {
    this._axios('/servicediscovery')
      .then((res) => {
        const services = {};
        for (let service of res.data.services) {
          services[service.id] = service;
          if (!this._services.hasOwnProperty(service.id)) {
            this.registerService(service);
          }
        }
        for (let serviceId in this._services) {
          if (!services.hasOwnProperty(serviceId)) {
            this.unregisterService(this._services[serviceId]);
          }
        }
        this._services = services;
      })
      .then(() => {
        setTimeout(this._checkDevices, 1000);
      });
  }

  registerService (service) {
    this._pluginInterface.registerDevice(
      service.id, // UUID
      service.name, // deviceType
      service.name, // description
      service.name  // nickname
    )
    .then((re) => {
      if (!re.success) return;
      const procedures = service.scopes.map((name) => ({
        name: `${name}.get`,
        procedure: (deviceIdArray, argObj) => {
          console.log('procedure:', service.id, deviceIdArray, argObj);

          return this._axios.get({
            url: `/${name}`,
            params: { serviceId: service.id }
          }).then((res) => {
            if (res.status === 200 && res.data.result === 0) {
              return Promise.resolve(res.data);
            } else {
              return Promise.reject(res.data);
            }
          });
        }
      }));
      this._pluginInterface.registerProcedures(procedures);
    });
  }

  unregisterService (service) {
    this._pluginInterface.unregisterDevice(service.id);
  }

  registerGotAPIManager () {
    return this._pluginInterface.registerDevice(
      'GotAPIManager', // UUID
      'GotAPIManager', // deviceType
      'GotAPIManager', // description
      'GotAPIManager'  // nickname
    ).then((re) => {
      if (!re.success) return;
      return this._axios.get('/system');
    }).then((res) => {
      const supports = [];
      supports.push.apply(supports, res.data.supports);
      supports.push.apply(supports, res.data.plugins.map((p) => p.supports));
      return _.uniq(_.flattenDeep(supports));
    }).then((supports) => {
      const procedures = supports.map((name) => {
        const methods = [ '', 'GET', 'POST', 'DELETE', 'PUT' ];

        return methods.map((method) => ({
          name: [ name, method.toLowerCase() ].filter((t) => t).join('.'),
          procedure: (ids, params) => {
            params.method = method || params.method;
            return this.procedureMethod(ids, params, name);
          }
        }));
      });

      return this._pluginInterface.registerProcedures(_.flattenDeep(procedures));
    }).then(() => {
      return this._pluginInterface.registerProcedures([
        {
          name: 'reregister',
          procedure: () => {
            return this.registerGotAPIManager()
              .catch(() => Promise.resolve()).then(() => ({}));
          }
        }
      ]);
    });
  }

  procedureMethod (deviceIdArray, rawParams, name) {
    const requestPath =
      path.join(name, rawParams.interface || '', rawParams.attribute || '');
    const data = rawParams.data;
    const params = Object.assign({}, rawParams, {
      interface: undefined,
      attribute: undefined,
      method: undefined,
      data: undefined
    });

    return this._axios.request({
      method: params.method || 'GET',
      url: requestPath,
      params: params,
      data: data
    }).then((res) => {
      if (res.status === 200 && res.data.result === 0) {
        delete res.data.result;
        return Promise.resolve(res.data);
      } else {
        delete res.data.result;
        return Promise.reject(res.data);
      }
    });
  }
}

exports.init = function (_pluginInterface) {
  const plugin = new GotAPIManagerPlugin(_pluginInterface);
  return plugin;
};
