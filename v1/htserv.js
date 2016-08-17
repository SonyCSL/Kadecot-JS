exports.start = function(portNo, callbacks) {
  var app = require('express')();
  app.get(/^(.+)$/, function(req, res) {
    if (req.params[0].indexOf('/api') === 0) {
      var args = req.params[0].substring(5).split('&');
      if (typeof callbacks[req.query.func] === 'function') {
        callbacks[req.query.func](req.query);
        res.jsonp({
          success: true
        });
        return;
      }
    }
    console.log('Web access to port ' + portNo + ': ' + JSON.stringify(req.params));
    //console.log('static file request : ' + JSON.stringify(req.params));
    res.sendFile(__dirname + '/htservdocs' + req.params[0]);
  });
  app.listen(portNo, function() {
    console.log("Web insterface is listening HTTP access on " + portNo);
  });
};
