/*  This is a simple P2P Server with Websocket-Technik.
*   Command: 
*	-FP    Request to find a P2P-Partner.  C2S 
*   -HR    Wenn Client recv. "-CK", must Client send "-HR".   C2S
*	-IR    (In Room) Finded a P2P-Partner, you can start talking.  S2C
*   -CK	   Check if the client is online. S2C
*
*	@Copyright Lei Feng 2016 
*/




function safeSend(ws, message) {
    try {
        ws.send(message);
    } catch (e) {
        console.log(e.message);
    }
}


function Client(ws) {
    this.ws = ws;
    this.isConnected = true;
    this.requestP2P = false;
    this.isInP2P = false;
    this.hasHeartbeat = true;
    this.P2PPartner = null;
    this.sendMessageToP2PPartner = function(message) {
        try {
            this.P2PPartner.send(message);
        } catch (e) {
            //init
            this.isConnected = true;
            this.requestP2P = false;
            this.isInP2P = false;
            this.hasHeartbeat = true;
            this.P2PPartner = null;

            console.log("Error: " + e.message);
            try {
                this.ws.send("Your P2P-Partner has an Error, but you are still in Connection with Server.");
            } catch (e) {
                this.ws.close();
                this.hasHeartbeat = false;
            }
        }
    }
}

function getIdentifier(ws) {
    return ws._socket.remoteAddress + ":" + ws._socket.remotePort;
}

function heart() {
    var deadedSocketConnectionIndex = [];

    for (var i = 0; i < socketsPool.length; i++) {
        if (socketsPool[i].hasHeartbeat == false) {
            deadedSocketConnectionIndex.push(i);
        }
    }

    for (var i = deadedSocketConnectionIndex.length - 1; i >= 0; i--) {
        console.log("Index: " + deadedSocketConnectionIndex[i] + ' is die.');
        socketsPool[deadedSocketConnectionIndex[i]].ws.close();
        socketsPool.splice(deadedSocketConnectionIndex[i], 1);
    }

    for (var i = 0; i < socketsPool.length; i++) {
        try {
            socketsPool[i].ws.send("-CK");
        } catch (e) {
            console.log("Index: " + i + " " + e.message);
        }
        socketsPool[i].hasHeartbeat = false;
    }

    setTimeout(heart, 1000);
}

function loop() {
    var i = 0;
    var user1 = null,
        user2 = null;
    for (; i < socketsPool.length; i++) {
        if (socketsPool[i].requestP2P == true) {
            user1 = socketsPool[i].ws;
            break;
        }
    }
    var j = i + 1;
    for (; j < socketsPool.length; j++) {
        if (socketsPool[j].requestP2P == true) {
            user2 = socketsPool[j].ws;
            break;
        }
    }
    if (user1 != null && user2 != null) {
        socketsPool[i].isInP2P = true;
        socketsPool[i].requestP2P = false;
        socketsPool[i].P2PPartner = user2;
        socketsPool[j].isInP2P = true;
        socketsPool[j].requestP2P = false;
        socketsPool[j].P2PPartner = user1;
        console.log(getIdentifier(user1) + " and " + getIdentifier(user2) + " are in P2P-Room.");
        safeSend(user1, "-IR");
        safeSend(user2, "-IR");
    }

    setTimeout(loop, 200);
}

var _port = 14555;

var WebsocketServer = require('ws').Server;
var websocketServer = new WebsocketServer({ port: _port });

var socketsPool = [];

websocketServer.on('connection', function connection(ws) {
    console.log("Connection \nIP: " + ws._socket.remoteAddress + " Port: " +
        ws._socket.remotePort + " Time: " + new Date().toLocaleString());
    socketsPool.push(new Client(ws));

    ws.on('message', function incoming(message) {
        var index = null;
        for (var i = 0; i < socketsPool.length; i++) {
            if (socketsPool[i].ws == ws) {
                index = i;
                break;
            }
        }
        var target = socketsPool[index];
        if (message == "-FP" && socketsPool[index].isInP2P == false) {        
            target.requestP2P = true;
        } else if (message == "-HR") {
            target.hasHeartbeat = true;
        } else if (target.isInP2P == true) {
            target.sendMessageToP2PPartner(message);
        } else {
            console.log("Index: " + index + " Send: " + message);
        }

    });
});


loop();
heart();
