/**
 * @project omegle-tv
 * @author Rocky Breslow <breslowrocky@gmail.com>
 * @license The MIT License (MIT)
 */

'use strict';

var cluster   = require('cluster'),
    SlackBot  = require('slackbots'),
    Logger    = require('./lib/Logger'),
    Event     = require('./lib/Event'),
    EventEnum = require('./lib/EventEnum');

// worker process which interfaces with Omegle
    require('./lib/OmegleWorker');
    return;
}

/**
 * First Omegle interface.
 * @type {Worker}
 */
var aWorker = cluster.fork();

/**
 * Second Omegle interface.
 * @type {Worker}
 */
var bWorker = cluster.fork();

/**
 * Whether or not we're currently connected
 * @type {boolean}
 */
var isSessionActive = false;

/**
 * Whether or not we've recieved common likes this session
 * @type {boolean}
 */
var gotLikes = false;

/**
 * Topics to for Omegle
 * @type {string[]}
 */
var topics = [];

/**
 * The SlackBot instance
 * @type {SlackBot}
 */
var slackBot = new SlackBot({
    token: process.env.SLACK_TOKEN,
    name: 'ManInTheMiddle'
});

slackBot.on('message', function(event) {
    // when we recieve a chat message
    if(event.type === 'message') {
        // match command and arguments
        var command = event.text.match(/^!(\S+)/i);
        var args = event.text.match(/^!\S+ (.+)/i);

        // if no command specified end here
        if(!command) {
            return;
        }

        // set the command equal to the command string
        command = command[1];

        // set arguments equal to an array of argument strings or an empty array
        if(args) {
            args = args[1].split(' ');
        } else {
            args = [];
        }

        // define commands here
        switch(command) {
            case 'topic':
                if(args) {
                    topics = args;
                } else {
                    // if no arguments then we want to clear topics
                    topics = [];
                }

                // generate a pretty string representation of the topics array
                var str = '';
                for(var i = 0; i < topics.length; i++) {
                    str += '_' + topics[i] + '_, ';
                }
                str = str.substring(0, str.length - 2);
                str += '.';

                // command output
                if(topics.length > 0) {
                    slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, 'Topics set for next chat: ' + str, {
                        username: 'ManInTheMiddle',
                        icon_url: process.env.SLACK_ICON
                    });

                    // forward topics to workers
                    aWorker.send({ event: new Event(EventEnum.TOPICS, topics)});
                    bWorker.send({ event: new Event(EventEnum.TOPICS, topics)});
                } else {
                    slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, 'Topics cleared for next chat.', {
                        username: 'ManInTheMiddle',
                        icon_url: process.env.SLACK_ICON
                    });

                    // forward empty topics to workers
                    aWorker.send({ event: new Event(EventEnum.TOPICS, [])});
                    bWorker.send({ event: new Event(EventEnum.TOPICS, [])});
                }

                break;

            case 'retry':
                // command output
                slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, '*_Disconnected from chat partners. Retrying..._*', {
                    username: 'ManInTheMiddle',
                    icon_url: process.env.SLACK_ICON
                }, function() {
                    killAll();
                    regularRestart();
                });
                break;
            case 'saya':
                if(isSessionActive) {
                    slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, '```' + args.join(" ") + '```', {
                        username: 'Person A',
                        icon_url: process.env.SLACK_ICON_A
                    });

                    bWorker.send({ event: new Event(EventEnum.MESSAGE, args.join(" ")) });
                }

                break;
            case 'sayb':
                if(isSessionActive) {
                    slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, '```' + args.join(" ") + '```', {
                        username: 'Person B',
                        icon_url: process.env.SLACK_ICON_B
                    });

                    aWorker.send({ event: new Event(EventEnum.MESSAGE, args.join(" ")) });
                }
                break;
        }

    }
});

