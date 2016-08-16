var EL = require('echonet-lite');

function startDeviceSearch(){
	// Setup topics to publish
	EL.search();
}

//////////////////////////////////////
// ECHONET Lite Setup

var myEOJ = '05ff01';
var EOJs = {} ;

function convSpaceSplittedPhraseIntoWikiName(instr){
	var ret = '' ;
	instr.split(/[ \/-]/).forEach(function(wd){
		if( wd === 'class' ) return ;
		ret += wd.charAt(0).toUpperCase()+wd.substring(1) ;
	}) ;
	return ret ;
}
var fs = require('fs');
function setEOJDocs(eoj,onget_cb){
	var eoj_uc = eoj.substring(0,4).toUpperCase() ;

	var csvpath = 'v1/plugins/echonetlite/db/0x'+eoj_uc+'.csv' ;
	fs.stat(csvpath,function(err,stat){
		if( err == null ){
			var dblines = fs.readFileSync(csvpath).toString().split(/\r\n|\r|\n/) ;
			dblines.shift() ;
			var objName = convSpaceSplittedPhraseIntoWikiName( dblines[0].substring(0,dblines[0].indexOf(',')) ) ;

			while(dblines[0].substring(0,3) != 'EPC'){ dblines.shift(); }
			dblines.shift() ;

			var retobj = {
				protocol:'echonetlite'
				,deviceType:objName
				,epc:{}
			} ;

			while( dblines.length > 0 ){
				var l = dblines[0].trim() ;
				if( l.length == 0 ){
					dblines.shift();
					continue ;
				}
				var t = l.split(',') ;
				var epcName = convSpaceSplittedPhraseIntoWikiName(t[1]) ;
				retobj.epc[ epcName ] = t[0] + '=>'+t[t.length-4]+':'+t[t.length-3]+':'+t[t.length-2] ;
				dblines.shift();
			}

			onget_cb(retobj) ;
		} else {
			//console.log('File '+'0x'+eoj_uc+'.csv'+' does not exist..') ;
			onget_cb(null) ;
		}
	}) ;
}

var elsocket = EL.initialize( [myEOJ], function( rinfo, els ) {
	var tgtEOJ = ( els.SEOJ === myEOJ ? els.DEOJ : els.SEOJ ) ;

	var objkey = rinfo.address+':'+tgtEOJ ;
	if( EOJs[ objkey ] === undefined ){
		EOJs[ objkey ] = null ; // Just to suppress multiple call for EOJDocs
		var objDoc = setEOJDocs(tgtEOJ,function(objDoc){
			EOJs[ objkey ] = objDoc ;
			if( objDoc == null ){
				console.log('Document for '+tgtEOJ+' not found.') ;
				return ;
			}
			if( objDoc == undefined ) return ;

			onDeviceFound(objkey,'echonetlite',objDoc.deviceType,objDoc.deviceType,objDoc.deviceType+rinfo.address+'.'+tgtEOJ.substring(4)) ;
			//onDeviceFound('UUID_GENERAL','echonetlite','GeneralLighting','GeneralLighting','GeneralLighting1') ;
		}) ;
	}
/*
	console.log('==============================');
	console.log('Get ECHONET Lite data');
	console.log('rinfo is ');
	console.dir(rinfo);

	// elsはELDATA構造になっているので使いやすいかも
	// els is ELDATA stracture.
	console.log('----');
	console.log('els is ');
	console.dir(els);

	// ELDATAをArrayにする事で使いやすい人もいるかも
	// convert ELDATA into byte array.
	console.log('----');
	console.log( 'ECHONET Lite data array is ' );
	console.log( EL.ELDATA2Array( els ) );

	// 受信データをもとに，実は内部的にfacilitiesの中で管理している
	// this module manages facilities by receved packets.
	console.log('----');
	console.log( 'Found facilities are ' );
	console.dir( EL.facilities );
*/
});



//////////////////////////////////////
// Setup & utilities

var PLUGIN_PREFIX = 'com.sonycsl.kadecot.echonetlite' ;
function log(msg){ console.log('v1:echonetlite: '+msg); }

var devices = {} ;

function onDeviceFound(uuid,protocol,deviceType,description,nickname){
	if( session == undefined ) return ;
	var d = {
		uuid:uuid , protocol:protocol , deviceType:deviceType , description:description , nickname:nickname
	} ;
	devices[uuid] = d ;

	session.call('com.sonycsl.kadecot.provider.procedure.registerdevice'
			,[PLUGIN_PREFIX],d).then(function(re){
				if( re.success == true ){
					devices[uuid].deviceId = re.deviceId;
					// Register RPC procedures

				/*
				// register procedures
				var procedures = [{
					name:'GeneralLighting.set'
					,procedure:function(deviceIdArray, argObj){
						return {success:true,procedure:arguments[2].procedure} ;
					}
				}] ;

				procedures.filter(function(proc_info){
					return session.register(PLUGIN_PREFIX+'.procedure.'+proc_info.name, proc_info.procedure) ;
				}) ;

				when.all(procedures).then(
					function () {
						log("All procedures/topics registered.");
					},
					function () {
						log("Registration/Subscription failed!", arguments);
					}
				);
				*/


				}
			}) ;
}

function onDeviceLost(uuid){
	session.call('com.sonycsl.kadecot.provider.procedure.unregisterdevice'
			,[uuid]).then(function(re){
				delete devices[uuid] ;
				devices[uuid] = undefined ;
			}) ;
}

//////////////////////////////////////
// Load libraries
var autobahn , when ;
try {
   autobahn = require('autobahn');
   when = require('when');
} catch (e) {   // When running in browser, AutobahnJS will be included without a module system
   var when = autobahn.when;
}

var session ;

exports.init=function(REALM,ROUTER_URL){
	//////////////////////////////////////
	// Connect to Wamp router
	var connection = new autobahn.Connection({
		url: ROUTER_URL
		,realm: REALM
	});

	connection.onclose = function(){ session = undefined ; } ;
	connection.onopen = function(_session){
		session = _session ;
		log('connection to '+ROUTER_URL+' success.') ;
		session.call('com.sonycsl.kadecot.provider.procedure.registerplugin'
			,[session.id,PLUGIN_PREFIX]) ;


		startDeviceSearch() ;
	} ;
	connection.open() ;

	log('echonet lite plugin loaded') ;
};
