# helios2mqtt

[![NPM version](https://badge.fury.io/js/helios2mqtt.svg)](http://badge.fury.io/js/helios2mqtt)
[![License][mit-badge]][mit-url]

> A deamon for syncing a helios easy controls system like my KWL EC 220D to mqtt following the [mqtt-smarthome](https://github.com/mqtt-smarthome) architecure.

Based on the idea of [mqtt-smarthome](https://github.com/mqtt-smarthome) and especially on the work of hobbyquaker [hm2mqtt.js](https://github.com/hobbyquaker/hm2mqtt.js) I decided to build a bridge for my helios KWL system to mqtt.

At the moment only "status" reading is working, set anything is not implemented so far.

Please read the --help output for commandline options. I tried to stick as close as possible to hm2mqtt.js.

## Install

`sudo npm install -g helios2mqtt`

As hobbyquaker I also suggest to use pm2 to manage the hm2mqtt process (start on system boot, manage log files, ...). There is a really good howto at the [mqtt-smarthome repo](https://github.com/mqtt-smarthome/mqtt-smarthome/blob/master/howtos/homematic.md)

### Usage

`helios2mqtt --help`

```helios2mqtt 0.0.5
Helios Easy Controls modbus tcp to mqtt-smarthome daemon.

Usage: helios2mqtt [options]

Optionen:
  -v, --verbosity            possible values: "error", "warn", "info", "debug"
                                                              [Standard: "info"]
  -h, --help                 show help                                 [boolean]
  --version                  show version                              [boolean]
  -a, --helios-ip-address    ip address of helios easycontrols capable
                             ventilation system
  -b, --modbus-tcp-port      port on which modbbus tcp deamon listens
                                                               [Standard: "502"]
  -j, --json-variable-table  A JSON file that maps helios vars to names and
                             types              [Standard: "./helios_vars.json"]
  -m, --mqtt-url             mqtt broker url. See
                             https://github.com/mqttjs/MQTT.js#connect
                                                  [Standard: "mqtt://127.0.0.1"]
  -n, --name                 instance name. used as mqtt client id and as prefix
                             for connected topic            [Standard: "helios"]
  -p, --mqtt-password        mqtt broker password
  -s, --json-values          Publish values on status at mqtt as json including
                             additional info                           [boolean]
  -u, --mqtt-username        mqtt broker username
```
### Customization

If you would like to change the variables which are read from the helios modbus tcp interface have a look at the file helios_vars.json file (if you installed using above npm install -g you will find it at /usr/lib/node_modules/helios2mqtt/helios_vars.json). If someone can tell me how to make that file "user customizable" in an more elegant way instead of -j option, e.g. in user's home directory please send me an email!

### Examples

* Simple Example, local mqtt server, no auth:
`/usr/bin/helios2mqtt -a 192.168.4.30`
Starts the deamon, connects to helios modbus KWL at 192.168.4.30 and publishes at helios/status/# of the local mqtt (port 1883)

* Complex Example, local mqtt server, with auth:
`/usr/bin/helios2mqtt -a 192.168.4.30 -b 502 -m mqtt://192.168.4.10 -u heliosMqtt -p seCRe7 -v warn -n helios220D -s -j /home/smarthome/helios_vars.json`
Starts the deamon, connects to helios modbus KWL at 192.168.4.30 and publishes at helios/status/# of the mqtt server at 192.168.4.10 using the credantials above. Published will be json strings with additional infos. Will only print warning and errors. Uses a customized version of the variables definition in home of smarthome user.

### mqtt topics

* helios/status/xxx
helios2mqtt pushes all the readings from helios KWL to one subtopic each. You can choose using -s Option if you would like to simply have the value or a json string with more info like timestamp and explanation.

* helios/get/xxx
helios2mqtt listens to get requests here. You can request status updates for specific readings here. The response will be published as status.

* helios/connected
    * 0 means not connected (using a will, so this means deamon is not running)
    * 1 means connected to mqtt but no connection to helios
    * 2 means connected to both, mqtt and helios KWL

* helios/set/xxx
Will be used for changing variables in helios KWL. Not implmented (jet).

## License

MIT © [Markus Reschka](https://github.com/mreschka)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE

## Credits

Thanks to [hobbyquaker](https://github.com/hobbyquaker) for your work on smarthome and hm2mqtt! This work is based on your ideas. First start for this was [xyz2mqtt-skeleton](https://github.com/hobbyquaker/xyz2mqtt-skeleton).
