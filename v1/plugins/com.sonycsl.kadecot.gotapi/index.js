/**
 * (c) 2016- 3846masa
 */
'use strict';

const cosmiconfig = require('cosmiconfig');
const url = require('url');
const path = require('path');
const axios = require('axios');
const _ = require('./utils/lodash');
const log4js = require('log4js');

const PORT = 4035;

class GotAPIManagerPlugin {
  constructor (_pluginInterface) {
    this._pluginInterface = _pluginInterface;
    this._services = {};
    this._devices = {};
    this._config = {
      hostname: 'localhost',
      port: 4035,
      ssl: false,
      createServer: true
    };
    log4js.configure({
      appenders: [{
        type: 'console',
        category: 'GotAPI',
        layout: {
          type: 'pattern',
          pattern: '%[%-5p %c%] - %m'
        }
      }]
    });
    this._logger = log4js.getLogger('GotAPI');

    this._readConfig().then(() => {
      if (this._config.createServer) {
        const manager = require('deviceconnect-manager/deviceconnect-manager');
        const http = require('http');
        http.createServer(manager).listen(PORT, () => {
          this._logger.info('listen on port 4035');
          this._init();
        });
      } else {
        this._init();
      }
    });
  }

  _readConfig () {
    return cosmiconfig('GotAPI', {
      configPath: path.resolve(__dirname, './config.yml')
    }).then((result) => {
      this._config = Object.assign(this._config, result.config);
    }).catch(() => {
      return Promise.resolve();
    });
  }

  _init () {
    const baseURL =
      url.format({
        protocol: this._config.ssl ? 'https:' : 'http:',
        hostname: this._config.hostname,
        port: this._config.port,
        pathname: '/gotapi'
      });
    this._axios = axios.create({
      baseURL: baseURL,
      headers: {
        Origin: 'http://example.com',
      },
    });
    this._pluginInterface.connectRouter({
      onopen: () => {
        this.registerGotAPIManager();
        this._checkDevices();
      },
      onclose: (function () {}).bind(this)
    });
  }

  _checkDevices () {
    Promise.all([
      this._axios('/servicediscovery'),
      this._axios('/system')
    ])
      .then((results) => {
        const currentServices = results[0].data.services;
        const plugins = results[1].data.plugins;
        const services = {};
        for (let service of currentServices) {
          services[service.id] = service;
          if (!this._services.hasOwnProperty(service.id)) {
            const packageName =
              (plugins.filter((p) => service.id.match(p.id))[0] || {}).packageName;
            this.registerService(service, packageName);
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
        setTimeout(() => this._checkDevices(), 1000);
      });
  }

  registerService (service, packageName) {
    packageName = packageName || '';
    const category = packageName.split('.').reverse()[0] || '';
    this._pluginInterface.registerDevice(
      `gotapi.${packageName}:${category}:nttdocomo:0:${service.id}`, // UUID
      packageName, // deviceType
      service.name, // description
      service.name  // nickname
    )
    .then((res) => {
      if (!res.success) return;
      this._logger.info('Registered:', service.name);
      this._devices[res.deviceId] = service.id;
      const procedures = this.createProcedures(service.scopes || service.plugins);
      return this._pluginInterface.registerProcedures(procedures);
    })
    .catch(() => Promise.resolve());
  }

  unregisterService (service) {
    this._pluginInterface.unregisterDevice(`GOTAPI_${service.id}`);
  }

  registerGotAPIManager () {
    return this._pluginInterface.registerDevice(
      'gotapi.manager:manager:nttdocomo:0:gotapimanager', // UUID
      'device-connect', // deviceType
      'GotAPIManager', // description
      'GotAPIManager'  // nickname
    ).then((re) => {
      if (!re.success) return;
      return this._axios.get('/system');
    }).then((res) => {
      const procedures = this.createProcedures(res.data.supports);
      return this._pluginInterface.registerProcedures(_.flattenDeep(procedures));
    });
  }

  createProcedures (supports) {
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
    return _.flattenDeep(procedures);
  }

  procedureMethod (deviceIds, rawParams, name) {
    const requestPath =
      path.join(name, rawParams.interface || '', rawParams.attribute || '');
    const data = rawParams._raw;
    const method = rawParams.method || 'GET';
    const params = Object.assign({}, rawParams, {
      interface: undefined,
      attribute: undefined,
      method: undefined,
      _raw: undefined,
      serviceId: this._devices[deviceIds[0]]
    });

    this._logger.info(requestPath);
    return this._axios.request({
      method: method,
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

exports.init = function () {
  const plugin = new GotAPIManagerPlugin( this );
  return plugin;
};
