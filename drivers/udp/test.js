var driver = require("./driver.js");

function test(){
    udpDriver1 = new driver.Driver({rport:4567});
    udpDriver2 = new driver.Driver({rport:4568});
    udpDriver1.listen(
        (err, msg, from, server) => msgCallback(err, msg, from, server, udpDriver1),
        (err, server) => listenCallback(err, server, udpDriver1));
    udpDriver2.listen(
        (err, msg, from, server) => msgCallback(err, msg, from, server, udpDriver2),
        (err, server) => listenCallback(err, server, udpDriver2));
}

function msgCallback(err, msg, from, server, driver){
    if(err) console.log("Error listening");
    else {
         console.log("Message received from " + from.address + ", port: " + from.port);
         console.log(new String(msg));
         driver.close();
         //process.exit();
    }
}

function listenCallback(err, server, driver){
    if (!err) { 
        console.log("Listening to port " + server.port);
        console.log("Sending test message...")
        driver.send({address: "localhost", port: server.port}, "Test", function (err) {
            if (!err) console.log("Sent!");
            else console.log(err);
        });
    }
}

test();