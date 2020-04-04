#!/usr/bin/env node

'use strict';

/****************************
Includes
****************************/

var pkg =       require('./package.json');
var log =       require('yalm');
var config =    require('./config.js');
var Mqtt =      require('mqtt');
var async =     require('async');
var Helios =    require('./helios.js');

/****************************
Vars
****************************/

let mqttConnected;

var variablesId = {};
var variablesName = {};
var variablesVarName = {};
var watchdogTimer;
var watchdogTriggered = false;

/****************************
Startup & Init
****************************/

log.setLevel(config.verbosity);
log.info(pkg.name + ' ' + pkg.version + ' starting');
var helios = new Helios(config.jsonVariableTable, config.heliosIpAddress, config.modbusTcpPort);

var mqttOptions;
if (config.mqttNoRetain) {
    mqttOptions = { retain: false, qos: config.mqttQos };
} else {
    mqttOptions = { retain: true, qos: config.mqttQos };
}



helios.on('get', function (varName, res) {
    log.debug('received get event from helios for ' + varName);
    const topic = config.name + '/status/' + varName;
    if (config.jsonValues) {
        mqttPublish(topic, res, mqttOptions);
    } else {
        mqttPublish(topic, res.val, mqttOptions);
    }
});

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

/****************************
Startup MQTT
****************************/

log.info('mqtt trying to connect', config.mqttUrl);
watchdogInit();

const mqtt = Mqtt.connect(config.mqttUrl, {
    clientId: config.name + '_' + Math.random().toString(16).substr(2, 8),
    will: { topic: config.name + '/connected', payload: '0', retain: true, qos: config.mqttQos },
    username: config.mqttUsername,
    password: config.mqttPassword
});

mqtt.on('connect', function () {
    mqttConnected = true;

    log.info('mqtt connected', config.mqttUrl);
    mqtt.publish(config.name + '/connected', '1', mqttOptions); // TODO eventually set to '2' if target system already connected

    log.debug('mqtt subscribe', config.name + '/set/#');
    mqtt.subscribe(config.name + '/set/#');

    log.debug('mqtt subscribe', config.name + '/get/#');
    mqtt.subscribe(config.name + '/get/#');

    postConnected();
});

mqtt.on('close', function () {
    if (mqttConnected) {
        mqttConnected = false;
        log.warn('mqtt closed ' + config.mqttUrl);
    }
});

mqtt.on('error', function (err) {
    if (mqttConnected) {
        mqttConnected = false;
        log.error('mqtt error ' + err);
    }
});

mqtt.on('offline', () => {
    if (mqttConnected) {
        mqttConnected = false;
        log.warn('mqtt offline');
    }
});

mqtt.on('reconnect', () => {
    if (mqttConnected) {
        mqttConnected = false;
        log.warn('mqtt reconnect');
    }
});

mqtt.on('message', (topic, payload) => {
    payload = payload.toString();
    log.debug('mqtt <', topic, payload);
    const parts = topic.split('/');
    if (parts.length === 3 && parts[1] === 'set') {
        if (helios.has(parts[2])) {
            // Topic <name>/set/<variableName>
            helios.set(parts[2], payload, 1);
            helios.get(parts[2], payload, 1);
        } else {
            log.error('unknown variable', parts[2]);
        }
    } else if (parts.length === 3 && parts[1] === 'get') {
        if (helios.has(parts[2])) {
            // Topic <name>/get/<variableName>
            helios.get(parts[2], payload, 1);
        } else {
            log.error('unknown variable', parts[2]);
        }
    } else {
        log.error('mqtt <', topic, payload);
    }
});

function mqttPublish(topic, payload, options) {
    if (typeof payload === 'object') {
        payload = JSON.stringify(payload);
    } else if (payload) {
        payload = String(payload);
    } else {
        payload = '';
    }
    mqtt.publish(topic, payload, options, err => {
        if (err) {
            log.error('mqtt publish', err);
        } else {
            watchdogReload();
            log.debug('mqtt >', topic, payload);
        }
    });
}

/****************************
Functions
****************************/

function watchdogTrigger() {
    if (config.watchdog > 0) {
        if (watchdogTriggered) {
            log.error('Watchdog time is up for another period, exiting');
            stop();
        } else {
            log.warn('Watchdog time is up, no data from helios for watchdog time. Trying to read dummy value.');
            helios.get("v00000", "wdg");
            watchdogTriggered = true;
            watchdogReload();
        }
    }
}

function watchdogReload() {
    if (config.watchdog > 0) {
        log.debug('Watchdog reloaded');
        clearTimeout(watchdogTimer);
        watchdogTimer = setTimeout(watchdogTrigger, config.watchdog * 1000);
    }
}

function watchdogInit() {
    if (config.watchdog > 0) {
        log.debug('Watchdog initialized');
        watchdogTimer = setTimeout(watchdogTrigger, config.watchdog * 1000);
    }
}

function postConnected() {
    if (mqttConnected) {
        if (helios.modbusConnected) {
            mqtt.publish(config.name + '/connected', '2', { retain: true, qos: config.mqttQos });
        } else {
            mqtt.publish(config.name + '/connected', '1', { retain: true, qos: config.mqttQos });
        }
    } else {
        mqtt.publish(config.name + '/connected', '0', { retain: true, qos: config.mqttQos });
    }
}

function stop() {
    process.exit(1);
}
