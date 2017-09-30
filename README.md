# helios2mqtt

[![NPM version](https://badge.fury.io/js/helios2mqtt.svg)](http://badge.fury.io/js/helios2mqtt)
[![License][mit-badge]][mit-url]

> A deamon for syncing a helios easy controls system like my KWL EC 220D to mqtt following the [mqtt-smarthome](https://github.com/mqtt-smarthome) architecure.

Based on the idea of [mqtt-smarthome](https://github.com/mqtt-smarthome) and especially on the work of hobbyquaker [hm2mqtt.js](https://github.com/hobbyquaker/hm2mqtt.js) I decided to build a bridge for my helios KWL system to mqtt.

At the momemnt only "status" reading is working, set anything is not implemented so far.

Please read the --help output for commandline options. I tried to stick as close as possible to hm2mqtt.js.

### Getting started

* Install

```sudo npm install -g helios2mqtt```

As hobbyquaker I also suggest to use pm2 to manage the hm2mqtt process (start on system boot, manage log files, ...). There is a really good howto at the [mqtt-smarthome repo](https://github.com/mqtt-smarthome/mqtt-smarthome/blob/master/howtos/homematic.md)

* Usage 

```helios2mqtt --help```  

* Customization

If you would like to change the variables which are read from the helios modbus tcp interface have a look at the file helios_vars.json file (if you installed using above nmp install -g you will find it at /usr/lib/node_modules/helios2mqtt/helios_vars.json). If someone can tell me how to make that file "user customizable" in an more elegant way, e.g. in user's home directory please send me an email!

## License

MIT © [Markus Reschka](https://github.com/mreschka)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE

## Credits

Thanks to [hobbyquaker](https://github.com/hobbyquaker) for your work on smarthome an hm2mqtt! This work is based on your ideas. First start for this was [xyz2mqtt-skeleton](https://github.com/hobbyquaker/xyz2mqtt-skeleton).
