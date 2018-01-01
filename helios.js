'use strict';

/****************************
Includes
****************************/

var log = require('yalm');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var modbus = require('jsmodbus');
var async = require('async');

/****************************
Classdef
****************************/

function Helios(variableTableFile, modbusIp, modbusPort) {
    // call the super constructor to initialize `this`
    EventEmitter.call(this);

    log.debug('Helios object created ', variableTableFile, modbusIp, modbusPort);
    let self = this;

    this.variablesId = {};
    this.variablesName = {};
    this.variablesVarName = {};
    this.modbusIp = modbusIp;
    this.modbusPort = modbusPort;
    this.modbusConnected = false;

    this.queue = async.queue(queueWorker.bind(this), 1);
    this.queue.pause();

    // queue debug callback
    this.queue.drain = function () {
        log.debug('Helios queue: All items have been processed');
    };

    log.debug('Helios loading variable-table', variableTableFile);
    const variableTable = require(variableTableFile);

    for (let i = 0, len = variableTable.variables.length; i < len; i++) {//TODO 3 durch len ersetzen
        let value = variableTable.variables[i];
        value.val = null;
        value.lc = null;
        log.debug("Helios variables[" + i + "]: " + JSON.stringify(value));
        this.variablesId[i] = value;
        this.variablesName[value.name] = value;
        this.variablesVarName[value.variable] = value;
        if (value.updateinterval > 0) {
            setTimeout(function () {
                log.debug('Helios reading ' + value.name + ' immediately and scheduling read interval of ' + (value.updateinterval * 1000));
                setImmediate(self.get.bind(self), value.name, null);
                setInterval(self.get.bind(self), value.updateinterval * 1000, value.name, null);
            }, i*500);
        }
    }

    log.debug('Helios: starting modbus client');

    this.modbusClient = modbus.client.tcp.complete({
        'host': modbusIp,
        'port': modbusPort,
        'autoReconnect': false,
        'reconnectTimeout': 1000,
        'timeout': 5000,
        'unitId': 180
    });

    this.modbusClient.on('connect', function () {
        log.info('Helios connected to modbus slave.');
        self.modbusConnected = true;
        self.queue.resume();
        self.emit('connect');
    });
   
    this.modbusClient.on('disconnect', function () {
        log.warn('Helios disconnected from modbus slave. Killing all queued tasks. Data loss possible.');
        self.modbusConnected = false;
        self.emit('disconnect');
        self.queue.kill();
        self.queue = async.queue(queueWorker.bind(this), 1);
        self.queue.pause();
    });

    this.modbusClient.on('error', function (err) {
        log.error('Helios error with modbus slave. Killing all queued tasks. Data loss possible.');
        log.error(err);
        self.modbusConnected = false;
        self.emit('disconnect');
        self.queue.kill();
        self.queue = async.queue(queueWorker.bind(this), 1);
        self.queue.pause();
    });

    log.debug('Helios: modbus client trigger connect');
    this.modbusClient.connect();

    setInterval(function () {
        if (!self.modbusConnected) {
            self.modbusClient.close();
            log.warn('Helios disconnected from modbus slave. Killing all queued tasks. Data loss possible.');
            self.queue.kill();
            self.queue = async.queue(queueWorker.bind(this), 1);
            self.queue.pause();
            log.info('Reconnecting modbus slave after disconnect.');
            self.modbusClient.connect();
        }
    }, 10000);
}
util.inherits(Helios, EventEmitter);

/****************************
Functions
****************************/

Helios.prototype.get = function(varName, reqId) {
    log.debug('Helios reading variable: ' + varName + ' req id ' + reqId);

    let self = this;

    let task = { heliosVar: this.variablesName[varName], method: 'get', reqId: reqId, self: self};
    this.queue.push(task, function (err) {
        if (err) {
            log.err('Helios error while ' + task.method + ' on ' + task.heliosVar.name + ':');
            log.err(err);
        } else {
            const ts = (new Date()).getTime();
            let res = {
                val: task.heliosVar.val,
                ts: ts,
                lc: task.heliosVar.lc,
                reqId: task.reqId,
                helios: task.heliosVar
            };
            log.debug('Helios emmitting get for ' + task.heliosVar.name);
            self.emit('get', task.heliosVar.name, res);
        }
    });
}

