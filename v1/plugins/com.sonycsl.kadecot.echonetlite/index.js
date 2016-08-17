//////////////////////////////////////
// Exports

var pluginInterface;

exports.init = function(_pluginInterface) {
  pluginInterface = _pluginInterface;
  pluginInterface.connectRouter({
    onopen: function() {
      EL.search();
    },
    onclose: function() {}
  });
};


//////////////////////////////////////
// ECHONET Lite Setup
var EL = require('echonet-lite'); // https://www.npmjs.com/package/echonet-lite

var myEOJ = '05ff01';
var EOJs = {};

function convSpaceSplittedPhraseIntoWikiName(instr) {
  var ret = '';
  instr.split(/[ \/-]/).forEach(function(wd) {
    if (wd === 'class') return;
    ret += wd.charAt(0).toUpperCase() + wd.substring(1);
  });
  return ret;
}
var fs = require('fs');

function setEOJDocs(eoj, onget_cb) {
  var eoj_uc = eoj.substring(0, 4).toUpperCase();

  var csvpath = 'v1/plugins/echonetlite/db/0x' + eoj_uc + '.csv';
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

var elsocket = EL.initialize([myEOJ], function(rinfo, els) {
  var tgtEOJ = (els.SEOJ === myEOJ ? els.DEOJ : els.SEOJ);

  var objkey = rinfo.address + ':' + tgtEOJ;
  if (EOJs[objkey] === undefined) {
    EOJs[objkey] = null; // Just to suppress multiple call for EOJDocs
    var objDoc = setEOJDocs(tgtEOJ, function(objDoc) {
      EOJs[objkey] = objDoc;
      if (objDoc == null) {
        console.log('Document for ' + tgtEOJ + ' not found.');
        return;
      }
      if (objDoc == undefined) return;

      if (pluginInterface != undefined)
        pluginInterface.registerDevice(
          objkey, objDoc.deviceType, objDoc.deviceType, objDoc.deviceType + rinfo.address + '.' + tgtEOJ.substring(4)
        ).then((re) => {
          // register procedures here
        });
    });
  }
});
