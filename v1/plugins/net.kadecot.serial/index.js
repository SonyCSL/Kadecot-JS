/*
 protocol: serial

 deviceType: websocket  (All devices should support same procedures/topics in future. So you can ignore deviceType.)

 Procedures:
  net.kadecot.serial.procedure.message( {value:'STRING TO SEND To DEVICE'} )

 Topics:
  net.kadecot.serial.topic.message
*/

const WEBSOCKET_PORT = 41316 ;
var  SOCKET_PORT = 41317 ;
const SEP = ';' ;


var pluginInterface ;
var connections = {
} ;

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

		var connection = request.accept(null, request.origin);
		var id ;

		var recv_buf = '' ;

		connection.on('message', function(message) {
			if (message.type === 'utf8') {
				console.log('Received Message: ' + message.utf8Data);
				recv_buf += message.utf8Data ;

				var idx ;
				while( (idx = recv_buf.indexOf(SEP)) >= 0 ){
					onmsg(recv_buf.substring(0,idx)) ;
					recv_buf = recv_buf.substring(idx+1) ;
				}

			} else if (message.type === 'binary') {}
		});
		connection.on('close', function(reasonCode, description) {
			if( id != undefined ){
				delete connections[id] ;
				connections[id] = undefined ;
				pluginInterface.unregisterDevice(id) ;
			}
			console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
		});


		function onmsg(msg){
			if( id == undefined ){
				if( connections[ msg ] != undefined ){
					connection.sendUTF('Duplicate connection of '+msg) ;
					console.log('Duplicate connection of '+msg) ;
					connection.close() ;
					return ;
				}
				id = msg ;
				connections[ id ] = (msg)=>{connection.sendUTF(msg);} ;

				// uuid, deviceType, description, nickname
				pluginInterface.registerDevice( id , 'websocket' , 'WebSocket connection of '+id , id ).then(re=>{
					console.log('Device registartion success:'+id+':websocket');
				}).catch( e=>{
					console.error('Device registartion error:'+JSON.stringify(e));
				}) ;
			} else {
				pluginInterface.publish( 'message',[id],{value:msg} ) ;
			}
		}
	});
}

var net = require('net') ;

function initSocketServer(){

	net.createServer(function(sock) {
		console.log('socket connected: ' + sock.remoteAddress +':'+ sock.remotePort);

		var id ;
		var recv_buf = '' ;

		sock.on('data', function(data) {
			recv_buf += data ;

			var idx ;
			while( (idx = recv_buf.indexOf(SEP)) >= 0 ){
				onmsg(recv_buf.substring(0,idx)) ;
				recv_buf = recv_buf.substring(idx+1) ;
			}
		});
		sock.on('close', function(had_error) {
			if( id != undefined ){
				delete connections[id] ;
				connections[id] = undefined ;
				pluginInterface.unregisterDevice(id) ;
			}
			console.log((new Date()) + ' Peer ' + sock.remoteAddress + ' disconnected.');
		});
		sock.on('error', function(err) {
			console.log('Socket error: ' + err.stack);
		});


		function onmsg(msg){
			if( id == undefined ){
				if( connections[ msg ] != undefined ){
					sock.write('Duplicate connection of '+msg) ;
					console.log('Duplicate connection of '+msg) ;
					sock.close() ;
					return ;
				}
				id = msg ;
				connections[ id ] = (msg)=>{sock.write(msg);} ;

				// uuid, deviceType, description, nickname
				pluginInterface.registerDevice( id , 'socket' , 'Raw socket connection of '+id , id ).then(re=>{
					console.log('Device registartion success:'+id+':socket');
				}).catch( e=>{
					console.error('Device registartion error:'+JSON.stringify(e));
				}) ;
			} else {
				pluginInterface.publish( 'message',[id],{value:msg} ) ;
			}
		}


	}).listen(SOCKET_PORT, 'localhost');

	console.log('Listening socket on port '+SOCKET_PORT);
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
					if( conn == undefined ) return ;

					conn( argObj.value+SEP ) ;
				} ) ;
				return {success:true} ;
			}
		}
	] ) ;

} ;
