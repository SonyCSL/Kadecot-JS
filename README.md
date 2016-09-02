# Kadecot|JS is the node.js version of Kadecot.

Uses [crossbar.io](http://crossbar.io/docs/Installation-on-CentOS-and-RedHat/) and [Autobahn|js](http://autobahn.ws/js/) as [WAMP](http://wamp.ws) stack. Also uses [node echonet-lite](https://www.npmjs.com/package/node-echonet-lite) in echonet lite plugin.

For developers, please see ["For developers" section](#for-developers).

## Install

**[WIP]**

Run install.sh

```
$ bash <(curl -skL https://raw.githubusercontent.com/SonyCSL/Kadecot-JS/master/install.sh)
```

## Configure

Kadecot|JS reads JSON or YAML config file.

### Config file path

- ``${HOME}/.kadecotrc``
- ``${HOME}/.kadecotrc.(json|yaml|yml)``
- ``${HOME}/.kadecot/config.(json|yaml|yml)``

### Default config

```js
{
  "servers": {
    "rest": {
      "port": 4035
    },
    "wamp": {
      // Node.js URL Objects
      "protocol": "ws:",
      "hostname": "127.0.0.1",
      "port": 41314,
      "pathname": "/ws",
      "slashes": true,
      // If set URL String, Kadecot|JS use it.
      // "url": "ws://127.0.0.1:41314/ws"
    }
  }
}
```

## For developers

**[WIP]**

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

**[WIP]**

## Difference from Android Kadecot:

- realm (API version) is currently only 'v1' (Previously, it was 'default'
- WAMP parameters are embed in different field of wamp messages

## Overall architecture

![Kadecot|JS architecture](http://lifedesign.tech/wp-content/uploads/2016/08/KadecotJS-Architecture.png?0)

## Test tools
- [MoekadenRoom](http://kadecot.net/blog/1479/) : ECHONET Lite device emulator (Run this on different IP from Kadecot)
- [Kadecot for Android](https://play.google.com/store/apps/details?id=com.sonycsl.Kadecot)

## Acknowledgements
- [Futomi Hatano](https://github.com/futomi) helped me a lot to quickly modify his [node echonet-lite library](https://www.npmjs.com/package/node-echonet-lite) to match my request. Thank you very much!!
