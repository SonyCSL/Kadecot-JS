'use strict';

const express = require('express');
const path = require('path');

exports.start = function(portNo, callbacks) {
  const app = express();

  app.get('/api', function(req, res) {
    if (typeof callbacks[req.query.func] === 'function') {
      callbacks[req.query.func](req.query);
      res.jsonp({
        success: true
      });
      return;
    }
  });
  app.use(express.static(path.resolve(__dirname, './htservdocs')));
  app.listen(portNo, function() {
    console.log("Web insterface is listening HTTP access on " + portNo);
  });
};
