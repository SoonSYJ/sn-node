var driver = require("../driver.js");

function test() {
	xbeeDriverReceiver = new driver.Driver({tty_port: "/dev/ttyUSB1"}, function() {
		xbeeDriverReceiver.listen(
			(frame) => msgCallback(frame, xbeeDriverReceiver),
			(err) => listenCallback(err, xbeeDriverReceiver)
		);
	});
}

function msgCallback(frame, driver) {
	console.log("Message received from " + frame.remote64 + ":");
	console.log(String(frame.data));
	driver.close();
}

function listenCallback(err, driver) {
	if (!err) {
		console.log("Listening to serial port");
		console.log("Waiting test message...");
	} else {
		console.log("Error listening: " + err);
	}
}

test();