Helios.prototype.set = function(varName, value) {
    log.debug('Helios writing variable: ' + varName + ' value ' + value);

    let self = this;

    let task = { heliosVar: this.variablesName[varName], method: 'set', value: value, self: self };
    this.queue.push(task, function (err) {
        if (err) {
            log.err('Helios error while ' + task.method + ' on ' + task.heliosVar.name + ':');
            log.err(err);
        } else {
            log.debug('Helios set succeded for ' + task.heliosVar.name + ' now schedule reading it back.');
            this.get(task.heliosVar.name, null);
        }
    });
}

Helios.prototype.has = function(varName) {
    return typeof this.variablesName[varName] !== "undefined";
}

function queueWorker(task, callback) {
    log.debug('Helios queue task started: ' + task);

    if (task.self.modbusConnected) {

        if (task.method == 'get') {
            log.debug('Helios get task executing modbus write for varname ' + task.heliosVar.variable);
            task.self.modbusClient.writeMultipleRegisters(1, Buffer.from(task.heliosVar.variable + '\0\0', 'ascii')).then(function (resp) {

                log.debug('Helios get task modbus write for varname ' + task.heliosVar.variable + ' fininshed: ' + JSON.stringify(resp));

                log.debug('Helios get task executing modbus read for varname ' + task.heliosVar.variable +
                    ' with len ' + task.heliosVar.modbuslen);
                task.self.modbusClient.readHoldingRegisters(1, task.heliosVar.modbuslen).then(
                    function (resp) {
                        log.debug('Helios get task modbus read for varname ' + task.heliosVar.variable + ' fininshed: ' +
                            JSON.stringify(resp) + ' payload in ASCII: ' + resp.payload.toString('ascii'));

                        //V-Teil prüfen, abschneiden und nur Wert weitergeben:
                        var responseArr = resp.payload.toString('ascii').split("=");
                        if (responseArr.length > 1 && responseArr[0] == task.heliosVar.variable) {
                            responseArr.shift();
                            
                            const ts = (new Date()).getTime();
                            task.heliosVar.lc = ts;
                            task.heliosVar.val = decodeURIComponent(responseArr.join("=").replace(/[\u0000]+$/g, ''));
                        } else {
                            callback(new Error('Helios get task modbus write error varname ' + task.heliosVar.variable + ' did not match read result: ' + resp.payload.toString('ascii')));
                        }

                        callback();
                    }, function (error) {
                        log.debug('Helios get task modbus read error varname ' + task.heliosVar.variable + ': ' + error);
                        task.self.modbusConnected = false;
                        task.self.emit('disconnect');
                        callback(error);
                    });

            }, function (error) {
                log.debug('Helios get task modbus write error varname ' + task.heliosVar.variable + ': ' + error);
                task.self.modbusConnected = false;
                task.self.emit('disconnect');
                callback(error);
                });

        } else if (task.method == 'set') {

            log.debug('Helios set task executing modbus write for varname ' + task.heliosVar.variable + ' with value ' + task.value.toString);

            const buf = Buffer.alloc(task.heliosVar.modbuslen*2);
            buf.fill(0);
            Buffer.write(task.heliosVar.variable + '=', 0, 7, 'ascii');

            Buffer.write(7, value.toString, value.toString.length, 'ascii');

            log.debug('Helios set task modbus write raw value: ' + buf.toString);
            task.self.modbusClient.writeMultipleRegisters(1, buf).then(function (resp) {

                log.debug('Helios set task modbus write for varname ' + task.heliosVar.variable + ' with value ' + task.value.toString + ' fininshed: ' + JSON.stringify(resp));
                callback();

            }, function (error) {
                log.debug('Helios set task modbus write error varname ' + task.heliosVar.variable + ' with value ' + task.value.toString + ': ' + error);
                task.self.modbusConnected = false;
                task.self.emit('disconnect');
                callback(error);
            });

        } else {
            callback(new Error('Helios task method ' + task.method + ' not (yet) implemented.'));
        }
    } else {
        log.debug('Helios modbus not connected in task.');
        callback(new Error(task.method + ' failed since modbus is not connected.'));
    }
}

module.exports = Helios;