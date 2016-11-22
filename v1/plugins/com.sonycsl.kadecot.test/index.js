//////////////////////////////////////
// Exports

var pluginInterface ;

exports.init = function() {
    // uuid,deviceType,description,nickname,onregisteredfunc
    pluginInterface = this ;

    pluginInterface.registerDevice('TestObject', 'TestObject', 'Only one test object', 'TestObject')
      .then( re => {
	// re is a map of sessionid => deviceId
	pluginInterface.log('sessionid => deviceId map:'+JSON.stringify(re)) ;
        pluginInterface.registerProcedures([{
          name: 'TestProcedure',
          procedure: (deviceIdArray, argObj) => {
            pluginInterface.log('proc TestProcedure call:' + JSON.stringify(arguments));
            return {
              'message': 'Nothing happened.'
            };
          }
        }]);
      } );
} ;
