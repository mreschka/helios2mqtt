# helios2mqtt

[![mqtt-smarthome](https://img.shields.io/badge/mqtt-smarthome-blue.svg)](https://github.com/mqtt-smarthome/mqtt-smarthome)
[![NPM version](https://badge.fury.io/js/helios2mqtt.svg)](http://badge.fury.io/js/helios2mqtt)
[![License][mit-badge]][mit-url]

> A deamon for syncing a helios easy controls system like my KWL EC 220D to mqtt following the [mqtt-smarthome](https://github.com/mqtt-smarthome) architecure.

Based on the idea of [mqtt-smarthome](https://github.com/mqtt-smarthome) and especially on the work of hobbyquaker [hm2mqtt.js](https://github.com/hobbyquaker/hm2mqtt.js) I decided to build a bridge for my helios KWL system to mqtt.

Setting values from mqtt to helios is implemented but without any checks. The published value will be written as it is.

Please read the --help output for commandline options. I tried to stick as close as possible to hm2mqtt.js.

## History

I bumped the version from 0.0.x to 0.1.x since there were now problems reported on github and there none on my own installation in the past years.
Package Version 0.2.x ist updated to more recent dependencies. This requires Node >= 10 now. Please make sure you have at least Node 10 before updating.

New in 0.2.3:
* Updated dependencies to mitigate security problems.

New in 0.2.2:
* Added the possibility to use a config file and/or ENV variables for configuration

New in 0.2.1:
* Updated dependencies to mitigate security problems.

New in 0.1.8:
* get and set commands via mqtt are now higher priority than internal timed reads to get faster responses esp. during startup where many reads are queued.

New in 0.1.7:
* updated this readme

New in 0.1.6:
* corrected help text (default for watchdog)
* integrated new variable bypass_offen (thanks to hhansen06 on github).
* updated dependencies since there were security issues (see releasenotes on github)

The versions 0.1.0 to 0.1.5 were internal relases which were broken and so I removed them here instantly.

## Install

`sudo npm install -g helios2mqtt`

As hobbyquaker I also suggest to use pm2 to manage the hm2mqtt process (start on system boot, manage log files, ...). There is a really good howto at the [mqtt-smarthome repo](https://github.com/mqtt-smarthome/mqtt-smarthome/blob/master/howtos/homematic.md)

If you want to use a config file instead of commandline otions simply write a valid json file including all you options. The variables are named like the short or long names of all the config switches. File can be named as you like but has to end in `.json`. Tell helios2mqtt where it is using the `--config` option.

Using Docker ist possible as well (hhansen06 has written a docker file for you, see https://github.com/hhansen06/docker-helios2mqtt). You can choose to set the commandline option via ENV variables in this case. Prefix all the configuration switches using `HELIOS2MQTT_` and the add the name of the switch (doesn't matter whether short or long version, as long as you write them all in capital letters and replace - with _, eg. `HELIOS2MQTT_MQTT_PASSWORD`). If you want to use the config file you have to configure the path using `HELIOS2MQTT_CONFIG` env variable.

## Usage

`helios2mqtt --help`

```helios2mqtt 0.2.3
Helios Easy Controls modbus tcp to mqtt-smarthome daemon.

Usage: helios2mqtt [options]

Optionen:
  -v, --verbosity            possible values: "error", "warn", "info", "debug"
                                                              [Standard: "info"]
  -h, --help                 show help                                 [boolean]
  --config                   Pfad zur JSON-Config Datei
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
  -q, --mqtt-qos             mqtt qos setting               [Zahl] [Standard: 0]
  -r, --mqtt-no-retain       disable mqtt retain                       [boolean]
  -s, --json-values          Publish values on status at mqtt as json including
                             additional info                           [boolean]
  -u, --mqtt-username        mqtt broker username
  -w, --watchdog             timeout for internal watchdog in seconds (default:
                             0=off)                                [Standard: 0]
```
### Customization

If you would like to change the variables which are read from the helios modbus tcp interface have a look at the file helios_vars.json file (if you installed using above npm install -g you will find it at /usr/lib/node_modules/helios2mqtt/helios_vars.json). If someone can tell me how to make that file "user customizable" in an more elegant way instead of -j option, e.g. in user's home directory please send me an email!

### Examples

* Simple Example, local mqtt server, no auth:
`/usr/bin/helios2mqtt -a 192.168.4.30`
starts the deamon, connects to helios modbus KWL at `192.168.4.30` and publishes at `helios/status/#` of the local mqtt (port 1883)

* Complex Example, local mqtt server, with auth:
`/usr/bin/helios2mqtt -a 192.168.4.30 -b 502 -m mqtt://192.168.4.10 -u heliosMqtt -p seCRe7 -v warn -n helios220D -s -j /home/smarthome/helios_vars.json`
starts the deamon, connects to helios modbus KWL at `192.168.4.30` and publishes at `helios/status/#` of the mqtt server at `192.168.4.10` using the credentials above. Published will be json strings with additional infos. Will only print warning and errors. Uses a customized version of the variables definition in home of smarthome user.

### mqtt topics

* `helios/status/xxx`:
helios2mqtt pushes all the readings from helios KWL to one subtopic each. You can choose using -s Option if you would like to simply have the value or a json string with more info like timestamp and explanation.

* `helios/get/xxx`:
helios2mqtt listens to get requests here. You can request status updates for specific readings here. The response will be published as status.

* `helios/connected`:
    * `0` means not connected (using a mqtt will, so this means deamon is not running at all or is not able to connect to mqtt server)
    * `1` means connected to mqtt but no connection to helios
    * `2` means connected to both, mqtt and helios KWL

* `helios/set/xxx`:
Can be used for changing variables in helios KWL. Set is now implemented but without any checks. The published value will be written as it is. Please read [Helios easyControls Modbus Gateway TCP/IP](https://www.heliosventilatoren.de/mbv/kwl_modbus_easycontrols_82269-001_0917.pdf) for the correct format and/or use the information in helios_Vers.json.

### watchdog feature

The watchdog monitors mqtt-publish activity of helios2mqtt. I suggest using at least 60 seconds. You can turn this on in order to let helios2mqtt exit as a last measure if all reconnect attempts fail (i.e. twice the watchdog time went by without any successful publish. Reasons could for exmaple be a problem with modbus connection to helios and no data from helios or a connection problem to mqtt server. Use witch care - you have to make sure the process gets restarted after it exits, e.g. using pm2 or similar.

### FHEM integration

Based on this deamon it's easy to add your Helios easycontrols modbus tcp device to FHEM:

1. Define a MQTT IODev and set everything up, see FHEM Wiki: https://wiki.fhem.de/wiki/MQTT_Einf%C3%BChrung.
2. Add a MQTT_DEVICE:
```
define helios MQTT_DEVICE
attr helios retain 0
attr helios qos 0
attr helios autoSubscribeReadings helios/status/+
attr helios subscribeReading_connected helios/connected
```

## License

MIT © [Markus Reschka](https://github.com/mreschka)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE

## Credits

Thanks to [hobbyquaker](https://github.com/hobbyquaker) for your work on smarthome and hm2mqtt! This work is based on your ideas. First start for this was [xyz2mqtt-skeleton](https://github.com/hobbyquaker/xyz2mqtt-skeleton).
