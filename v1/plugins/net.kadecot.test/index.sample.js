//////////////////////////////////////
// Exports

var pluginInterface ;

exports.init = function() {
    pluginInterface = this ;

    // uuid,deviceType,description,nickname,onregisteredfunc
    pluginInterface.registerDevice(
    	'TestObject', 'TestObject', 'Only one test object', 'TestObject')
      .then( re => {	// Nothing returned
      	// re is a map of sessionid => deviceId
      	pluginInterface.log('Device registration result:'+JSON.stringify(re)) ;

        pluginInterface.registerProcedures([{
          name: 'TestProcedure',
          procedure: (uuidArray, argObj) => {
            pluginInterface.log('proc TestProcedure call:' + JSON.stringify(uuidArray));
            return { 'message': 'Nothing happened.' };
          }
        }]);

        var count = 0 ;
        var timerid = setInterval( ()=>{
        	if( ++count == 101){
        		clearInterval(timerid) ;
	        	pluginInterface.unregisterDevice( "TestObject") ;
        	}
        	pluginInterface.publish( "TestTopic",["TestObject"]
        		,{message:'Dummy publication from TestObject'}) ;
        },3000) ;
      }
    );
} ;
