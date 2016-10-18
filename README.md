# What does Kadecot|JS do?

Kadecot|JS is an open-source home server implemented by Node.js.

This is essentially a protocol converter, from device-specific one to unified WebAPI, based on JSONP or [WAMP](http://wamp-proto.org/). WAMP is a very convenient websocket-based WebAPI, which supports both PubSub and RPC styled information delivery. On top of WAMP, we added an originally-formatted payload. You can easilly access devices from major web browser using our server.

If you want to use JSONP API, just start the server and access http://[Kadecot|JS IP]:31413/. You will get easy-to-use API Generator.
If you use WAMP API, we recommend you to use [Autobahn|JS](http://autobahn.ws/js/) as WAMP access library (not well document yet).

In either case, please check Installation and Usage section below.

Currently, this Node.js version only supports ECHONET Lite and [Device WebAPI (GotAPI)](http://en.device-webapi.org/), while the [Android version](https://play.google.com/store/apps/details?id=com.sonycsl.Kadecot) additionally supports Sony's Bravia, IRKit, Hue, and by adding an [external plugin](https://github.com/SonyCSL/LightblueBeanPlugin), LightBlue Bean can also be accessed. If you use the Android version, please use our library (Rather than Autobahn) to access it as described in [this page](http://kadecot.net/English/).

[Device WebAPI (GotAPI)](http://en.device-webapi.org/) is another device WebAPI server managed by Device WebAPI consortium. It runs on smartphones and supports various devices including smart glasses, watches, and so on. If you want to communicate with those devices through Kadecot API, you need to run [Device WebAPI Manager App](https://play.google.com/store/apps/details?id=org.deviceconnect.android.manager) on android phone within the same network, and set the IP address to Kadecot|JS config. Please check below.

You can easily add new protocol by adding a custom plugin and reboot. Please check the [example plugin](v1/plugins/com.sonycsl.kadecot.test/index.js).

For developers, please see ["For developers" section](#for-developers).

This application uses [crossbar.io](http://crossbar.io/docs/Installation-on-CentOS-and-RedHat/) and [Autobahn|js](http://autobahn.ws/js/) as [WAMP](http://wamp.ws) stack. Also uses [node-echonet-lite](https://www.npmjs.com/package/node-echonet-lite) in echonet lite plugin.

## Installation

Use automatic install.

```sh
$ bash <(curl -skL https://git.io/kadecotjs-install)
```

<!-- For Raspberry Pi, please follow the special instruction: http://crossbar.io/docs/Installation-on-RaspberryPi/ -->

## Usage

Run crossbar.io with Kadecot|JS by:

```sh
$ kadecot start
```

Crossbar setting file exists under [.crossbar](.crossbar) directory.

<!--
start Kadecot main functionalities and plugins by:

```sh
node main.js
```
-->

### JSONP API

Kadecot|JS also has JSON/JSONP API.

Access `http://{YOUR_KADECOT_IP}:31413` and try it.

### Without local crossbar (Optional)

If you don't willing to use local crossbar, run `node main.js` as follows:

```sh
$ ROUTER_URL=ws://[WAMP_ROUTER_HOST]:[WAMP_ROUTER_PORT]/ws node $HOME/.kadecot/main.js
```

### GotAPI plugin

If you use [DeviceConnect Android], write Android's IP address to `$HOME/.kadecot/v1/plugins/com.sonycsl.kadecot.gotapi/config.yml`.

[DeviceConnect Android]: https://github.com/DeviceConnect/DeviceConnect-Android/blob/master/readme.ja.md

### WAMP sample

You can check the API call by accessing `http://[host]:31413/sample.html` from your web browser (assuming there is one ECHONET Lite Air-conditioner exists).

## For developers

First, clone this repository.
```sh
$ git clone https://github.com/SonyCSL/Kadecot-JS.git
```

Run install.sh and Install required tools.
```sh
$ cd ./Kadecot-JS
$ bash ./install.sh
```

Then install node libraries by hitting
```sh
$ npm install
```

Also rename v1/htserverdocs/settings.js.orig to v1/htserverdocs/settings.js and edit it.

```sh
$ cp v1/htserverdocs/settings.js.orig v1/htserverdocs/settings.js
$ vi v1/htserverdocs/settings.js
```

## Difference from Android Kadecot:

- realm (API version) is currently only 'v1' (Previously, it was 'default'
- WAMP parameters are embed in different field of wamp messages

## Overall architecture

![Kadecot|JS architecture](http://lifedesign.tech/wp-content/uploads/2016/08/KadecotJS-Architecture.png?0)

## Boot flow (uncompleted)
To support future API change, main logics are all under v1/ directory.
In [WAMP](http://wamp.ws) protocol, message passings are strictly isolated according to the *realm* property, declared when WAMP client is connected to the WAMP router. We use realm to switch API version.

In [main.js](main.js), a web server and a version-specific provider ([v1/provider.js](v1/provider.js) ) is started.
Currently the web server is only used for wamp client sample, but in future, default system manager will be hosted.

[v1/provider.js](v1/provider.js) tries to connect to WAMP router. If successful, it registers a Kadecot-specific public WAMP procedure (*getDeviceList*) and some used for plugin registration (*registerplugin*,*registerdevice*,*unregisterdevice*), and subscribes to crossbar-specific topic *wamp.session.on_leave*, to monitor plugin detachment.
After this, plugins under [v1/plugins/](v1/plugins/) are scanned and inited.

During plugin initialization, each plugin is also connected to WAMP router. This connection is notified to the provider by calling WAMP procedure *com.sonycsl.kadecot.provider.procedure.registerplugin* with desired plugin prefix declared.

[v1/provider.js](v1/provider.js) also starts a little web server on port 31413 to host sample app (sample.html).
sample.html assums there is one ECHONET Lite Air-conditioner exists.

Try these by accessing http://[host]:31413/sample.html

## Test tools
- [MoekadenRoom](http://kadecot.net/blog/1479/) : ECHONET Lite device emulator (Run this on different IP from Kadecot)
- [Kadecot for Android](https://play.google.com/store/apps/details?id=com.sonycsl.Kadecot)

## ToDo
- Add test code
- More complete documentation
- Check cloud ability (cloud-side source code should also be released)
- npm packaging
- Develop REST API

## Acknowledgements
- [Futomi Hatano](https://github.com/futomi) helped me a lot to quickly modify his [node-echonet-lite library](https://www.npmjs.com/package/node-echonet-lite) to match my request. Thank you very much!!
