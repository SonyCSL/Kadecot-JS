'use strict';

const express = require('express');
const path = require('path');

class RestServer {
  constructor () {
    this._app = express();

    // Static files
    this._app.use(express.static(path.resolve(__dirname, 'statics')));
  }

  listen (port, cb) {
    this._app.listen(port, cb);
  }
}

module.exports = RestServer;
