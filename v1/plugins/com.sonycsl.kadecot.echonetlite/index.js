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
				console.log('EL init error:'+JSON.stringify(err)) ;
			} else {
				console.log('EL start discovery.') ;

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

function onELDeviceFound(res){
	var device = res['device'];
	var address = device['address'];
	var eoj = device['eoj'][0];
	var eojstr = eoj[1].toString(16); // Class code
	while( eojstr.length<2 ) eojstr = '0'+eojstr ;
	eojstr = eoj[0].toString(16)+eojstr; // Class group code
	while( eojstr.length<4 ) eojstr = '0'+eojstr ;

	var eoj_uc = eojstr.toUpperCase() ;

	console.log('EOJ found:'+eoj_uc) ;

	var objkey = address + ':' + eoj_uc;
	if (EOJs[objkey] === undefined) {
		EOJs[objkey] = null; // Just to suppress multiple call for EOJDocs
		setEOJDocs(eoj_uc, function(objDoc) {
			EOJs[objkey] = objDoc;
			if (objDoc == null) {
				console.log('Document for ' + eoj_uc + ' not found.');
				return;
			}
			if (objDoc == undefined) return;

			if(pluginInterface != undefined){
				pluginInterface.registerDevice(
					objkey, objDoc.deviceType, objDoc.deviceType, objDoc.deviceType + '@' + address + '/0x' + eoj_uc
		        	).then((re) => {
					// register procedures here
				});
			}
		});
	}
}

var fs = require('fs');

function setEOJDocs(eoj_uc, onget_cb) {
  var csvpath = 'v1/plugins/'+pluginInterface.pluginPrefix+'/db/0x' + eoj_uc + '.csv';
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

      while (dblines.length > 0) {
        var l = dblines[0].trim();
        if (l.length == 0) {
          dblines.shift();
          continue;
        }
        var t = l.split(',');
        var epcName = convSpaceSplittedPhraseIntoWikiName(t[1]);
        retobj.epc[epcName] = t[0] + '=>' + t[t.length - 4] + ':' + t[t.length - 3] + ':' + t[t.length - 2];
        dblines.shift();
      }

      onget_cb(retobj);
    } else {
      //console.log('File '+'0x'+eoj_uc+'.csv'+' does not exist..') ;
      onget_cb(null);
    }
  });
}

function convSpaceSplittedPhraseIntoWikiName(instr) {
  var ret = '';
  instr.split(/[ \/-]/).forEach(function(wd) {
    if (wd === 'class') return;
    ret += wd.charAt(0).toUpperCase() + wd.substring(1);
  });
  return ret;
}
