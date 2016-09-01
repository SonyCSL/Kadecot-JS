//////////////////////////////////////
// Exports

var pluginInterface;

exports.init = function(_pluginInterface) {
  pluginInterface = _pluginInterface;
  pluginInterface.connectRouter({
	onopen: function() {

		EL.init((err) => {
			if(err) { // An error was occurred
				pluginInterface.log('Init error:'+JSON.stringify(err)) ;
			} else {
				pluginInterface.log('Start discovery.') ;

				EL.startDiscovery((err, res) => {
					if(err) { // Error handling
						console.log(err);
					} else {
						onELDeviceFound(res) ;
					}
				});

				EL.on('data', (res) => {
					if( res.message.esv !== 'INF' )	return ;

					registerELDevice(res.device.address , res.message.seoj).then(function(re){
						var dev = re.result ;
						if( !dev || dev.doc == null ) return ;
						var epcs = dev.doc.epc ;
						for( var propertyName in epcs ){
							if( epcs[propertyName].value != res.message.prop[0].epc ) continue ;
							var pv ;
							if( res.message.prop[0].buffer == null ) pv = null ;
							else {
								pv = [] ;
								var i8a = new Int8Array(res.message.prop[0].buffer) ;
								for( var ii=0 ; ii<i8a.length ; ++ii )	pv.push(i8a[ii]) ;
							}

							pluginInterface.publish( dev.deviceType+'.'+propertyName,[dev.deviceId]
								,{propertyName:propertyName,propertyValue:pv} ) ;
						}
					}) ;
				});
			}
		});
	},
	onclose: function() {
		if( EL == undefined ) return ;
		EL.stopDiscovery();
	}
  });
};


//////////////////////////////////////
// ECHONET Lite Setup

var EchonetLite = require('node-echonet-lite'); // https://www.npmjs.com/package/node-echonet-lite
var EL  = new EchonetLite({'type':'lan'}) ;

var EOJs = {};
var objDocs = {} ; // eoj_hex => objDoc map

function getEOJHexFromEOJArray( eojArray ){
	var ret = eojArray[1].toString(16); // Class code
	while( ret.length<2 ) ret = '0' + ret ;
	ret = eojArray[0].toString(16)+ret; // Class group code
	while( ret.length<4 ) ret = '0' + ret ;
	return ret.toUpperCase() ;
}

var addrToMakerCodeColonUUIDMap = {} ;

function getObjKey(address,eoj_hex){
	var ehl = eoj_hex.toLowerCase() ;
	return new Promise((rslv,rjct) => {
		// まだUUIDを問い合わせたことがない、新しいノードかもしれない
		if( addrToMakerCodeColonUUIDMap[address] == undefined ){
			EL.getPropertyValue( address , [0x0e,0xf0,0x01] , 0x83 , (err,res) => {
				var i8a = new Int8Array(res.message.prop[0].buffer ) ;
				i8a = Array.prototype.map.call(i8a, (en) => (en<0?256+en:en) ) ;

				var uuid = 'el'+(i8a[1]*0xffff+i8a[2]*0xff+i8a[3])+':0:' ;
				i8a.forEach((en)=>{uuid += ('0'+en.toString(16)).slice(-2);}) ;

				addrToMakerCodeColonUUIDMap[address] = uuid ;
				rslv( 'el'+ehl.substring(0,2)+':'+ehl.substring(2,4)+':'+addrToMakerCodeColonUUIDMap[address] ) ;
			}) ;


		} else rslv( 'el'+ehl.substring(0,2)+':'+ehl.substring(2,4)+':'+addrToMakerCodeColonUUIDMap[address] ) ;
	}) ;
}

