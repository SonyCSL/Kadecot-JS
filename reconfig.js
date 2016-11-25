var user_num = -1 ;	// default 10 users
var bBridgeMode = false ;

if( process.argv.length < 3 ){
	console.error('Usage : node reconfig.js #user [bridge]') ;
	console.error('bridge mode will disable all plugins and randomize default user password. Also, JSONP server is disabled') ;

	console.error('Example 1 : node reconfig.js 5  => Generate 5 users') ;
	console.error('Example 2 : node reconfig.js 100 bridge  => Generate 100 users and configure as bridge mode') ;
	process.exit(-1) ;
}

for( var aai=2;aai<process.argv.length;++aai ){
	if( process.argv[aai] == '0' )		user_num = 0 ;
	else if(parseInt(process.argv[aai]))	user_num = parseInt(process.argv[aai]) ;
	else if(process.argv[aai] == 'bridge')	bBridgeMode = true ;
}

if( user_num == -1 ){
	console.error('How many users do you want?') ;
	process.exit(-1) ;
}

var autobahn ;
try {
  autobahn = require('autobahn');
} catch (e) {
}
var fs = require('fs');


console.log('Generating '+user_num+' users (realms).') ;

var f1 = fs.readFileSync( '.crossbar/config.src1.json' , 'utf-8' ) ;
var f2 = fs.readFileSync( '.crossbar/config.src2.json' , 'utf-8' ) ;

var ins_str = '' , users_str = '' , pwd_list = '' ;


for( var i=0 ; i<=user_num ; ++i ){
	var u = {
		salt : 'Kadecot'
		,realm : 'v1.'+i
		,role : 'registered_user'
		,iterations : 100
		,keylen : 16
	} ;

	var username = 'user'+i ;
	var pwd = Math.random().toString(36).slice(-8) ;

	if( i==0 )	{ username = 'user' ; if( !bBridgeMode ) pwd = 'pass' ; }
	else 		{ users_str += ',' ; }

	u.secret = autobahn.auth_cra.derive_key(pwd , u.salt , 100 , 16 ) ;


	ins_str += f2.replace('%%%%%',i) ;

	

	users_str += '"'+username + '":'+JSON.stringify(u) ;
	pwd_list += username + ':'+pwd+"\n" ;
}

f1 = f1.replace('%%%%%',ins_str).replace('%%%ARGS%%%',(bBridgeMode? ',"bridge"' : '' )) ;


fs.writeFileSync( '.crossbar/config.json',f1 ) ;
console.log( 'New config file was written to .crossbar/config.json' ) ;

fs.writeFileSync( 'users.json' , '{'+users_str+'}' ) ;
console.log( 'Users information is stored in ./users.json' ) ;

fs.writeFileSync( 'passwords.txt' , pwd_list ) ;
console.log( 'Users login information is stored in ./passwords.txt' ) ;

