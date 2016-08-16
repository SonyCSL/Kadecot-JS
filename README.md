# Kadecot|JS is the node.js version of kadecot.

Uses [crossbar.io](http://crossbar.io/docs/Installation-on-CentOS-and-RedHat/) and [Autobahn|js](http://autobahn.ws/js/) as [WAMP](http://wamp.ws) stack. Also uses [npm echonet-lite](https://www.npmjs.com/package/echonet-lite) in echonet lite plugin.

For developers, please see ["For developers" section](#for-developers).

## Installation

**[WIP]**

Run install.sh

```
$ bash <(curl -skL https://raw.githubusercontent.com/SonyCSL/Kadecot-JS/master/install.sh)
```

For Raspberry Pi, please follow the special instruction: http://crossbar.io/docs/Installation-on-RaspberryPi/

## For developers

First, clone this repository.
```
$ git clone https://github.com/SonyCSL/Kadecot-JS.git
```

Run install.sh and Install required tools.
```
$ cd ./Kadecot-JS
$ bash ./install.sh
```

Then install node libraries by hitting
```
$ npm install
```

## Running
run crossbar by:

    crossbar start

Crossbar setting file exists under [.crossbar](.crossbar) directory.

start kadecot main functionalities and plugins by:

    node main.js

If you don't willing to use local crossbar, start main.js as follows:

    ROUTER_URL=ws://[WAMP_ROUTER_HOST]:[WAMP_ROUTER_PORT]/ws node main.js

You can check the API call by accessing 'http://[server]:8082/index.html' from your web browser.

## Difference from Android kadecot:

- realm (API version) is currently only 'v1' (Previously, it was 'default'
- WAMP parameters are embed in different field of wamp messages

## Overall architecture

![Kadecot|JS architecture](http://lifedesign.tech/wp-content/uploads/2016/08/KadecotJS-Architecture.png)

## Boot flow (uncompleted)
To support future API change, main logics are all under v1/ directory.
In [WAMP](http://wamp.ws) protocol, message passings are strictly isolated according to the *realm* property, declared when WAMP client is connected to the WAMP router. We use realm to switch API version.

In [main.js](main.js), a web server and a version-specific provider ([v1/provider.js](v1/provider.js) ) is started.
Currently the web server is only used for wamp client sample, but in future, default system manager will be hosted.

[v1/provider.js](v1/provider.js) tries to connect to WAMP router. If successful, it registers some kadecot-specific public WAMP procedure (*getDeviceList*) and some used for plugin registration (*registerplugin*,*registerdevice*,*unregisterdevice*), and subscribes to crossbar-specific topic *wamp.session.on_leave*, to monitor plugin detachment.
After this, plugins under [v1/plugins/](v1/plugins/) are scanned and inited.

During plugin initialization, each plugin is also connected to WAMP router. This connection is notified to the provider by calling WAMP procedure *com.sonycsl.kadecot.provider.procedure.registerplugin* with desired plugin prefix declared.

[v1/provider.js](v1/provider.js) also starts a little web server on port 31413 to host sample app (sample.html), as well as cloud login app (register.html)
Try these by accessing [host]:31413/sample.html or [host]:31413/regiser.html

## Test tools
- [MoekadenRoom](http://kadecot.net/blog/1479/) : ECHONET Lite device emulator (Run this on different IP from Kadecot)
- [Kadecot for Android](https://play.google.com/store/apps/details?id=com.sonycsl.Kadecot)

## ToDo
- Add test code
- More complete documentation
- Complete ECHONET Lite plugin development
- Develop Cloud plugin (cloud-side source code should also be released)
- npm packaging
- Develop REST API
