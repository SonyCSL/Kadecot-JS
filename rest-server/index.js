'use strict';

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multiparty = require('multiparty');
const path = require('path');

class RestServer {
  constructor () {
    this._app = express();

    this._app.use(cors({
      origin: '*',
      methods: [ 'GET', 'POST', 'PUT', 'DELETE' ]
    }));
    this.setBodyParser();
    // Static files
    this._app.use(express.static(path.resolve(__dirname, 'statics')));
  }

  setBodyParser () {
    this._app.use(bodyParser.urlencoded());
    this._app.use(bodyParser.json());
    this._app.use(bodyParser.raw({
      type: 'multipart/*'
    }), (req, res, next) => {
      const form = new multiparty.Form();
      form.parse(req, (err, fields) => {
        fields = fields || {};
        Object.keys(fields).forEach((name) => {
          const field = fields[name] || [];
          if (field.length > 0) {
            req.query[name] = field[0];
          }
        });
        next();
      });
    });
  }

  listen (port, cb) {
    this._app.listen(port, cb);
  }
}

module.exports = RestServer;
