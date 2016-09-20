'use strict';

const express = require('express');
const path = require('path');
const autobahn = require('autobahn');
const JSONPRouterFactory = require('./htserv/JSONPRouter');

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

    this.app.use(`/jsonp/${this.realm}/devices`, JSONPRouterFactory(this));
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
