'use strict';

const express = require('express');
const path = require('path');
const autobahn = require('autobahn');
const JSONPRouterFactory = require('./JSONPRouter');

class HTTPServer {
  constructor (realm, routerURL, username, secret, callbacks) {
    this.realm = realm;
    this.routerURL = routerURL;
    this.username = username;
    this.secret = secret;
    this.callbacks = callbacks;

    this.initWAMPClient();
    this.initServer();
  }

  initWAMPClient () {
   if( this.username == undefined ){
	console.error('Cannot start JSONP server.') ;
	return ;
   }

   this.connection = new autobahn.Connection({
        url: this.routerURL
        ,realm: this.realm
        ,authmethods: ["wampcra"]
        ,authid: this.username
        ,onchallenge: (session, method, extra) => {
              if (method === "wampcra") {
                return autobahn.auth_cra.sign(this.secret, extra.challenge);
              } else {
                 throw "don't know how to authenticate using '" + method + "'";
              }
        }
    });

    this.connection.onclose = () => {};
    this.connection.onopen = (session) => {
	// console.log('The web server logged in to the main server') ;
	this.session = session;
    };
    this.connection.open();
  }

  initServer () {
    this.app = express();

    this.app.get('/api', (req, res) => {
    	if (typeof this.callbacks[req.query.func] === 'function') {
	        var re = this.callbacks[req.query.func](req.query);
	        switch( typeof re ){
	        case 'string' : res.send(re) ; break ;
	        case 'object' : res.jsonp(re) ; break ;
	        default : res.jsonp({ success: true });
	        }
      	} else res.jsonp({ success: false , error: 'No such api exists.' });
    });

    // JSONP response
    this.app.use(`/jsonp/${this.realm}/devices`, JSONPRouterFactory(this));
    this.app.use(express.static(path.resolve(__dirname, './htdocs')));

  }

  start (portNo) {
    this.app.listen(portNo, function() {
      console.log(`Web insterface is listening HTTP access on ${portNo}`);
    });
  }
}

module.exports = function (args) {
  return new HTTPServer(args.realm, args.routerURL, args.username, args.secret, args.callbacks );
};
