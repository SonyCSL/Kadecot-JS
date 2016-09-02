'use strict';

const cosmiconfig = require('cosmiconfig');
const path = require('path');
const defaultsDeep = require('lodash.defaultsdeep');

function readConfigAsync (defaultConfig) {
  const promise = Promise.resolve()
    .then(() => {
      // ${HOME}/.kadecotrc
      // ${HOME}/.kadecotrc.ext
      return cosmiconfig('kadecot', {
        packageProp: false,
        js: false,
        rcExtensions: true,
        cwd: process.env['HOME']
      });
    })
    .then((result) => {
      if (result) return result;
      // ${HOME}/.kadecot/config.ext
      return cosmiconfig('kadecot', {
        packageProp: false,
        rc: 'config',
        js: false,
        rcExtensions: true,
        cwd: path.join(process.env['HOME'], '.kadecot')
      });
    })
    .then((result) => {
      if (!result) return defaultConfig;
      return defaultsDeep(result.config, defaultConfig);
    });

  return promise;
}

module.exports = readConfigAsync;
