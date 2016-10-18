//////////////////////////////////////
// Setup & utilities

function log(msg) {
  console.log('v1:cloud: ' + msg);
}


var WebSocketClient = require('websocket').client;
var cloudsock = new WebSocketClient();

cloudsock.on('connectFailed', function(error) {
  console.log('Connect Error: ' + error.toString());
});

var clients = {} ;

cloudsock.on('connect', function(sconn) {
	console.log('Connected to cloud');
	clients = {} ;

	sconn.on('error', function(error) {
		console.log("Cloud connection Error: " + error.toString());
	});

	sconn.on('close', function() {
		for( var c in clients ){
			if( clients[c].conn != undefined )
				clients[c].conn.close() ;
		}
		clients = {} ;
		console.log('Disconnected all connections.') ;
	});

	sconn.on('message', function(message) {
		if (message.type === 'utf8') {
			var msg = message.utf8Data;
			var client_id ;

			function finishSocket(bWithClose){
				if( clients[client_id] != undefined ){
					if( clients[client_id].conn != undefined && bWithClose)
						clients[client_id].conn.close() ;
					clients[client_id] = undefined ;
					delete clients[client_id] ;
				}
				console.log('Kadecot connection('+client_id+') closed.') ;
			}

			console.log("Received from cloud: '" + msg + "'");
			var colon_i = msg.indexOf(':') ;
			if( colon_i == -1 ) return ;	// error
			var cmd = msg.substring(0,colon_i) ;
			msg = msg.substring(colon_i+1) ;
			if( cmd === 'wamp' ){
				colon_i = msg.indexOf(':') ;
				if( colon_i == -1 ) return ;	// error
				client_id = msg.substring(0,colon_i) ;
				if( clients[client_id] != undefined && clients[client_id].conn != undefined ){
					var msg_body = msg.substring(colon_i+1) ;
					if( msg_body.indexOf('[6,{') == 0 ){
						if( JSON.parse(msg_body)[1].detail == 'TerminalRemovedFromDB' ){
							// Terminal delete request from cloud
							require('fs').unlink(exports.REGISTERED_INFO_CACHE_FILE) ;
							sconn.close() ;
							console.log('Cloud connection disconnected and registration information is erased.') ;
							console.log('To connect cloud again, please access http://localhost:31413/register.html to register terminal infomation to cloud again.') ;
							return ;
						}
					}
					// Just forward message
					clients[client_id].conn.send( msg_body ) ;
					console.log('Cloud ('+client_id + ') => Kadecot : '+msg_body) ;
				} else {
					// client is not connected yet.
					if( clients[client_id] == undefined ) clients[client_id] = {} ;
					if( clients[client_id].msg_queue == undefined ) clients[client_id].msg_queue = [] ;
					clients[client_id].msg_queue.push(msg.substring(colon_i+1)) ;
				}

			} else if( cmd === 'onclientconnected' ){
				client_id = msg ;
				if( clients[client_id] !== undefined && clients[client_id].sock !== undefined
				 && typeof clients[client_id].sock.close === 'function' )
					clients[client_id].sock.close() ;
				if( clients[client_id] == undefined ) clients[client_id] = {} ;

				var csock = new WebSocketClient() ;
				clients[client_id].sock = csock ;


				csock.on('connectFailed',function(error) {
					console.log(client_id+' connect Error: ' + error.toString());
					finishSocket() ;
				});
				csock.on('connect',function(cconn){
					console.log('Client '+client_id+' is connected to Kadecot server.') ;
					clients[client_id].conn = cconn ;
					cconn.on('error',function(error){
						console.log(client_id+" connection error: " + error.toString());
						finishSocket() ;
					}) ;
					cconn.on('close',function(error){
						console.log('Client ' + client_id+" connection closed: " + error.toString());
						finishSocket() ;
					}) ;
					cconn.on('message', function(message) {	// From Kadecot server
						if (message.type === 'utf8') {
							var msg = message.utf8Data;
							sconn.send('wamp:'+client_id+':'+msg) ;
							console.log('Kadecot =>Cloud ('+client_id+'): '+'wamp:'+client_id+':'+msg) ;
						}
					}) ;

					// Send queued msg to Kadecot server at once
					if( clients[client_id].msg_queue instanceof Array ){
						clients[client_id].msg_queue.forEach(function(msg){
							cconn.send(msg) ;
							console.log('Cloud ('+client_id+')=> Kadecot : '+msg) ;
						}) ;
					}
					clients[client_id].msg_queue = undefined ;
					delete clients[client_id].msg_queue ;
				}) ;

				csock.connect(ROUTER_URL, 'wamp.2.json' /*, 'kadecot://com.sonycsl.Kadecot', {
					'Sec-WebSocket-Protocol': 'wamp.2.json'} */) ;

			} else if( cmd === 'onclientdisconnected' ){
				client_id = msg ;
				finishSocket() ;
			}
		}
	});

	//connection.sendUTF('devlist:[]');
});

var ROUTER_URL ;
exports.connect = function(terminal_token, bridge_server, router_url) {
	ROUTER_URL = router_url ;
	// Redudant setting of 'wamp.2.json'?
	cloudsock.connect('wss://' + bridge_server + '/bridge?k=' + terminal_token, 'wamp.2.json', 'kadecot://com.sonycsl.Kadecot', {
		'Sec-WebSocket-Protocol': 'wamp.2.json'
	});
};





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
