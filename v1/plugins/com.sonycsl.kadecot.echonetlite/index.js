//////////////////////////////////////
// Exports

var pluginInterface;

exports.init = function(_pluginInterface) {
  pluginInterface = _pluginInterface;
  var EL ;
  pluginInterface.connectRouter({
	onopen: function() {
		EL = new EchonetLite({'type':'lan'}) ;

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

var EOJs = {};
var objDocs = {} ; // eoj_hex => objDoc map

function onELDeviceFound(res){
	var device = res.device;
	var address = device.address;
	for( var eoj_id in device.eoj){
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
				var procs = [
					{
						name:objDoc.deviceType + '.set'
						,procedure: (deviceArray,argObj) => {
							pluginInterface.log('proc ECHONET.set call deviceArray:' + JSON.stringify(deviceArray));
							pluginInterface.log('proc ECHONET.set call argObj:' + JSON.stringify(argObj));
							deviceArray.forEach(function(devid){
								for( var objkey in EOJs ){
									var dev = EOJs[objkey] ;
									if( dev.deviceId != devid ) continue ;
									EL.setPropertyValue(
										dev.address
										,dev.eoj
										,dev.doc.epc[argObj.propertyName].value
										,argObj.propertyValue
										,function(re){}
									) ;
									break ;
								} ;
							}) ;
							return {
								'message': 'Set msg'
							};
						}
					}
					,{
						name:objDoc.deviceType + '.get'
						,procedure: (deviceArray,argObj) => {
							pluginInterface.log('proc ECHONET.get call deviceArray:' + JSON.stringify(deviceArray));
							pluginInterface.log('proc ECHONET.get call argObj:' + JSON.stringify(argObj));

							deviceArray.forEach(function(devid){
								for( var objkey in EOJs ){
									var dev = EOJs[objkey] ;
									if( dev.deviceId != devid ) continue ;
									EL.getPropertyValue(
										dev.address
										,dev.eoj
										,dev.doc.epc[argObj.propertyName].value
										,function(re){}
									) ;
									break ;
								} ;
							}) ;


							return {
								'message': 'Get msg'
							};
						}
					}
				] ;
				pluginInterface.registerProcedures(procs) ;

				objDocs[eoj_hex] = objDoc ;
				onObjDocFound( objDoc ) ;
			}) ;
		}

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
