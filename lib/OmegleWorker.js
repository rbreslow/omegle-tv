/**
 * @overview
 * @author Rocky Breslow <breslowrocky@gmail.com>
 * @license The MIT License (MIT)
 */

/**
 * @module OmegleWorker
 */

'use strict';

var Omegle    = require('./Omegle'),
    Logger    = require('./Logger'),
    Event     = require('./Event'),
    EventEnum = require('./EventEnum');

// instantiate Omegle connection object with an idle time of 60 seconds
var omegle = new Omegle({});

// connect
omegle.connect(function(err) {
    // failure connecting
    if(err) {
        Logger.log('error', process.pid + ' connection ' + err);
        process.send({ event: new Event(EventEnum.CONNECTION_ERROR, null) });
        return;
    }

    Logger.log('info', process.pid + ' connected');
    process.send({ event: new Event(EventEnum.ON_CONNECT, null)});
});

// forward message
omegle.on('gotMessage', function(message) {
    Logger.log('info', process.pid + ' got message from stranger: ' + message);
    process.send({ event: new Event(EventEnum.MESSAGE, message) });
});
// forward when user types
omegle.on('typing', function() {
    Logger.log('debug', process.pid + ' stranger typing ');
    process.send({ event: new Event(EventEnum.TYPING, null) });
});
// forward when user stops typing
omegle.on('stoppedTyping', function() {
    Logger.log('debug', process.pid + ' stranger stopped typing');
    process.send({ event: new Event(EventEnum.STOP_TYPING, null) });
});
// forward when user disconnects
omegle.on('strangerDisconnected', function() {
    Logger.log('info', process.pid + ' stranger disconnected');
    process.send({ event: new Event(EventEnum.DISCONNECT, null) });
});
// get common likes
omegle.on('commonLikes', function(arr) {
    process.send({ event: new Event(EventEnum.LIKE, arr)});
});

process.on('message', function(message) {
    // create a reference to the message's event
    var event = message.event;

    if(!(event.hasOwnProperty('type'))) {
        Logger.log('error', process.pid + ' recieved event from master process with invalid or no type specified');
        return;
    }

    switch(event.type) {
        case EventEnum.MESSAGE:
            omegle.sendMessage(event.data, function(err) {
                if(err) {
                    Logger.log('error', process.pid + ' sending message to stranger ' + err);
                    return;
                }

                Logger.log('info', process.pid + ' sent message to stranger: ' + event.data);
            });
            break;
        case EventEnum.STOP_TYPING:
            omegle.stoppedTyping(function(err) {
                if(err) {
                    Logger.log('error', process.pid + ' sending stopped typing to stranger ' + err);
                }

                Logger.log('debug', process.pid + ' sent stopped typing to stranger');
            });
            break;
        case EventEnum.TYPING:
            omegle.typing(function(err) {
                if(err) {
                    Logger.log('error', process.pid + ' sending typing to stranger ' + err);
                }

                Logger.log('debug', process.pid + ' sent typing to stranger');
            });
            break;
        case EventEnum.KILL:
            omegle.disconnect(function(err) {
                if(err) {
                    Logger.log('error', process.pid + ' error kill/disconnect');
                    return;
                }

                Logger.log('info', process.pid + ' kill/disconnect');
            });
            break;
        case EventEnum.RESTART:
            omegle.disconnect(function(err) {
                if(err) {
                    Logger.log('error', process.pid + ' error restart/disconnect');
                }

                Logger.log('info', process.pid + ' restart/disconnect');

                setTimeout(function() {
                    omegle.connect(function(err) {
                        // failure connecting
                        if(err) {
                            Logger.log('error', process.pid + ' restart/connection ' + err);
                            process.send({ event: new Event(EventEnum.CONNECTION_ERROR, null) });
                            return;
                        }

                        Logger.log('info', process.pid + ' restart/connected');
                        process.send({ event: new Event(EventEnum.ON_CONNECT, null)});
                    });
                }, 2500);
            });
            break;
        case EventEnum.TOPICS:
            omegle.topics = event.data;
            break;
    }
});