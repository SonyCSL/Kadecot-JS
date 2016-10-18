var PLUGIN_PREFIX = 'com.test';
var ROUTER_URL = process.env.ROUTER_URL || 'ws://127.0.0.1:41314/ws'
var REALM = 'v1' ;


var autobahn , when ;

try {
   autobahn = require('autobahn');
   when = require('when');
} catch (e) {
   // When running in browser, AutobahnJS will
   // be included without a module system
   var when = autobahn.when;
}

var connection = new autobahn.Connection({
         url: ROUTER_URL
         ,realm: REALM
});

connection.onopen = function (session) {
	console.log('connection to wamp router ('+ROUTER_URL+') success.') ;
	session.call('com.sonycsl.kadecot.provider.procedure.registerplugin'
		,[session.id,PLUGIN_PREFIX]) ;
};

connection.open();
