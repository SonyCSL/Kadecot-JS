var noble = require('noble');

const LOCAL_NAME_PREFIX            = 'MESH-100';

const SERVICE_UUID                 = '72c9000157a94d40b746534e22ec9f9e';
const INDICATE_CHARACTERISTIC_UUID = '72c9000557a94d40b746534e22ec9f9e';
const NOTIFY_CHARACTERISTIC_UUID   = '72c9000357a94d40b746534e22ec9f9e';
const WRITE_CHARACTERISTIC_UUID    = '72c9000457a94d40b746534e22ec9f9e';


var pluginInterface ;

exports.init = function() {
    pluginInterface = this ;

	noble.on('stateChange', function(state) {
		if (state === 'poweredOn') {
			noble.startScanning();
		} else {
			noble.stopScanning();
		}
	});

	noble.on('discover', function(peripheral) {
		if( peripheral.advertisement.localName == undefined ) return ;
		//pluginInterface.log('found peripheral:', peripheral.advertisement.localName);	

		if (peripheral.advertisement.localName.indexOf(LOCAL_NAME_PREFIX)!=0 )
			return;

		var tag_uuid = peripheral.advertisement.localName.substring(LOCAL_NAME_PREFIX.length) ;
		var tag_handler = TAG_HANDLERS[ tag_uuid.substring(0,3) ] ;

		if( tag_handler == undefined )
			return ;

		noble.stopScanning();

		var indicateCharacteristic , notifyCharacteristic , writeCharacteristic ;

		peripheral.connect(function(err) {
			//console.log('connected to '+tag_uuid);//, peripheral.advertisement);	
			peripheral.discoverServices([SERVICE_UUID], function(err, services) {
				//console.log('Service discovered');//, peripheral.advertisement);	

				services.forEach(function(service) {
					//console.log('found service:', service.uuid);
					service.discoverCharacteristics([], function(err, characteristics) {
						characteristics.forEach(function(characteristic) {
							//console.log('found characteristic:', characteristic);
							if (NOTIFY_CHARACTERISTIC_UUID == characteristic.uuid) {
								notifyCharacteristic = characteristic;
							} else if (WRITE_CHARACTERISTIC_UUID == characteristic.uuid) {
								writeCharacteristic = characteristic;
							} else if (INDICATE_CHARACTERISTIC_UUID == characteristic.uuid) {
								indicateCharacteristic = characteristic;
							}
						});

						if( notifyCharacteristic==undefined || writeCharacteristic==undefined || indicateCharacteristic==undefined ) return ;

						tag_handler(tag_uuid , notifyCharacteristic , writeCharacteristic , indicateCharacteristic ) ;

						// Find next tag
						noble.startScanning();
					});	
				});
			});
	    });
	});
} ;

////////////////////////////////////////
////////////////////////////////////////
////////////////////////////////////////
///// Tag-specific handlers


const DEFAULT_TAG_HANDLER = function(tag_uuid , notifyCharacteristic , writeCharacteristic , indicateCharacteristic){
	pluginInterface.log(tag_uuid+' ready.');
} ;

const TAG_HANDLERS = {
	'BU1'  : DEFAULT_TAG_HANDLER
	,'LE1' : DEFAULT_TAG_HANDLER
	,'AC1' : DEFAULT_TAG_HANDLER
	,'TH1' : DEFAULT_TAG_HANDLER
	,'GP1' : DEFAULT_TAG_HANDLER
	,'MD1' : DEFAULT_TAG_HANDLER
	,'PA1' : DEFAULT_TAG_HANDLER
} ;


const NOTIFY_START_COMMAND = new Buffer([0x00, 0x02, 0x01, 0x03]);

const SINGLE_CLICK = [0x01, 0x00, 0x01, 0x02];
const DOUBLE_CLICK = [0x01, 0x00, 0x03, 0x04];
const LONG_PRESS = [0x01, 0x00, 0x02, 0x03];
const SLEEP = [0x00, 0x00, 0x0a, 0x0a];
const POWER_CLICK = [0x00, 0x01, 0x00, 0x01];


TAG_HANDLERS.BU1 = function(tag_uuid , notifyCharacteristic , writeCharacteristic , indicateCharacteristic) {
	var isNotInitialized = true;

	var pubmsg = pluginInterface.log ;

	// indicate
	// indicateCharacteristic.on('data', function (data, isNotification) {
	// 	// console.log('indicateCharacteristic data: ' + isNotification + ' : data: ' + data.toString('hex'));
	// });

	indicateCharacteristic.once('notify', function(state) {
	  	// console.log('notify: ' + state);
		if (isNotInitialized) {
			isNotInitialized = false;
			writeCharacteristic.write(NOTIFY_START_COMMAND, false, function(err) { // with response
				if (err){console.log(err); return ;}

				//pluginInterface.log(tag_uuid+' ready');

			    pluginInterface.registerDevice(
			        // uuid,deviceType,description,nickname,onregisteredfunc
			        tag_uuid, 'MESHButton', 'MESH Button tag', 'MESHButton'+tag_uuid.substring(3))
				      .then( re => {
				        //pluginInterface.log('Device registration result:'+JSON.stringify(re)) ;

				        pubmsg = function(msg){
				        	pluginInterface.publish('message',[tag_uuid],{message:msg}) ;
				        } ;
				        
				        /*pluginInterface.registerProcedures([{
				          name: 'TestProcedure',
				          procedure: (uuidArray, argObj) => {
				            pluginInterface.log('proc TestProcedure call:' + JSON.stringify(uuidArray));
				            return { 'message': 'Nothing happened.' };
				          }
				        }]);*/
				      }
				    );
			});
		}
	 });

	indicateCharacteristic.subscribe( /*console.error*/ );

	// notify
	notifyCharacteristic.on('data', function (data, isNotification) {
		// console.log('data: ' + isNotification + ' : ' + data.toString('hex'));
		if (data.length >= 4) {
			switch(data[3]){
				case SINGLE_CLICK[3] : pubmsg('SINGLE CLICK') ; break ;
				case DOUBLE_CLICK[3] : pubmsg('DOUBLE CLICK') ; break ;
				case LONG_PRESS[3] :   pubmsg('LONG PRESS') ; break ;
				case SLEEP[3] :        pubmsg('SLEEP') ; break ;
				case POWER_CLICK[3] :  pubmsg('POWER CLICK') ; break ;
			}
		}
	});

	notifyCharacteristic.subscribe(function(err) {
		if (err)
			pluginInterface.log('subscribe error:', err);
	});
}
