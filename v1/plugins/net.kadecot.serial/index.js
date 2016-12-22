/*
 protocol: serial

 deviceType: serial, gpio

 serial device procedures:
  net.kadecot.serial.procedure.message( {value:'STRING TO SEND To DEVICE'} )

 serial device topics:
  net.kadecot.serial.topic.message


 Client protocol:
  1) First, send the unique id of the client by a plain text with postfix ';'
  2) Send/Receive arbitrary text message with the separator ';'

 If the client has GPIO and use the it only, we recommend to use
   'GPIO mode'. To switch into GPIO mode, the client should declare its gpio
   pin availability information after the name (without separator ';') as follows:
   DEVICE_ID/in:1,3,4,5/out:1,2;			(DEVIE_ID is the unique id of the device)
   which means
    there are four input pins: 1,3,4,5
    there are two output pins: 1,2

 In GPIO mode, the following procedures / topics are additionally supported

 Procedures:

  net.kadecot.serial.procedure.gpiopins
  	returns a JSON object as follows
  	{
		"in":[1,3,4,5]
		,"out":[1,2]
  	}

  net.kadecot.serial.procedure.set( {"pin":PINNUMBER , "value":VALUE_IN_FLOARING_POINT} )
  	PINNUMBER : an integer digit that should be one of output pins
	VALUE_IN_FLOARING_POINT : a floating point number (0 to 1)

  net.kadecot.serial.procedure.get( {"pin":PINNUMBER} )
  	PINNUMBER : an integer digit that should be one of input pins
  	this procedure returns current value of the specified pin.

Topics
  net.kadecot.serial.topic.in
  	PINNUMBER : an integer digit that should be one of input pins
  	if the value is changed, the new value may be automatically published.
  	(Not always, depending on the client's implementation)
*/

var serialport = require('serialport');
var fs = require('fs');

const SEP = ';' ;

var crypto = require("crypto");
function getHashKey(){ return crypto.randomBytes(20).toString('hex'); }

var pluginInterface ;
var connections = {
} ;


function init(portname){
	var id ;

	var waitlist = {} ;
	var sp ;
		try {
			sp = new serialport(portname, {
		    baudRate: 9600,
		    /*dataBits: 8,
		    parity: 'none',
		    stopBits: 1,
		    flowControl: false,*/
		    parser: serialport.parsers.readline(SEP)
		});
	} catch( e => {console.error(e); return ;})

	function sendToDevice(txt){
		return new Promise((ac,rj)=>{
			sp.write(txt+';',err=>{
				if( err )	rj(err) ;
				else		ac() ;
			});
		}) ;
	}

	sp.on('open', function() {
		var initkey = getHashKey() ;
		waitlist[initkey] = function(re){
			console.log('init Recv:'+re) ;
		} ;

		sendToDevice('init:'+initkey);
	});

	sp.on('data', function(input) {

		if( input.indexOf('oninit:')==0 ){
			input = input.substring( 'oninit:'.length ).split('/') ;
			id = input.shift() ;

			var conn = {
				id : id
				, isgpio : false
				, in : []
				, out : []
				, send : sendToDevice
				, onrecv : console.log
				, gpioget_waitlist : {}
			} ;

			if( connections[conn.id] != undefined ){
				log('Same device already registered:'+conn.id) ;
				return ;
			}

			input.forEach( eq => {
				eq = eq.split(':') ;
				switch(eq[0]){
				case 'in':
				case 'out':
					conn[eq[0]] = eq[1].split(',') ;
					conn[eq[0]].map(term=>{return parseInt(term);})
					break ;
				case 'mode' :
					conn.isgpio = (eq[1]=='gpio') ;
					break ;
				}
			}) ;

			connections[conn.id] = conn ;
			// uuid, deviceType, description, nickname
			pluginInterface.registerDevice( conn.id , (conn.isgpio?'gpio':'serial')
				, 'Serial connection of '+conn.id , conn.id ).then(re=>{
				console.log('Device registartion success:'+conn.id+':serial');
			}).catch( e=>{
				console.error('Device registartion error:'+JSON.stringify(e));
			}) ;
		} else {
			var conn = connections[id] ;
			if( conn.isgpio ){
				var msg_sp = input.trim().split(':') ;

				switch(msg_sp[0]){
				case 'rep' :
					if( typeof conn.gpioget_waitlist[msg_sp[2]] == 'function' ){
						conn.gpioget_waitlist[msg_sp[2]]( {value:parseFloat(msg_sp[1])} ) ;
						delete conn.gpioget_waitlist[msg_sp[2]] ;
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
			pluginInterface.publish( 'message',[id],{value:input} ) ;
		}
	});

}

exports.init = function() {
	pluginInterface = this ;

	var portnames = fs.readFileSync( 'v1/plugins/net.kadecot.serial/ports.txt' , 'utf-8' ) ;
	portnames = portnames.split("\n") ;

	portnames.forEach( portname => {
		console.log('Candidate:'+portname) ;
		var portname = portname.trim() ;
		if( portname.length==0 ) return ;
		init(portname) ;
	})


	pluginInterface.registerProcedures( [
		{
			name : 'message'
			,procedure : (uuidArray , argObj) => {
				uuidArray.forEach( uuid => {
					var conn = connections[uuid] ;
					if( conn == undefined )	return {success:false,error:uuid+' not found.'};

					conn.send( argObj.value ) ;
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

				conn.send( 'set:'+argObj.pin+':'+argObj.value ) ;

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
					conn.send( 'get:'+argObj.pin+':'+key ) ;
					conn.gpioget_waitlist[key] = acpt ;
				} ) ;
			}
		}
	] ) ;
} ;
