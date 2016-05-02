/*jshint esversion: 6 */

var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var Communicator = require("communicator");
var Udp = require("udp");

var nodes = [];
const KEEP_ALIVE_TIME = 10 * 1000;//10s
const url = 'mongodb://localhost:27017/controller';

function startTimer(node_id, id) {
	if (id !== undefined)
		clearTimeout(id);
	return setTimeout(() => {
		console.log("Deactivating node with id " + node_id + " due to timeout.");

	}, 2 * KEEP_ALIVE_TIME);
}

function getNetworks(cb) {
    MongoClient.connect(url, function(err, db) {
        if(err) {
            console.error(err);
            return;
        }
        var collection = db.collection('networks');
        collection.find().toArray((err, docs)=>{
            if(err){
                console.error(err);
                return;
            }
            for(var item of docs){
                item.id = String(item._id);
                delete item._id;
            }
            db.close();
            cb(docs);
        });
    });
}

/* NODE FUNCTIONS */

function nodeExists(id, cb) {
    MongoClient.connect(url, function(err, db) {
        if(err){
            console.error(err);
            return;
        }
        var collection = db.collection('nodes');
        collection.find({_id: mongo.ObjectID(id)}).toArray((err, docs) => {
            if(docs.length === 1) cb(true);
            else if (docs.length === 0) cb(false);
            else throw new Error();
            db.close();
        });
    });
}

function getNode(id, cb) {
    MongoClient.connect(url, function(err, db) {
        if(err){
            console.error(err);
            return;
        }
        var collection = db.collection('nodes');
        collection.findOne({_id: mongo.ObjectID(id)}, (err, docs) => {
            if(err){
                console.log(err);
                db.close();
                return;
            }
            db.close();
            if(docs === null) cb(new Error("Requested node id " + id + " not found"), null);
            else cb(null, docs.description);
        });
        //err caso o node não exista ou sem description
    });
}

function newNode(cb) {
    MongoClient.connect(url, function(err, db) {
        if(err){
            console.error(err);
            return;
        }
        var collection = db.collection('nodes');
        collection.insertOne({}, function(err, r){
            if(err){
                console.error(err);
                return;
            }
            db.close();
            cb(String(r.insertedId));
        });
    });
}

function deactivateNode(cb) {

}

function activateNode(cb) {

}


/*  DATA AND COMMAND FUNCTIONS */

function insertNodeData(cb) {

}

/* Human commands */
function insertNodeCommand(cb) {

}

function setNodeDescription(id, description, cb) {
    MongoClient.connect(url, function(err, db) {
        if(err){
            console.err(err);
            return;
        }
        var collection = db.collection('nodes');
        collection.updateOne({_id: mongo.ObjectID(id)}, {description: description}, null, (err, result)=>{
            if(err || result.result.ok !== 1){
                console.error("Error updating node description for node id " + id);
                if(err) console.error(err);
                db.close();
                return;
            }
            db.close();
        });
    });
}


const NETWORK_MAP = [Udp];
getNetworks((nets) => {
	nets.forEach((key, net) => {
		NETWORK_MAP[net.type].createDriver(net.params, (err, driver) => {
			if (err) {
				console.log("Failed to start network interface:");
				console.log(err);
				return;
			}
			var com = new Communicator.Communicator(driver);

			function nodeInit() {
				newNode((id) => {
					com.send(from, {
						packageType: 'iamcontroller | describeyourself | lifetime',
						'yourid': id,
						'lifetime': KEEP_ALIVE_TIME,
					});
				});
			}

			//Listens for new connections
			com.listen((obj, from) => {
				console.log("[NEW CONNECTION] (network " + net.id + ")");
				nodeInit();
			}, 'whoiscontroller');

			//Listens for reconnections
			com.listen((obj, from) => {
				console.log("[RECONNECTION] from " + obj.id + " (network " + net.id + ")");
				nodeExists(obj.id, (exists) => {
					if (exists) {
						com.send(from, {
							packageType: 'welcomeback | lifetime',
							'yourid': id,
							'lifetime': KEEP_ALIVE_TIME,
						});
					}
					else
						nodeInit();
				});
			}, 'iamback');

			//Listens for descriptions
			com.listen((obj, from) => {
				console.log("[NEW DESCRIPTION] from " + obj.id + " (network " + net.id + ")");
				obj.dataType.forEach((key, val) => {
					var desc = { nodeClass: val.nodeClass };
					if (val.nodeClass & Communicator.NODE_CLASSES.actuator)
						desc.commandType = val.commandType;
					if (val.nodeClass & Communicator.NODE_CLASSES.sensor)
						desc.dataType = val.dataType;
					setNodeDescription(obj.id, desc, () => {});
				});
				var timerId = startTimer(obj.id);
				com.listen((obj, from) => {
					console.log("[KEEP ALIVE] from " + obj.id);
					timerId = startTimer(obj.id, timerId);
				}, 'keepalive');
			}, 'description');

			//Listens for data
			com.listen((obj, from) => {
				var time = Date.now();
				console.log("[NEW DATA] from " + obj.id  + " (network " + net.id + ") at " + time);
				getNode(obj.id, (err, desc) => {
					if (err) {
						console.log("	Received data from unknown node");
						return;
					}
					obj.data.forEach((key, data) => {
						if (desc.dataType && desc.dataType[data.id] !== undefined) {
							console.log("	Data with id " + data.id + " received: " + data.value);
							insertNodeData(obj.id, time, data, () => {});
						}
						else
							console.log("	Data with id " + data.id + " not declared");
					});
				});
			}, 'data');

			//Listens for external commands
			com.listen((obj, from) => {
				var time = Date.now();
				console.log("[NEW DATA] from " + obj.id  + " (network " + net.id + ") at " + time);
				getNode(obj.id, (desc) => {
					obj.command.forEach((key, command) => {
						if (desc.commandType && desc.commandType[data.id] !== undefined) {
							console.log("	External Command with id " + command.id + " received: " + command.value);
							insertNodeCommand(obj.id, time, command, () => {});
						}
						else
							console.log("	External Command with id " + command.id + " not declared");
					});
				});
			}, 'externalcommand');
		});
	});
});
