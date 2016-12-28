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
		var subscriptions = {} , subsessions = {} ;

		// device_info_array:[uuid,deviceType,description,nickname]
		pluginInterface.registerDevice.apply(pluginInterface,client.device_info_array).then( re => {	// Nothing returned
			log('Device registration result:'+JSON.stringify(re)) ;

			var WebSocketClient = require('websocket').client;
			var clsock = new WebSocketClient();

			clsock.on('connect', function(conn) {
				var replyWait = {} ;

				var CALLBACKS = {
					'hello' : (args,acpt,rjct) => {
						//console.log('Hello recv:'+JSON.stringify(args));
						if( args.suffix != client.suffix ){
							rjct('Suffix does not match.') ;
							conn.close() ;
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

										conn.sendUTF( JSON.stringify(
											{proc:precName,key:key,arg:argObj}
											//{proc:'call',arg:{key:key,proc:procName,args:argObj}}
										) ) ;
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
							conn.sendUTF(JSON.stringify(
								{proc:'published',arg:[sessionid,topic,rargs, rkwargs, rdetails]}
							)) ;
						} ,options ).then( function(subscription){
							var subs_id ;
							do{ 
								subs_id = getHashKey();
							} while ( subscriptions[subs_id]!=undefined ) ;
							subscriptions[subs_id] = {subscription:subscription,sessionid:sessionid} ;
							if( subsessions[sessionid] == undefined )
								subsessions[sessionid] = {} ;
							subsessions[sessionid][subs_id] = subscription ;
							console.log('ReqPub : Subscribe success:' /*+JSON.stringify(r)*/) ;
							acpt(subs_id);
						}).catch( function(e){
							console.log('ReqPub : Subscribe unsuccessful:' /*+JSON.stringify(e)*/) ;
							rjct(e);
						}) ;
					}
					// args : [subscription]
					,'unreqpub' : (args,acpt,rjct) =>{
						// just unsubscribe the topic and return success ack by acpt()
						var subs_id = args[0] ;
						var subinfo = subscriptions[subs_id] ;
						if( subinfo == undefined ){
							rjct('Subscription id does not exist.') ;
							return ;
						}
						delete subscriptions[subs_id] ;
						delete subsessions[subinfo.sessionid][subs_id] ;

						wamp_session.unsubscribe(subinfo.subscription).then(acpt).catch(rjct) ;
					}
					,'unreqpuball' : (args,acpt,rjct) =>{
						// just unsubscribe the topic and return success ack by acpt()
						var session_id = args[0] ;
						var ss = subsessions[session_id] ;
						if( ss == undefined ){	acpt() ; return ; }
						delete subsessions[session_id] ;

						var promises = [] ;
						for( var subs_id in ss ){
							promises.push(new Promise((ac,rj)=>{
								delete subscriptions[subs_id] ;
								wamp_session.unsubscribe(ss[subs_id]).then(ac).catch(rj) ;
							})) ;
						}

						Promise.all(promises).then(acpt).catch(rjct) ;
					}
				} ;

				conn.on('message',msg =>{
					if( msg.type !== 'utf8' ) return ;

					var callargs = JSON.parse(msg.utf8Data) ;

					if( CALLBACKS[callargs.proc] != undefined ){
						CALLBACKS[callargs.proc](
							callargs.arg
							, rep =>{ conn.sendUTF(JSON.stringify({proc:'callreply',key:callargs.key,arg:rep})); }
							, e =>	{ conn.sendUTF(JSON.stringify({proc:'callreply',key:callargs.key,arg:{success:false,error:e}}));}
						)
					} else
						conn.sendUTF(JSON.stringify(
							{proc:'callreply',key:callargs.key,arg:{success:false,error:'No such procedure ('+callargs.proc+')'}}
						)) ;
				} ) ;

				conn.on('close',function(){
					pluginInterface.unregisterDevice(client.device_info_array[0]) ;
					if( wamp_session == undefined ) return ;

					var unsubPromises = [] ;
					for( var subs_id in subscriptions ){
						unsubPromises.push( new Promise((ac,rj)=>{
							// console.log('Unsubscribing '+subs_id) ;
							wamp_session.unsubscribe(subscriptions[subs_id]).then(ac).catch(rj) ;
						}) ) ;
					}
					Promise.all(unsubPromises).then( ()=>{
						console.log('Successfully unsubscribed all topics.') ;
						subscriptions = {} ;
						wamp_connection.close() ;
					} ) ;
				}) ;
			});

			clsock.connect(client.host ,null) ;
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
