//////////////////////////////////////
// Load libraries
var autobahn , when ;
try {
   autobahn = require('autobahn');
   when = require('when');
} catch (e) {   // When running in browser, AutobahnJS will be included without a module system
   var when = autobahn.when;
}


function PluginInterface(realm,router_url,plugin_prefix){
	this.realm = realm ; this.router_url = router_url ; this.plugin_prefix = plugin_prefix ;
	this.log = function(msg){ console.log(this.plugin_prefix + ':'+msg); } ;
	this.devices = {} ;
}

PluginInterface.prototype.connectRouter = function(callbacks){
	var self = this ;
	self.connection = new autobahn.Connection({
		realm: self.realm
		,url: self.router_url
	});

	self.connection.onclose = function(){
		if(typeof callbacks.onclose == 'function' )
			callbacks.onclose.call(self) ;
		self.session = undefined ;
	} ;
	self.connection.onopen = function(session){
		self.session = session ;
		self.log('connection to '+self.router_url+' success.') ;
		self.session.call('com.sonycsl.kadecot.provider.procedure.registerplugin'
			,[self.session.id,self.plugin_prefix]) ;

		if( typeof callbacks.onopen == 'function' )
			callbacks.onopen.call(self) ;
	} ;
	self.connection.open() ;

	self.log('Plugin loaded.') ;
} ;

// Should be changed to return promise, rather than calling onreegisteredfunc callback..
PluginInterface.prototype.onDeviceFound = function(uuid,deviceType,description,nickname,onregisteredfunc){
	var self = this ;
	if( self.session == undefined ) return ;
	var d = {
		uuid:uuid
		, protocol:self.plugin_prefix.substring(self.plugin_prefix.lastIndexOf('.')+1)
		, deviceType:deviceType
		, description:description
		, nickname:nickname
	} ;
	self.devices[uuid] = d ;

	self.session.call('com.sonycsl.kadecot.provider.procedure.registerdevice'
			,[self.plugin_prefix],d).then(function(re){
				if( re.success == true ){
					self.devices[uuid].deviceId = re.deviceId;
					if( typeof onregisteredfunc == 'function' )
						onregisteredfunc.call(self) ;
				}
			}) ;
}

PluginInterface.prototype.onDeviceLost = function(uuid,onunregistered_func){
	var self = this ;
	if( self.session == undefined ) return ;
	self.session.call('com.sonycsl.kadecot.provider.procedure.unregisterdevice'
			,[uuid]).then(function(re){
				delete self.devices[uuid] ;
				self.devices[uuid] = undefined ;
				if( typeof onunregistered_func == 'function' )
					onunregistered_func.call(self);
			}) ;
}

// registerProcedures
// proclist is an array of the procedure definition object:
// Example of such object:
//{
//	name:'GeneralLighting.set' //=> the real name is connected to plugin prefix+'.procedure.'
//	,procedure:function(deviceIdArray, argObj){
//		// deviceIdArray is an array of devices. argObj is the parameter given by the procedure caller.
//		return {} ;
//	}
//}

PluginInterface.prototype.registerProcedures = function(proclist){
	var self = this ;
	var procedures = [] ;
	proclist.forEach(function(proc_info){
		procedures.push( self.session.register(self.plugin_prefix+'.procedure.'+proc_info.name, function(deviceIdArray,argObj){
			return {
				success:true
				,procedure:arguments[2].procedure
				,value:proc_info.procedure.call(self,deviceIdArray,argObj)
			} ;
		} ) ) ;
	}) ;
	return when.all(procedures);
} ;

PluginInterface.prototype.publish = function(topic,arg_array){
	var self = this ;
	if( self.session == undefined || !(arg_array instanceof Array)) return ;
	self.session.publish(self.plugin_prefix+'.procedure.'+topic, arg_array);
} ;

module.exports = PluginInterface ;
