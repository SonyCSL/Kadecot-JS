//////////////////////////////////////
// Exports
var pluginInterface ;
var crypto = require("crypto");
var fs = require('fs');

var clients = fs.readFileSync( 'v1/plugins/net.kadecot.external/clients.json' , 'utf-8' ) ;
clients = JSON.parse(clients) ;

function getHashKey(){ return crypto.randomBytes(20).toString('hex'); }

exports.init = function() {
	pluginInterface = this ;

	clients.forEach( client => {
    
		// deviceInfoArray:[uuid,deviceType,description,nickname]
		pluginInterface.registerDevice.apply(pluginInterface,client.deviceInfoArray).then( re => {	// Nothing returned
			pluginInterface.log('Device registration result:'+JSON.stringify(re)) ;

			var clsock = require('socket.io-client');
			var socket = clsock.connect(client.host);
			socket.on('connect',function(){
				var replyWait = {} ;

				socket.on('registerProcedures',procArray => {
					//console.log('RegProcs : '+JSON.stringify(procArray)) ;
					var regProcs = [] ;
					procArray.forEach( procName => {
						regProcs.push( {
							name : procName
							,procedure : (uuidArray , argObj) => {
								return new Promise( (acpt,rjct) => {
									var key = getHashKey() ;
									replyWait[ key ] = acpt ;

									setTimeout( ()=>{
										// Already processed
										if( replyWait[key] == undefined ) return ;
										delete replyWait[key] ;
										replyWait[key] = undefined ;
										rjct({success:false,error:'Timeout'}) ;
									}, 30 * 1000 ) ; // timeout is 30 sec.

									socket.emit( procName , {key:key,value:argObj} ) ;
								} ) ;
							}
						} ) ;
					}) ;
					pluginInterface.registerProcedures( regProcs,client.suffix ) ;
				}) ;

				socket.on('procReply', re => {
					if( replyWait[re.key] != undefined ){
						replyWait[re.key](re.value) ;	// acpt()
					}
					delete replyWait[re.key] ;
					replyWait[re.key] = undefined ;
				}) ;

				socket.on('hello', msg => {
					//console.log('Hello recv:'+JSON.stringify(msg));
					if( msg.suffix != client.suffix ){
						socket.emit('error','Suffix does not match.');
						console.log('error','Suffix does not match.');
						socket.disconnect();
						return ;
					}


					socket.emit('welcome',{success:true});
				}) ;

			});

			socket.on('disconnect',function(){
				pluginInterface.unregisterDevice(client.deviceInfoArray[0]) ;
			}) ;


		} );
	} ) ;

} ;
