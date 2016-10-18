//////////////////////////////////////
// Exports

var pluginInterface;

exports.init = function(_pluginInterface) {
  pluginInterface = _pluginInterface;
  pluginInterface.connectRouter({
    onopen: onDeviceSearch,
    onclose: function() {}
  });
};

function onDeviceSearch() {
  // uuid,deviceType,description,nickname,onregisteredfunc
  pluginInterface
    .registerDevice('TestObject', 'TestObject', 'Only one test object', 'TestObject')
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
