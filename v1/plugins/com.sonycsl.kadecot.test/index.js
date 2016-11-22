//////////////////////////////////////
// Exports

exports.init = function( /*_pluginInterface*/ ) {
  var pluginInterface = this;
  pluginInterface.connectRouter({
    onopen: onDeviceSearch,
    onclose: function() {}
  });
};

function onDeviceSearch() {
  // uuid,deviceType,description,nickname,onregisteredfunc
  var pluginInterface = this ;
    this.registerDevice('TestObject', 'TestObject', 'Only one test object', 'TestObject')
    .then((re) => {
      if (!re.success) return;
      pluginInterface.registerProcedures([{
        name: 'TestProcedure',
        procedure: (deviceIdArray, argObj) => {
          pluginInterface.log('proc TestProcedure call:' + JSON.stringify(arguments));
          return {
            'message': 'Nothing happened.'
          };
        }
      }]);
    });
}
