//////////////////////////////////////
// Setup & utilities

function log(msg){ console.log('v1:cloud: '+msg); }


var WebSocketClient = require('websocket').client;
var cloudsock = new WebSocketClient () ;

cloudsock.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
});
 
cloudsock.on('connect', function(connection) {
    console.log('WebSocket cloudsock Connected');
    connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
        console.log('wamp Connection Closed');
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
		var msg = message.utf8Data ;

		console.log("Received: '" + msg + "'");
        }
    });

    //connection.sendUTF('devlist:[]');
});
 

exports.connect = function( terminal_token,bridge_server ){
	// Redudant setting of 'wamp.2.json'?
	cloudsock.connect('wss://'+bridge_server+'/bridge?k='+terminal_token
		, 'wamp.2.json'
		,'kadecot://com.sonycsl.Kadecot',{'Sec-WebSocket-Protocol':'wamp.2.json'});
} ;





/*
//////////////////////////////////////
// Load libraries
var autobahn , when ;
try {
   autobahn = require('autobahn');
   when = require('when');
} catch (e) {   // When running in browser, AutobahnJS will be included without a module system
   var when = autobahn.when;
}

var session ;

exports.init=function(REALM,ROUTER_URL){

	//////////////////////////////////////
	// Connect to Wamp router
	var connection = new autobahn.Connection({
		url: ROUTER_URL
		,realm: REALM
	});

	connection.onclose = function(){ session = undefined ; } ;
	connection.onopen = function(_session){
		session = _session ;
		log('connection to '+ROUTER_URL+' success.') ;
		session.call('com.sonycsl.kadecot.provider.procedure.registerplugin'
			,[session.id,PLUGIN_PREFIX]).then(function(re){

			log('Plugin '+PLUGIN_PREFIX+' registration success.') ;
		}) ;

	} ;
	connection.open() ;

};
*/
