//////////////////////////////////////
// Exports

var pluginInterface ;

exports.init = function() {
    // uuid,deviceType,description,nickname,onregisteredfunc
    pluginInterface = this ;

    pluginInterface.registerDevice('TestObject', 'TestObject', 'Only one test object', 'TestObject')
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

var c=0 ;
        setInterval( ()=>{
pluginInterface.log('Pub:'+(c++)) ;
          pluginInterface.publish( "TestTopic",["TestObject"],{message:'Dummy publication from TestObject'}) ;
        },3000) ;
      }
    );
} ;
