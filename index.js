'use strict';

const url = require('url');
const config = require('config');
const RestServer = require('./rest-server');
const WampServer = require('./wamp-server');

new RestServer().listen(config.get('servers.rest.port'), () => {
  //
});

const WAMP_ROUTER_URL =
  config.has('servers.wamp.url')
  ? config.get('servers.wamp.url')
  : url.format(config.get('servers.wamp'));

new WampServer({
  url: WAMP_ROUTER_URL
}).init(() => {
  //
});
