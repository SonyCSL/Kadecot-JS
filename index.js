'use strict';

const url = require('url');
const readConfigAsync = require('./utils/read-config');
const defaultConfig = require('./utils/default.config.js');

const RestServer = require('./rest-server');
const WampServer = require('./wamp-server');

readConfigAsync(defaultConfig)
.then((config) => {
  new RestServer().listen(config.servers.rest.port, () => {
    //
  });

  const WAMP_ROUTER_URL =
    (config.servers.wamp.url)
    ? config.servers.wamp.url
    : url.format(config.servers.wamp);

  new WampServer({
    url: WAMP_ROUTER_URL
  }).init(() => {
    //
  });
})
.catch((err) => {
  console.error(err.stack || err);
});
