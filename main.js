/////////////////////////////////////////////////////////////////
// settings arguments are provided liks this:
// PORT=8088 node main.js

/////////////////////////////////////////////////////////////////
// PORT : web interface port number (default 8082)
// ROUTER_URL : Wamp router (Crossbar.io only) url. (default ws://127.0.0.1:41314/ws)
// Ex)  ROUTER_URL=ws://[WAMP_ROUTER_HOST]:[WAMP_ROUTER_PORT]/ws node main.js

// start version 1 API
require('./v1/provider.js').init('v1',process.env.ROUTER_URL || 'ws://127.0.0.1:41314/ws') ;




/*
/////////////////////////////////////
// Autobahn WAMP How-to

   // 1) subscribe to a topic
   function onevent(args) {
      console.log("Event:", args[0]);
   }
   session.subscribe('com.myapp.hello', onevent);

   // 2) publish an event
   session.publish('com.myapp.hello', ['Hello, world!']);

   // 3) register a procedure for remoting
   function add2(args) {
      return args[0] + args[1];
   }
   session.register('com.myapp.add2', add2);

   // 4) call a remote procedure
   session.call('com.myapp.add2', [2, 3]).then(
      function (res) {
         console.log("Result:", res);
      }
   );
*/
