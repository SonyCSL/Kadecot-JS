# GotAPI Manager Plugin

Access [DeviceConnect] via Kadecot|JS WAMP.

[DeviceConnect]: https://github.com/DeviceConnect/DeviceConnect-NodeJS

## Usage

### Procedure

`gotapi.procedure.{profile}` or `gotapi.procedure.{profile}.{method}`

### Object

|Key|Description|Default|
|:--:|:--|:--:|
|method|HTTP method (if not included in procedure name)|`'GET'`|
|interface||`undefined`|
|attribute||`undefined`|
|data|POST or PUT data|`undefined`|
|serviceId|That got via `servicediscovery`|`undefined`|

And any query parameters.

## LICENSE

MIT

## Author

3846masa
