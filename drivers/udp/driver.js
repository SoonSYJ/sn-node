const dgram = require("dgram");

const BROADCAST_ADDR = "255.255.255.255";
const BROADCAST_PORT = 2356;

/**
    @class
    Creates a driver for a UDP socket
    @param {Object} params - an object with the following parameters:<br />
    <ul>
        <li>rport: The port listened by the server
        <li>address: Optional. The IP address listened by the server. If not specified, the operating system
            will attempt to listen on all addresses
        <li>broadcast_port: The port used when creating a broadcast address
    </ul>
    @param {Driver~onInitialized} [callback] - Function to be called when the driver is initialized
    
*/
function Driver(params, cb){
    if(params.rport === undefined) this._rport = params.rport

    if(params.broadcast_port)
        this.broadcast_port = params.broadcast_port;
    else this.broadcast_port = BROADCAST_PORT;

    this._server = dgram.createSocket('udp4');
    if(this._rport === undefined)
        this._server.bind();
    else
        this._server.bind(this._rport);

    this._server.on('error', (err) =>{
        if (listenCallback) cb(err);
    });

    this._server.on('listening', () =>{
        if (listenCallback) cb(null);
    });
}

/**
    Opens a UDP socket listening the port and address specified in the rport parameter
    @param {Driver~onMessage} msgCallback - Function to be called when a message arrives
    @param {Driver~onListening} [listenCallback] - Function to be called driver is listening,
        or if an error occurred
*/
Driver.prototype.listen = function (msgCallback, listenCallback) {

    this._server.on('message', msgCallback});

    listenCallback();
}

/**
    Sends a UDP packet. 
    @param {Object} to - Object containing the address object of the recipient. Contains the following fields:<br />
    <ul>
        <li>address: the target IP address
        <li>port: the target port
    @param {Buffer} message - Buffer containing the message to be sent
    @param {Driver~onSent} [callback] - Function to be called when the message was sent

*/
Driver.prototype.send = function(to, msg, callback) {
    if(to.address === BROADCAST_ADDR) this._server.setBroadcast(true);

    this._server.send(msg, to.port, to.address, (err) => {  
        if (callback) callback(err);
    }

}

/**
    Closes the UDP server, if listen() was called
*/
Driver.prototype.close = function() {    
    this._server.close();
}

/**
    Compares two addresses
    @returns {boolean} true if address1 and adress2 are the same and false otherwise
*/
Driver.compareAddresses = function(a1, a2){
    return (a1.address === a2.address);
}

/**
    Gets the broadcast network address. Only need to work when "listening" was called beforehands
    @returns {Object}  Broadcast network address
*/
Driver.prototype.getBroadcastAddress = function(){
    return {address: BROADCAST_ADDR, port: this.broadcast_port};
}

exports.Driver = Driver;

/**
 * Callback used by Driver.
 * @callback Driver~onInitialized
 * @param {Error} error - If there is a problem initializing this will be an Error object, otherwise will be null 
 */

/**
 * Callback used by listen.
 * @callback Driver~onMessage
 * @param {Buffer} message - Buffer containing the buffer received from the network
 * @param {Object} from - Object containing the address object of the transmitter
 */

/**
 * Callback used by listen.
 * @callback Driver~onListening
 * @param {Error} error - If there is a problem listening this will be an Error object, otherwise will be null 
 */

/**
 * Callback used by send.
 * @callback Driver~onSent
 * @param {Error} error - If there is a problem sending this will be an Error object, otherwise will be null 
 */ 