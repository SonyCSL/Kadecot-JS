/*
 protocol: socket

 deviceType: socket, gpio

 socket device procedures:
  net.kadecot.socket.procedure.message( {value:'STRING TO SEND To DEVICE'} )

 socket device topics:
  net.kadecot.socket.topic.message


 Client protocol:
  1) First, send the unique id of the client by a plain text with postfix ';'
  2) Send/Receive arbitrary text message with the separator ';'

 If the client has GPIO and use the it only, we recommend to use
   'GPIO mode'. To use GPIO mode, the client name should be followed by the
   pin availability information as follows:
   /in:1,3,4,5/out:1,2
   This means
    there are four input pins: 1,3,4,5
    there are two output pins: 1,2

 In GPIO mode, the following procedures / topics are additionally supported

 Procedures:

  net.kadecot.socket.procedure.gpiopins
  	returns a JSON object as follows
  	{
		"in":[1,3,4,5]
		,"out":[1,2]
  	}

  net.kadecot.socket.procedure.set( {"pin":PINNUMBER , "value":VALUE_IN_FLOARING_POINT} )
  	PINNUMBER : an integer digit that should be one of output pins
	VALUE_IN_FLOARING_POINT : a floating point number (0 to 1)

  net.kadecot.socket.procedure.get( {"pin":PINNUMBER} )
  	PINNUMBER : an integer digit that should be one of input pins
  	this procedure returns current value of the specified pin.

Topics
  net.kadecot.socket.topic.in( {"pin":PINNUMBER} ) ;
  	PINNUMBER : an integer digit that should be one of input pins
  	if the value is changed, the new value may be automatically published.
  	(Not always, depending on the client's implementation)
*/

const WEBSOCKET_PORT = 41316 ;
var  SOCKET_PORT = 41317 ;
const SEP = ';' ;

var crypto = require("crypto");
function getHashKey(){ return crypto.randomBytes(20).toString('hex'); }

var pluginInterface ;
var connections = {
} ;


// Websocket server start and initalization
function initWebsocketServer(){

	var WebSocketServer = require('websocket').server;
	var http = require('http');

	var server = http.createServer(function (request, response) {
	    console.log( request.url + ' accessed to http server. returns 404' );
	    response.writeHead(404);
	    response.end();
	});
	server.listen(WEBSOCKET_PORT);

	var wsServer = new WebSocketServer({
	    httpServer: server, autoAcceptConnections: false
	});



	wsServer.on('request', function(request) {
		console.log((new Date()) + ' Connection attempt from '+request.origin);
		if( pluginInterface == undefined /*|| request.origin!='ACCEPT_ORIGIN'*/ ) { request.reject(); return; }


		var connection = {
			sock : request.accept(null, request.origin)
		} ;

		connection.sock.on('message', function(message) {
			if (message.type === 'utf8') {
				connection.onrecv( message.utf8Data ) ;
			} else if (message.type === 'binary') {}
		});

		connection.sock.on('close', function(reasonCode, description) {
			connection.onclose(description) ;
		});

		connection.send = function(msg){connection.sock.sendUTF(msg);} ;
		connection.close = function(){connection.sock.close();} ;


		init_main( connection ) ;
	});
}

var net = require('net') ;

// Plain socket server start and initalization
function initSocketServer(){

	net.createServer(function(sock) {
		console.log('socket connected: ' + sock.remoteAddress +':'+ sock.remotePort);

		var connection = {
			sock : sock
		} ;

		sock.on('data', function(data) {
			connection.onrecv( data ) ;
		});
		sock.on('close', function(had_error) {
			connection.onclose(had_error) ;
		});
		sock.on('error', function(err) {
			console.log('Socket error: ' + err.stack);
		});

		connection.send = function(txt){sock.write(txt);} ;

		init_main( connection ) ;

	}).listen(SOCKET_PORT, 'localhost');

	console.log('Listening socket on port '+SOCKET_PORT);
}


