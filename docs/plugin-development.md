# Plugin Development Information

プラグインの仕組みと作り方について解説します。

## サンプルプラグイン

$(HOME)/.kadecot/v1/plugins/net.kadecot.test/index.sample.js

はサンプルプラグインのソースです。
このファイルをindex.jsにリネームし、Kadecotをrestartすると動くので試してみてください。

このプラグイン内では、TestObjectという機器オブジェクトを登録し、その中で

net.kadecot.test.procedure.TestProcedure

というProcedureと、

net.kadecot.test.topic.TestTopic

というTopicを実装しています。
Topicには３秒おきに100回（５分間）Publishされ、そののちにTestObjectが削除されます。

KadecotのControl Panel(ポート31413)を開くと、５分間だけTestObjectという機器が登録されていることがわかると思います。

プラグインの機能は、機器の登録と削除、ProcedureとTopicの定義ですので、このサンプルには全て含まれていることになります。

## プラグインの書き方

サンプルプラグインを参考にしながら、プラグインの書き方を解説します。

まず、プラグインはKadecot起動時に.kadecot/v1/pluginsの下のディレクトリをスキャンすることで行われます。フォルダの下にindex.jsがあればこのファイルがエントリーポイントになります。index.jsがなければプラグインにはなりません。このスキャンは起動時にしか行われないので、新たなプラグインを追加したらKadecotのrestartが必要です。

ディレクトリ名は「プレフィックス」と呼び、重要な意味があります。プラグインが実現するProcedureやTopicは、必ずこの名前からはじまることになります。名前の衝突を避けるため、お持ちのドメイン名を逆に並べてお使いください。Sony CSLではcom.sonycsl.kadecotとnet.kadecotを使っています。

サンプルプラグインのソースは次のようになっています。

```JS
//////////////////////////////////////
// Exports

var pluginInterface ;

exports.init = function() {
    pluginInterface = this ;

    pluginInterface.registerDevice(
	    // uuid,deviceType,description,nickname,onregisteredfunc
    	'TestObject', 'TestObject', 'Only one test object', 'TestObject')
      .then( re => {
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
        	pluginInterface.publish( "TestTopic",["TestObject"],
            	{message:'Dummy publication from TestObject'}) ;
        },3000) ;
      }
    );
} ;

```

#### エントリーポイント
まず、init関数をexportします。初期化時にKadecotから呼び出されます。
thisとして、Kadecot本体とやりとりするためのオブジェクトが渡されますので、一応変数（pluginInterface）で受けておきます。

```JS
exports.init = function() {
    pluginInterface = this ;
```

#### registerDevice : 機器の登録

機器を登録したい時はpluginInterface.registerDevice()という関数を呼び出します。init後であれば、任意のタイミングで呼び出し可です。
この関数には引数が５つ必要です。
+ uuid : Kadecot内部で同一性判定に用いる、唯一の機器ID文字列。できればいつ、どのような状況で機器登録する場合も、ハードウェアが同じであれば同じ値になるとベストです。ネットを使う機器の場合は、Macアドレスなんかにするといいかもしれません。
+ deviceType : 機器の種類を表す文字列。プロトコル内に、API体系(ProcedureやTopicの名前や個数など)が違う機器が混在する場合、このdeviceTypeで区別してください。例えば、echonetliteプラグインでは、機器の種類ごとに異なるdeviceTypeが割り当てられています。サンプルではuuidと同じ値になっていますが、違う値にしても問題ありません。
+ description : 機器を説明する文章です。あまり重要ではありません。
+ nickname : ユーザーが機器を認識しやすくするための名前文字列。例えば「リビングの照明」など。途中で変わっても大丈夫です。サンプルではuuidと同じ値になっていますが、違う値にしても問題ありません。
+ 登録が成功したときのコールバック関数。引数にはステータスが返ってきます。

#### registerProcedures : Procedureの登録

APIクライアントからの呼び出しに応答するために用いるProcedureの登録を行います。
pluginInterface.registerProcedures()の引数は配列で、複数のProcedureを同時に登録できます。
配列の各要素はnameとprocedureの２つの要素を持つオブジェクトで、TestProcedureでは以下のように定義されています。

```JS
{
  name: 'TestProcedure',
  procedure: (uuidArray, argObj) => {
    pluginInterface.log('proc TestProcedure call:' + JSON.stringify(uuidArray));
    return { 'message': 'Nothing happened.' };
  }
}
```

このように、nameはProcedure名、procedureは引数を二つ持つ関数です。
APIクライアントから見ると、先頭にプレフィックス（プラグインが入っているディレクトリ名）と、".procedure."が付与された文字列になりますので、

net.kadecot.test.procedure.TestProcedure

というProcedureが定義されることになります。
処理の中身はprocedureで定義される関数の中で書きます。ここではJSONオブジェクトを返答していますので、即座にこのオブジェクトがAPIクライアントに返されます。このオブジェクトの中身は自由です。

返答を作るのに時間がかかる場合は、Promiseを返すこともできます。この場合は次のようになるでしょう。

```JS
  procedure: (uuidArray, argObj) => {
    return new Promise( (accept,reject)=>{
    	// 時間がかかる処理
	    accept( { 'message': 'Nothing happened.' } );
    } ) ;
  }
```

#### publish : トピックへのPublish

Publishしたい場合は事前の登録など必要ありません。Publishしたいタイミングで以下のようなコールをしてください。

```JS
pluginInterface.publish( "TestTopic",["TestObject"],
	{message:'Dummy publication from TestObject'}) ;
```
一つ目の引数はtopic名です。APIクライアントから見ると、戦闘にプレフィックスと".topic."という文字列が足されますので、結局

net.kadecot.test.topic.TestTopic

というTopicにSubscribeしているAPIクライアントに値が配信されます。

二つ目の引数は配列で、送信元のデバイスのuuid (機器登録時に設定したもの。文字列) を要素に持ちます。
複数デバイスからの同時Publishは、試したことがないのでやめておいた方が無難です。

三つめの引数は、APIクライアントに送信したい情報本体です。フォーマットは自由です。

#### unregisterDevice : 機器の削除
pluginInterface.unregisterDeviceは機器の削除を行います。引数に、登録時に指定したUUIDを入れて呼び出してください。

```JS
pluginInterface.unregisterDevice( "TestObject") ;
```

プラグインの作り方は以上です。

## プラグインのブートシーケンス



