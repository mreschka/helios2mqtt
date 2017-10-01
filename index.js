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

/****************************
Startup & Init
****************************/

log.setLevel(config.verbosity);
log.info(pkg.name + ' ' + pkg.version + ' starting');
var helios = new Helios(config.jsonVariableTable, config.heliosIpAddress, config.modbusTcpPort);

helios.on('get', function (varName, res) {
    log.debug('received get event from helios for ' + varName);
    const topic = config.name + '/status/' + varName;
    if (config.jsonValues) {
        mqttPublish(topic, res, { retain: true });
    } else {
        mqttPublish(topic, res.val, { retain: true });
    }
});

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

/****************************
Startup MQTT
****************************/

log.info('mqtt trying to connect', config.mqttUrl);

const mqtt = Mqtt.connect(config.mqttUrl, {
    clientId: config.name + '_' + Math.random().toString(16).substr(2, 8),
    will: { topic: config.name + '/connected', payload: '0', retain: true },
    username: config.mqttUsername,
    password: config.mqttPassword
});

mqtt.on('connect', function () {
    mqttConnected = true;

    log.info('mqtt connected', config.mqttUrl);
    mqtt.publish(config.name + '/connected', '1', { retain: true }); // TODO eventually set to '2' if target system already connected

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
            helios.set(parts[2], payload);
            helios.get(parts[2], payload);
        } else {
            log.error('unknown variable', parts[2]);
        }
    } else if (parts.length === 3 && parts[1] === 'get') {
        if (helios.has(parts[2])) {
            // Topic <name>/get/<variableName>
            helios.get(parts[2], payload);
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
            log.debug('mqtt >', topic, payload);
        }
    });
}

/****************************
Functions
****************************/

function postConnected() {

    if (mqttConnected) {
        if (helios.modbusConnected) {
            mqtt.publish(config.name + '/connected', '2', { retain: true });
        } else {
            mqtt.publish(config.name + '/connected', '1', { retain: true });
        }
    } else {
        mqtt.publish(config.name + '/connected', '0', { retain: true });
    }
}

function stop() {
    process.exit(1);
}
