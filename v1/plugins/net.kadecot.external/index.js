//////////////////////////////////////
// Exports
var pluginInterface ;
var crypto = require("crypto");
var fs = require('fs');
var autobahn = require('autobahn');
const LOCAL_ROUTER_URL = 'ws://localhost:41314/ws' ;

var clients = fs.readFileSync( 'v1/plugins/net.kadecot.external/clients.json' , 'utf-8' ) ;
clients = JSON.parse(clients) ;

function getHashKey(){ return crypto.randomBytes(20).toString('hex'); }

exports.init = function() {
	pluginInterface = this ;
	log = pluginInterface.log ;

	clients.forEach( client => {
		var wamp_session , wamp_connection;

		// deviceInfoArray:[uuid,deviceType,description,nickname]
		pluginInterface.registerDevice.apply(pluginInterface,client.deviceInfoArray).then( re => {	// Nothing returned
			log('Device registration result:'+JSON.stringify(re)) ;

			var clsock = require('socket.io-client');
			var socket = clsock.connect(client.host);
			socket.on('connect',function(){
				var replyWait = {} ;

				var CALLBACKS = {
					'hello' : (args,acpt,rjct) => {
						//console.log('Hello recv:'+JSON.stringify(args));
						if( args.suffix != client.suffix ){
							rjct('Suffix does not match.') ;
							socket.disconnect();
							return ;
						}

						acpt({success:true , id:client.id_for_client , token:client.token}) ;
					}
					,'registerProcedures' : (procArray,acpt,rjct) => {
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
											//replyWait[key] = undefined ;
											rjct({success:false,error:'Timeout'}) ;
										}, 30 * 1000 ) ; // timeout is 30 sec.

										socket.emit( 'call' , {key:key,proc:procName,args:argObj} ) ;
									} ) ;
								}
							} ) ;
						}) ;

						pluginInterface.registerProcedures( regProcs,client.suffix ) ;
						acpt({success:true}) ;
					}
					,'callreply' : (re,acpt,rjct) =>{
						if( replyWait[re.key] != undefined ){
							replyWait[re.key](re.args) ;	// acpt()
						}
						delete replyWait[re.key] ;
						//replyWait[re.key] = undefined ;
						acpt({success:true}) ;
					}
					// args : [procedure, args, kwargs, options]
					,'rpc' : (args,acpt,rjct) =>{
						if( wamp_session == undefined ){
							rjct('rpc:local wamp session was not opened yet.') ;
							return ;
						}

						wamp_session.call(args[0],args[1],args[2],args[3]).then(acpt).catch(rjct) ;

						// return rpc result as acpt
					}
					// args : [topic,options,sessionid]  / Client must subscribe to extended topic homeid.[desired topic]
					//        and then call reqpub (otherwise client does not publish)
					,'reqpub' : (args,acpt,rjct) =>{
						// return success ack and subscribe to the topic.
						// if published, send result back to cloud and publish with home id
						var topic = args[0] , options = args[1] , sessionid = args[2] ;

						if( wamp_session == undefined ){
							rjct('reqpub:local wamp session was not opened yet.') ;
							return ;
						}

						// Subscription is usually successful, but moves to catch clause..
						wamp_session.subscribe( topic, (rargs, rkwargs, rdetails) =>{
							socket.emit('published',[sessionid,topic,rargs, rkwargs, rdetails]) ;
						} ,options ).then( acpt ).catch( rjct ) ;
					}
					// args : [subscription]
					,'unreqpub' : (args,acpt,rjct) =>{
						// just unsubscribe the topic and return success ack by acpt()
						var subscription = args[0] ;
						if( subscription == undefined ){
							rjct('Subscription id is not supplied.') ;
							return ;
						}
						wamp_session.unsubscribe(subscription).then(acpt).catch(rjct) ;
					}
				} ;

				socket.on('call',callargs =>{
					if( CALLBACKS[callargs.proc] != undefined ){
						CALLBACKS[callargs.proc](
							callargs.args
							, rep => {socket.emit('callreply',{key:callargs.key,args:rep}) ;}
							, e => {socket.emit('callreply',{key:callargs.key,args:{success:false,error:e}}) ;}
						)
					} else
						socket.emit('callreply',{key:key,args:{success:false,error:'No such procedure ('+callargs.proc}}) ;
				} ) ;

			});

			socket.on('disconnect',function(){
				pluginInterface.unregisterDevice(client.deviceInfoArray[0]) ;
				if( wamp_session == undefined ) return ;

				wamp_connection.close() ;
			}) ;
		} );

		// Without realm, remote access is disabled.
		if( typeof client.realm == 'string' ){
			// Log in to local wamp router
			var USERDB = fs.readFileSync( 'users.json' , 'utf-8' ) ;
			USERDB = JSON.parse(USERDB) ;

			var login_user ;

			for( var username in USERDB ){
				if( USERDB[username].realm == client.realm ){
					login_user = username ;
					break ;
				}
			}

			if( login_user == undefined )	return ;

			wamp_connection = new autobahn.Connection({
				url: LOCAL_ROUTER_URL
				,realm: 'v1' //client.realm
				,authmethods: ["wampcra"]
				,authid: login_user
				,onchallenge: (session, method, extra) => {
					//log("authenticating via '" + method + "' and challenge '" + extra.challenge + "'");
					if (method === "wampcra") {
						//log('Connecting '+login_user+' / '+USERDB[login_user].secret) ;
						return autobahn.auth_cra.sign(USERDB[login_user].secret, extra.challenge);
					} else {
						throw "don't know how to authenticate using '" + method + "'";
					}
			        }
			});

			wamp_connection.onopen = function (session) {
				wamp_session = session ;
				log('External object '+client.suffix+' was connected to WAMP router.');
			};
			wamp_connection.onclose = function (session) { wamp_session = undefined ; } ;
			wamp_connection.open();
		}

	} ) ;

} ;