// Common initialization on connection to client (socket/websocket abstracted)
function init_main(connection){
	var id ;

	connection.gpioget_waitlist = {} ;

	function onmsg(msg){
		if( id == undefined ){
			var defs = msg.split('/') ;
			if( defs.length > 1 ){
				msg = defs.shift() ;
				connection.in=[] ;
				connection.out=[] ;
				defs.forEach( def => {
					var terms = def.split(':') ;
					connection[terms[0]] = terms[1].split(',').map(numstr=>parseInt(numstr)) ;
				}) ;

				connection.isgpio = ()=>{return true;} ;
			} else
				connection.isgpio = ()=>{return false;} ;

			if( connections[ msg ] != undefined ){
				connection.send('Duplicate connection of '+msg) ;
				console.log('Duplicate connection of '+msg) ;
				connection.close() ;
				return ;
			}
			id = msg ;

			connections[ id ] = connection ;

			// uuid, deviceType, description, nickname
			pluginInterface.registerDevice( id , (connection.isgpio()?'gpio':'socket') , 'Socket connection of '+id , id ).then(re=>{
				console.log('Device registartion success:'+id+':socket');
			}).catch( e=>{
				console.error('Device registartion error:'+JSON.stringify(e));
			}) ;
		} else {
			if( connection.isgpio() ){
				var msg_sp = msg.trim().split(':') ;
				if( msg_sp.length == 3 ){
					switch( msg_sp[0] ){
					case 'rep' :
						if( typeof connection.gpioget_waitlist[msg_sp[2]] == 'function' ){
							connection.gpioget_waitlist[msg_sp[2]]( {value:parseFloat(msg_sp[1])} ) ;
							delete connection.gpioget_waitlist[msg_sp[2]] ;
						}
						break ;
					case 'pub' :
						pluginInterface.publish( 'in',[id],{
							pin:parseInt(msg_sp[1])
							,value:parseFloat(msg_sp[2])
						} ) ;
						break ;
					}
				}
			}
			pluginInterface.publish( 'message',[id],{value:msg} ) ;
		}
	}

	var recv_buf = '' ;
	connection.onrecv = function(txt){
		recv_buf += txt ;

		var idx ;
		while( (idx = recv_buf.indexOf(SEP)) >= 0 ){
			onmsg(recv_buf.substring(0,idx)) ;
			recv_buf = recv_buf.substring(idx+1) ;
		}
	} ;

	connection.onclose = function(){
		if( id != undefined ){
			delete connections[id] ;
			connections[id] = undefined ;
			pluginInterface.unregisterDevice(id) ;
			console.log((new Date()) + ' Peer ' + id + ' disconnected.');
		}
	} ;
}




exports.init = function() {
	pluginInterface = this ;

	initWebsocketServer() ;
	initSocketServer() ;

	pluginInterface.registerProcedures( [
		{
			name : 'message'
			,procedure : (uuidArray , argObj) => {
				uuidArray.forEach( uuid => {
					var conn = connections[uuid] ;
					if( conn == undefined )	return {success:false,error:uuid+' not found.'};

					conn.send( argObj.value+SEP ) ;
				} ) ;
				return {success:true} ;
			}
		}
		,{
			name : 'gpiopins'
			,procedure : (uuidArray , argObj) => {
				var uuid = uuidArray[0] ;
				var conn = connections[uuid] ;
				if( conn == undefined )	return {success:false,error:uuid+' not found.'};

				return {success:true,in:conn.in,out:conn.out} ;
			}
		}
		,{
			name : 'set'
			,procedure : (uuidArray , argObj) => {
				var uuid = uuidArray[0] ;
				var conn = connections[uuid] ;
				if( conn == undefined )	return {success:false,error:uuid+' not found.'};

				conn.send( 'set:'+argObj.pin+':'+argObj.value+';' ) ;

				return {success:true} ;
			}
		}
		,{
			name : 'get'
			,procedure : (uuidArray , argObj) => {
				return new Promise( (acpt,rjct) => {
					var uuid = uuidArray[0] ;
					var conn = connections[uuid] ;
					if( conn == undefined ){
						rjct({success:false,error:uuid+' not found.'}) ;
						return ;
					}

					var key = getHashKey() ;
					conn.send( 'get:'+argObj.pin+':'+key+';' ) ;
					conn.gpioget_waitlist[key] = acpt ;
				} ) ;
			}
		}
	] ) ;
} ;
