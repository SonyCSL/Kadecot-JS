/////////////////////////////////////////////////////////////////

// start version 1 API
var provider1 = require('./v1/provider.js') ;
provider1.init('v1').then( () => {
	console.log( 'server for realm "v1" is now running.') ;
} ).catch( console.log ) ;