// route messages between workers
aWorker.on('message', function(message) {
    // extract event from message
    var event = message.event;

    if(event.type === EventEnum.ON_CONNECT && !isSessionActive) {
        isSessionActive = true;

        // generate pretty string based on the topics
        var connectedStr = '*_Connected to new chat partners..._*';
        if(topics.length > 0) {
            connectedStr += ' (';
            for(var i = 0; i < topics.length; i++) {
                connectedStr += '*' + topics[i] + '*, ';
            }
            connectedStr = connectedStr.substring(0, connectedStr.length - 2);
            connectedStr += ')';
        }

        // alert that we are now connecting to new partners
        slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, connectedStr, {
            username: 'ManInTheMiddle',
            icon_url: process.env.SLACK_ICON
        });

        return;
    }

    // ignore if we're not connected
    if(!isSessionActive) {
        return;
    }

    if(event.type === EventEnum.DISCONNECT) {
        // notify the group
        slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, '*Person A* disconnected.', {
            username: 'ManInTheMiddle',
            icon_url: process.env.SLACK_ICON
        }, function() {
            killAll();
            regularRestart();
        });
        Logger.info('info', 'stranger disconnected restarting both workers');
        return;
    }

    // restart if idle
    if(event.type === EventEnum.IDLE) {
        idleRestart();
        return;
    }

    // restart if connection error
    if(event.type === EventEnum.CONNECTION_ERROR) {
        killAll();
        connectionErrorRestart();
        return;
    }

    // post message on Slack
    if(event.type === EventEnum.MESSAGE) {
        slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, '```' + message.event.data + '```', {
            username: 'Person A',
            icon_url: process.env.SLACK_ICON_A
        });
    }

    // common likes
    if(event.type === EventEnum.LIKE && !gotLikes) {
        gotLikes = true;

        // generate pretty string based on the likes
        var likeStr = 'You both like: ';
        if(event.data.length > 0) {
            for(var j = 0; j < event.data.length; j++) {
                likeStr += '_' + event.data[j] + '_, ';
            }
            likeStr = likeStr.substring(0, likeStr.length - 2);
        }

        // alert that we are now connecting to new partners
        slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, likeStr, {
            username: 'ManInTheMiddle',
            icon_url: process.env.SLACK_ICON
        });
    }

    bWorker.send(message);
});
bWorker.on('message', function(message) {
    // extract event from message
    var event = message.event;

    if(event.type === EventEnum.ON_CONNECT && !isSessionActive) {
        isSessionActive = true;

        // generate pretty string based on the topics
        var connectedStr = '*_Connected to new chat partners..._*';
        if(topics.length > 0) {
            connectedStr += ' (';
            for(var i = 0; i < topics.length; i++) {
                connectedStr += '*' + topics[i] + '*, ';
            }
            connectedStr = connectedStr.substring(0, connectedStr.length - 2);
            connectedStr += ')';
        }

        // alert that we are now connecting to new partners
        slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, connectedStr, {
            username: 'ManInTheMiddle',
            icon_url: process.env.SLACK_ICON
        });

        return;
    }

    // ignore if we're not connected
    if(!isSessionActive) {
        return;
    }

    if(event.type === EventEnum.DISCONNECT) {
        killAll();
        // notify the group
        slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, '*Person B* disconnected.', {
            username: 'ManInTheMiddle',
            icon_url: process.env.SLACK_ICON
        }, function() {
            regularRestart();
        });

        Logger.info('info', 'stranger disconnected restarting both workers');
        return;
    }

    // restart if idle
    if(event.type === EventEnum.IDLE) {
        idleRestart();
        return;
    }

    // restart if connection error
    if(event.type === EventEnum.CONNECTION_ERROR) {
        killAll();
        connectionErrorRestart();
        return;
    }

    // post message on Slack
    if(event.type === EventEnum.MESSAGE) {
        slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, '```' + message.event.data + '```', {
            username: 'Person B',
            icon_url: process.env.SLACK_ICON_B
        });
    }

    // common likes
    if(event.type === EventEnum.LIKE && !gotLikes) {
        gotLikes = true;

        // generate pretty string based on the likes
        var likeStr = 'You both like: ';
        if(event.data.length > 0) {
            for(var j = 0; j < event.data.length; j++) {
                likeStr += '_' + event.data[j] + '_, ';
            }
            likeStr = likeStr.substring(0, likeStr.length - 2);
        }

        // alert that we are now connecting to new partners
        slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, likeStr, {
            username: 'ManInTheMiddle',
            icon_url: process.env.SLACK_ICON
        });
    }

    aWorker.send(message);
});

function regularRestart() {
    if(!isSessionActive) {
        return;
    }

    isSessionActive = false;
    gotLikes = false;

    // generate pretty string based on the topics
    var lookingStr = '*_Looking for new chat partners..._*';
    if(topics.length > 0) {
        lookingStr += ' (';
        for(var i = 0; i < topics.length; i++) {
            lookingStr += '*' + topics[i] + '*, ';
        }
        lookingStr = lookingStr.substring(0, lookingStr.length - 2);
        lookingStr += ')';
    }

    // notify the group that we're searching for new partners
    slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, lookingStr, {
        username: 'ManInTheMiddle',
        icon_url: process.env.SLACK_ICON
    }, function() {
        // send a restart signal when done
        aWorker.send({event:new Event(EventEnum.RESTART, null)});
        bWorker.send({event:new Event(EventEnum.RESTART, null)});
    });
}

/**
 * Preforms a restart based on Omegle giving a connection error
 */
function connectionErrorRestart() {
    if(!isSessionActive) {
        return;
    }

    slackBot.postMessageToChannel(process.env.SLACK_CHANNEL, '*_Error connecting to Omegle. Retrying..._*', {
        username: 'ManInTheMiddle',
        icon_url: process.env.SLACK_ICON
    }, function() {
        regularRestart();
    });
}

/**
 * Sends kill event to both workers
 */
function killAll() {
    aWorker.send({event:new Event(EventEnum.KILL, null)});
    bWorker.send({event:new Event(EventEnum.KILL, null)});
}