function registerELDevice( address,eojArray ){

	return new Promise((acpt,rjct) => {

	var eoj_hex = getEOJHexFromEOJArray(eojArray) ;

	getObjKey(address,eoj_hex).then((objkey)=>{
		if( EOJs[objkey] !== undefined ){ acpt({success:true,result:EOJs[objkey]}); return ; } // previously found device

		//pluginInterface.log('New EOJ found:0x'+eoj_hex) ;

		var dev = {
			uuid:objkey
			,eoj:eojArray
			,deviceType:eoj_hex
			,description:'Unknown device'
			,nickname:'Unknown@' + address + '/0x' + eoj_hex
			,address:address
		} ;
		EOJs[objkey] = dev ;	// Temporal object is set.

		function onObjDocFound(objDoc){
			// Replace some properties.
			dev.deviceType = objDoc.deviceType ;
			dev.description = objDoc.deviceType ;
			dev.nickname = objDoc.deviceType + '@' + address + '/0x' + eoj_hex ;
			dev.doc = objDoc ;
		}
		function registerDevice(){
			if(pluginInterface != undefined){
				pluginInterface.registerDevice( dev.uuid,dev.deviceType,dev.description,dev.nickname)
					.then((re) => {
						dev.deviceId = re.deviceId;
						//pluginInterface.log('Device '+eoj_hex+' ('+dev.deviceType+') registered.') ;
						acpt({success:true,result:dev}) ;
					} ).catch(function(err){
						acpt({success:false,reason:err}) ;
					}) ;
			} else {
				acpt({success:true,result:dev}) ;
			}
		}

		// Potential bug: What if second devices with same eoj_hex found before objDoc is read?
		if( objDocs[eoj_hex] === null ){		// not found
			registerDevice() ;
			return ;
		} else if( objDocs[eoj_hex] !== undefined ){	// already exists
			onObjDocFound( objDocs[eoj_hex] ) ;
		} else {					// search from now
			objDocs[eoj_hex] = null ;
			setEOJDocs(eoj_hex, function(objDoc) {
				if (objDoc == null) {
					console.log('Document for ' + eoj_hex + ' not found.');
					return;
				}

				function genProcResult(bSet,deviceArray,argObj){
					return new Promise(function(acept2,rjct2){
						if( deviceArray.length == 0 ){
							rjct2('Device array cannot be empty') ;
						} else {
							if( deviceArray.length>1 )
								console.log('two or more device ids cannot be accepted') ;
							var devid = deviceArray[0] ;

							for( var objkey in EOJs ){
								var dev = EOJs[objkey] ;
								if( dev.deviceId != devid ) continue ;
								var args = [
									dev.address,dev.eoj,dev.doc.epc[argObj.propertyName].value
									,(err,res)=>{
										if( err )	rjct2(res) ;
										else {
											var pv ;
											if( res.message.prop[0].buffer == null ) pv = argObj.propertyValue ;
											else {
												pv = [] ;
												var i8a = new Int8Array(res.message.prop[0].buffer) ;
												for( var ii=0 ; ii<i8a.length ; ++ii )	pv.push(i8a[ii]) ;
											}

											acept2({
												propertyName:argObj.propertyName
												,propertyValue:pv
												,digest:res.message.prop[0].edt
											}) ;
										}
									}
								] ;
								if( bSet )	EL.setPropertyValue(args[0],args[1],args[2],(new Buffer(argObj.propertyValue)),args[3]) ;
								else		EL.getPropertyValue(args[0],args[1],args[2],args[3]) ;
								return ;
							} ;
							rjct2( 'No device found for deviceId='+devid ) ;
						}
					}) ;
				}

				var procs = [
					{
						name:objDoc.deviceType + '.set'
						,procedure: (deviceArray,argObj) => {
							return genProcResult(true,deviceArray,argObj) ;
						}
					}
					,{
						name:objDoc.deviceType + '.get'
						,procedure: (deviceArray,argObj) => {
							return genProcResult(false,deviceArray,argObj) ;
						}
					}
				] ;
				pluginInterface.registerProcedures(procs) ;

				objDocs[eoj_hex] = objDoc ;
				onObjDocFound( objDoc ) ;
				registerDevice() ;
			}) ;
		}
		}) ;
	}) ;
}

function onELDeviceFound(res,callback){
	var device = res.device;
	var address = device.address

	// 最初の問い合わせで返答したもの（はじめてに決まっているのでUUIDを求めてから登録）
	EL.getPropertyValue( address , [0x0e,0xf0,0x01] , 0x83 , (err,res) => {
		var i8a = new Int8Array(res.message.prop[0].buffer ) ;
		i8a = Array.prototype.map.call(i8a, (en) => (en<0?256+en:en) ) ;

		var uuid = 'el'+(i8a[1]*0xffff+i8a[2]*0xff+i8a[3])+':0:' ;
		i8a.forEach((en)=>{uuid += ('0'+en.toString(16)).slice(-2);}) ;

		addrToMakerCodeColonUUIDMap[address] = uuid ;

		var ps = [] ;
		for( var ei=0;ei<device.eoj.length;++ei )
			ps.push(registerELDevice( address,device.eoj[ei] ) ) ;

		Promise.all(ps).then(callback).catch(callback);
	}) ;
}

var fs = require('fs');

function setEOJDocs(eoj_hex, onget_cb) {
  var csvpath = 'v1/plugins/'+pluginInterface.pluginPrefix+'/db/0x' + eoj_hex + '.csv';
  fs.stat(csvpath, function(err, stat) {
    if (err == null) {
      var dblines = fs.readFileSync(csvpath).toString().split(/\r\n|\r|\n/);
      dblines.shift();
      var objName = convSpaceSplittedPhraseIntoWikiName(dblines[0].substring(0, dblines[0].indexOf(',')));

      while (dblines[0].substring(0, 3) != 'EPC') {
        dblines.shift();
      }
      dblines.shift();

      var retobj = {
        protocol: 'echonetlite',
        deviceType: objName,
        epc: {}
      };

      function isMandatory(checkStr){
	if( checkStr == '-' )			return undefined ;
	else if( checkStr == 'mandatory' )	return true ;
	else if( checkStr == 'optional' )	return false ;
	return undefined ; // others
      }

      while (dblines.length > 0) {
        var l = dblines[0].trim();
        if (l.length == 0) {
          dblines.shift();
          continue;
        }
        var t = l.split(',');
        var epcName = convSpaceSplittedPhraseIntoWikiName(t[1]);
        retobj.epc[epcName] = {
		'value':parseInt(t[0])
		,'hexstr':t[0]
		,'set':isMandatory(t[t.length - 4])
		,'get':isMandatory(t[t.length - 3])
		,'announce':isMandatory(t[t.length - 2])
	};
        dblines.shift();
      }

      onget_cb(retobj);
    } else {
      console.log('File '+'0x'+eoj_hex+'.csv'+' does not exist..') ;
      onget_cb(null);
    }
  });
}

function convSpaceSplittedPhraseIntoWikiName(instr) {
  var ret = '';
  instr = instr.split(/["“”]/).join() ;
  instr = instr.split(/[\(\)]/).join(' ') ;
  instr.split(/[ \/-]/).forEach(function(wd) {
    if (wd === 'class') return;
    ret += wd.charAt(0).toUpperCase() + wd.substring(1);
  });
  return ret;
}
