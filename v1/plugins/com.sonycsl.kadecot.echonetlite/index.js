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
					//console.log('[RECEIVE] ---------------------------------------');
					//console.log(JSON.stringify(res['message'], null, '  '));
					//console.log('---------------------------------------');
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

function onELDeviceFound(res){
	var device = res.device;
	var address = device.address;
	for( var ei=0;ei<device.eoj.length;++ei ){
		(function(){
			var eoj_id = ei ;
			var eoj = device.eoj[eoj_id];

			var eojstr = eoj[1].toString(16); // Class code
			while( eojstr.length<2 ) eojstr = '0'+eojstr ;
			eojstr = eoj[0].toString(16)+eojstr; // Class group code
			while( eojstr.length<4 ) eojstr = '0'+eojstr ;

			var eoj_hex = eojstr.toUpperCase() ;

			pluginInterface.log('EOJ found:0x'+eoj_hex) ;

			var objkey = address + ':' + eoj_hex;
			if( EOJs[objkey] !== undefined ){ return ; } // previously found device

			function onObjDocFound(objDoc){
				var dev = {
					uuid:objkey
					,eoj:device.eoj[eoj_id]
					,deviceType:objDoc.deviceType
					,description:objDoc.deviceType
					,nickname:objDoc.deviceType + '@' + address + '/0x' + eoj_hex
					,address:address
					,doc:objDoc
				} ;
				EOJs[objkey] = dev ;
				if(pluginInterface != undefined)
					pluginInterface.registerDevice( dev.uuid,dev.deviceType,dev.description,dev.nickname)
						.then((re) => {
							dev.deviceId = re.deviceId;
							//pluginInterface.log('Device '+eoj_hex+' ('+dev.deviceType+') registered.') ;
						}) ;
			}

			// Potential bug: What if second devices with same eoj_hex found before objDoc is read?
			if( objDocs[eoj_hex] === null ){		// not found
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
						return new Promise(function(acept,rjct){
							if( deviceArray.length == 0 ){
								rjct('Device array cannot be empty') ;
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
											if( err )	rjct(res) ;
											else {
												var pv ;
												if( res.message.prop[0].buffer == null ) pv = argObj.propertyValue ;
												else {
													pv = [] ;
													var i8a = new Int8Array(res.message.prop[0].buffer) ;
													for( var ii=0 ; ii<i8a.length ; ++ii )	pv.push(i8a[ii]) ;
												}

												acept({
													propertyName:argObj.propertyName
													,propertyValue:pv
												}) ;
											}
										}
									] ;
									if( bSet )	EL.setPropertyValue(args[0],args[1],args[2],(new Buffer(argObj.propertyValue)),args[3]) ;
									else		EL.getPropertyValue(args[0],args[1],args[2],args[3]) ;
									return ;
								} ;
								rjct( 'No device found for deviceId='+devid ) ;
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
				}) ;
			}
		})() ;

	}
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
      //console.log('File '+'0x'+eoj_hex+'.csv'+' does not exist..') ;
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
