var pkg = require('./package.json');
var config = require('yargs')
    .usage(pkg.name + ' ' + pkg.version + '\n' + pkg.description + '\n\nUsage: $0 [options]')
    .describe('v', 'possible values: "error", "warn", "info", "debug"')
    .describe('helios-ip-address', 'ip address of helios easycontrols capable ventilation system')
    .describe('modbus-tcp-port', 'port on which modbbus tcp deamon listens')
    .describe('name', 'instance name. used as mqtt client id and as prefix for connected topic')
    .describe('mqtt-url', 'mqtt broker url. See https://github.com/mqttjs/MQTT.js#connect')
    .describe('mqtt-username', 'mqtt broker username')
    .describe('mqtt-password', 'mqtt broker password')
    .describe('mqtt-no-retain', 'disable mqtt retain')
    .describe('mqtt-qos', 'mqtt qos setting')
    .describe('json-variable-table', 'A JSON file that maps helios vars to names and types')
    .describe('json-values', 'Publish values on status at mqtt as json including additional info')
    .describe('watchdog', 'timeout for internal watchdog in seconds (default: 0=off)')
    .describe('h', 'show help')
    .boolean('json-values')
    .boolean('mqtt-no-retain')
    .number('mqtt-qos')
    .choices('mqtt-qos', [0 ,1 ,2])
    .config()
    .env("HELIOS2MQTT")
    .alias({
        'a': 'helios-ip-address',
        'b': 'modbus-tcp-port',
        'j': 'json-variable-table',
        'h': 'help',
        'm': 'mqtt-url',
        'n': 'name',
        'p': 'mqtt-password',
        'q': 'mqtt-qos',
        'r': 'mqtt-no-retain',
        's': 'json-values',
        'u': 'mqtt-username',
        'w': 'watchdog',
        'v': 'verbosity'
    })
    .default({
        'b': '502',
        'j': './helios_vars.json',
        'm': 'mqtt://127.0.0.1',
        'n': 'helios',
        'q': 0,
        'w': 0,
        'v': 'info'
    })
    .version()
    .help('help')
    .argv;

module.exports = config;
