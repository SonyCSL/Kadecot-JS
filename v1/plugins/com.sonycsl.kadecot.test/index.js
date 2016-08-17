//////////////////////////////////////
// Exports

var pluginInterface ;

exports.init=function(_pluginInterface){
	pluginInterface = _pluginInterface ;
	pluginInterface.connectRouter({
		onopen:onDeviceSearch
		,onclose:function(){}
	}) ;
};

function onDeviceSearch(){
	// uuid,deviceType,description,nickname,onregisteredfunc
	pluginInterface.onDeviceFound('TestObject','TestObject','Only one test object','TestObject',function(){
		pluginInterface.registerProcedures([
			{
				name:'TestProcedure'
				,procedure:function(deviceIdArray, argObj){
					log('proc TestProcedure call:'+JSON.stringify(arguments)) ;
					return {'message':'Nothing happened.'} ;
				}
			}
		]) ;
	}) ;
}
