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

				var CALLBACKS = {
					'hello' : (key,args) => {
						//console.log('Hello recv:'+JSON.stringify(args));
						if( args.suffix != client.suffix ){
							socket.emit('callreply',{key:key,args:{success:false,error:'Suffix does not match.'}}) ;
							socket.disconnect();
							return ;
						}

						socket.emit('callreply',{key:key,args:{success:true , id:client.id_for_client , token:client.token}}) ;
					}
					,'registerProcedures' : (key,procArray) => {
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

										socket.emit( 'call' , {key:key,proc:procName,args:argObj} ) ;
									} ) ;
								}
							} ) ;
						}) ;

						pluginInterface.registerProcedures( regProcs,client.suffix ) ;
						socket.emit('callreply',{key:key,args:{success:true}}) ;
					}
					,'callreply' : (key,re) =>{
						if( replyWait[re.key] != undefined ){
							replyWait[re.key](re.args) ;	// acpt()
						}
						delete replyWait[re.key] ;
						replyWait[re.key] = undefined ;
						socket.emit('callreply',{key:key,args:{success:true}}) ;
					}
				} ;

				socket.on('call',callargs =>{
					if( CALLBACKS[callargs.proc] != undefined )
						CALLBACKS[callargs.proc](callargs.key,callargs.args) ;
					else
						socket.emit('callreply',{key:key,args:{success:false,error:'No such procedure ('+callargs.proc}}) ;
				} ) ;

			});

			socket.on('disconnect',function(){
				pluginInterface.unregisterDevice(client.deviceInfoArray[0]) ;
			}) ;


		} );
	} ) ;

} ;
