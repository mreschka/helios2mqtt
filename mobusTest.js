var modbus = require('jsmodbus');

// create a modbus client 
var client = modbus.client.tcp.complete({ 
        'host'              : '192.168.178.57',
        'port'              : 502,
        'autoReconnect'     : true,
        'reconnectTimeout'  : 1000,
        'timeout'           : 3000,
        'unitId'            : 180
    });
 
client.connect();
 
// reconnect with client.reconnect() 
 
client.on('connect', function () {
 

 
//    client.writeMultipleRegisters(1, Buffer.from([0x76, 0x30, 0x30, 0x30, 0x30, 0x34, 0x00, 0x00])).then(function (resp) {
        client.writeMultipleRegisters(1, Buffer.from('v00004\0\0','ascii')).then(function (resp) {
        
        // resp will look like { fc : 16, startAddress: 4, quantity: 4 } 
        console.log(resp);

        client.readHoldingRegisters(1, 9).then(function (resp) {

            // resp will look like { fc: 3, byteCount: 20, register: [ values 0 - 10 ], payload: <Buffer> } 
            console.log(resp);
            console.log('ASCII: ' + resp.payload.toString('ascii'));
            process.exit();
        }, console.error);

    }, console.error);


});
 
client.on('error', function (err) {
 
    console.log(err);
    
})
 
// when using arrays as parameters, jsmodbus assumes that all elements inside 
// the array are 16bit values. If you want to send a bigger value (32 bit), you need 
// to send a buffer, instead of an array: 
 
//var buf = Buffer.allocUnsafe(4); // 4 bytes == 32bit 
//buf.writeInt32BE(77777);
 
// now you can call any function normally, just sending a buffer instead of an 
// array 
//client.writeMultipleRegisters(4, buf).then(function (resp) {
    // resp will look like { fc : 16, startAddress: 4, quantity: 4 } 
//    console.log(resp);
//}, console.error);

