# GotAPI Manager Plugin

Access [DeviceConnect] via Kadecot|JS WAMP.

[DeviceConnect]: https://github.com/DeviceConnect/DeviceConnect-NodeJS

## Usage

### Installation

```
# First, install dependencies
npm i

# When you use DeviceConnect-NodeJS, please run below
git submodule init && git submodule update
(cd DeviceConnect-NodeJS && patch -p0) < ./DeviceConnect-NodeJS.patch
npm i DeviceConnect-NodeJS/packages/deviceconnect-manager
npm i DeviceConnect-NodeJS/packages/deviceconnect-plugin-host

# Edit config.yml
cp ./config.template.yml ./config.yml
```

### Procedure

`gotapi.procedure.{profile}` or `gotapi.procedure.{profile}.{method}`

### Object

|Key|Description|Default|
|:--:|:--|:--:|
|method|HTTP method (if not included in procedure name)|`'GET'`|
|interface||`undefined`|
|attribute||`undefined`|
|_raw|POST or PUT data|`undefined`|

And any query parameters.

## LICENSE

MIT

## Author

3846masa
