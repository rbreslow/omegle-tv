/**
 * @overview
 * @author Rocky Breslow <breslowrocky@gmail.com>
 * @license The MIT License (MIT)
 */

/**
 * @module Omegle
 */

'use strict';

var util         = require('util'),
    EventEmitter = require('events').EventEmitter,
    request      = require('request');

/**
 * Constructs a new class for interfacing with Omegle
 *
 * @class Omegle
 * @classdesc A class for interfacing with http://omegle.com/ in JavaScript. Works with standard text based conversations.
 *
 * @param {Object} config - The object that holds the initial configuration to use for Omegle.
 * @param {string[]} [config.topics] - The topics that we will initially present to Omegle.
 * @param {string[]} [config.addresses] - The local network addresses to use to connect to Omegle. This is so dedicated servers with multiple NICs can connect via different external IP addresses to avoid detection.
 */

function Omegle(config) {
    var self = this;

    /**
     * The topics for the chat session.
     * @type {string[]}
     */
    this.topics = config.topics || [];

    /**
     * The local network addresses to connect to Omegle with.
     * @type {string[]}
     * @private
     */
    this._addresses = config.addresses || [];


    /**
     * Random ID for Omegle
     * @type {string}
     * @private
     */
    this._id = Omegle._getRandId();

    /**
     * Object to make requests to Omegle's API with.
     * @type {Object}
     * @private
     */
    if(this._addresses.length > 0) {
        this._request = request.defaults({
            localAddress: self._addresses[Math.floor(Math.random() * self._addresses.length)],
            baseUrl: 'http://' + Omegle._getRandServer() + '/',
            json: true
        });
    } else {
        this._request = request.defaults({
            baseUrl: 'http://' + Omegle._getRandServer() + '/',
            json: true
        });
    }

    /**
     * Needed for all subsequent requests.
     * @type {string}
     * @private
     */
    this._clientId = '';

    /**
     * Placeholder for intervalTimer to process events.
     * @type {Object}
     * @private
     */
    this._eventInterval = {};

    // call the inherited class constructor
    EventEmitter.call(this);
}

// inherit from the EventEmitter class
util.inherits(Omegle, EventEmitter);

/**
 * Queries Omegle's servers for any new events.
 * @private
 */
Omegle.prototype._getEvents = function() {
    var self = this;

    this._request.post({url: '/events', form: {id: this._clientId}}, function(err, res, body) {
        if(err) {
            return new Error('Failed to retrieve events.');
        }

        if(!body) {
            return;
        }

        for(var i = 0; i < body.length; i++) {
            var event = body[i];

            switch(event[0]) {
                case 'waiting':
                    /**
                     * Waiting to be matched with a stranger event.
                     *
                     * @event Omegle#waiting
                     */
                    self.emit('waiting');
                    break;
                case 'connected':
                    /**
                     * Connected to chat session event.
                     *
                     * @event Omegle#connnected
                     */
                    self.emit('connected');
                    break;
                case 'gotMessage':
                    /**
                     * Recieved message from stranger event.
                     *
                     * @event Omegle#gotMessage
                     * @type {string}
                     */
                    self.emit('gotMessage', event[1]);
                    break;
                case 'strangerDisconnected':
                    /**
                     * Stranger disconnected event.
                     *
                     * @event Omegle#strangerDisconnected
                     */
                    self.emit('strangerDisconnected');

                    // cut off our chat session
                    clearInterval(self._eventInterval);
                    break;
                case 'typing':
                    /**
                     * Stranger started typing event.
                     *
                     * @event Omegle#typing
                     */
                    self.emit('typing');
                    break;
                case 'stoppedTyping':
                    /**
                     * Stranger stopped typing event.
                     *
                     * @event Omegle#stoppedTyping
                     */
                    self.emit('stoppedTyping');
                    break;
                case 'recaptchaRequired':
                    /**
                     * Recaptcha required event.
                     * You must prove that you're a human by fetching the captcha using the URL-encoded passed code from the event on {@link http://www.google.com/recaptcha/api/image?c=[challenge]}.
                     *
                     * @event Omegle#recaptchaRequired
                     * @type {string}
                     */
                    self.emit('recaptchaRequired', event[1]);
                    break;
                case 'recaptchaRejected':
                    /**
                     * Recaptcha rejected event.
                     *
                     * @event Omegle#recaptchaRejected
                     * @type {string}
                     *
                     * @see Omegle#event:recaptchaRequired
                     */
                    self.emit('recaptchaRejected', event[1]);
                    break;
                case 'error':
                    /**
                     * Error event.
                     *
                     * @event Omegle#error
                     * @type {string}
                     */
                    self.emit('error', event[1]);

                    // cut off our chat session
                    clearInterval(self._eventInterval);
                    break;
                case 'commonLikes':
                    /**
                     * Recieved common likes from partner event.
                     *
                     * @event Omegle#commonLikes
                     * @type {string[]}
                     */
                    self.emit('commonLikes', event[1]);
                    break;
                case 'antinudeBanned':
                    /**
                     * Got banned event.
                     *
                     * @event Omegle#antinudeBanned
                     */
                    self.emit('antinudeBanned');

                    // cut off our chat session
                    clearInterval(self._eventInterval);
                    break;
            }
        }
    });
};

/**
 * Opens a chat session.
 * @param {Omegle~onConnect} done
 */
Omegle.prototype.connect = function(done) {
    var self = this;

    var uri = '/start?rcs=1&firstevents=1&spid=&randid=' + this._id;

    if(this.topics.length > 0) {
        uri += '&topics=' + encodeURIComponent(JSON.stringify(this.topics));
    }

    this._request(uri, function(err, res, body) {
        if(err) {
            return done(err);
        } else if(!body.clientID) {
            return done(new Error('Failed to retrieve `clientID` from Omegle.'));
        }

        self._clientId = body.clientID;

        self._eventInterval = setInterval(function() {
            self._getEvents();
        }, 2500);

        done();
    });
};

/**
 * @callback Omegle~onConnect
 * @param {Error} err
 */

/**
 * Gracefully ends chat session.
 * @param {Omegle~onDisconnect} done
 */
Omegle.prototype.disconnect = function(done) {
    clearInterval(this._eventInterval);

    this._request.post({url: '/disconnect', form: {id: this._clientId}}, function(err, res, body) {
        if(err) {
            return done(err);
        }

        //TODO: disconnect !0
        done();
    });
};

/**
 * @callback Omegle~onDisconnect
 * @param {Error} err
 */

/**
 * Sends a message to chat session.
 * @param {string} message
 * @param {Omegle~onMessageSent} done
 */
Omegle.prototype.sendMessage = function(message, done) {
    this._request.post({url: '/send', form: {msg: message, id: this._clientId}}, function(err, res, body) {
        if(err) {
            return done(err);
        }

        done();
    });
};

/**
 * @callback Omegle~onMessageSent
 * @param {Error} err
 */


/**
 * Set your typing status.
 * @param {Omegle~onTyping} done
 */
Omegle.prototype.typing = function(done) {
    this._request.post({url: '/typing', form: {id: this._clientId}}, function(err, res, body) {
        if(err) {
            return done(err);
        }

        done();
    });
};

/**
 * @callback Omegle~onTyping
 * @param {Error} err
 */

/**
 * Set your typing status.
 * @param {Omegle~onStoppedTyping} done
 */
Omegle.prototype.stoppedTyping = function(done) {
    this._request.post({url: '/stoppedtyping', form: {id: this._clientId}}, function(err, res, body) {
        if(err) {
            return done(err);
        }

        done();
    });
};

/**
 * @callback Omegle~onStoppedTyping
 * @param {Error} err
 */

/**
 * Prove that you're a human.
 *
 * @param {string} challenge - URL-encoded passed code from {@link Omegle#event:recaptchaRequired}.
 * @param {string} answer - Answer to the captcha.
 * @param {Omegle~onSubmitRecaptcha} done
 *
 * @see Omegle#event:recaptchaRequired
 * @see Omegle#event:recaptchaRequired
 */
Omegle.prototype.submitRecaptcha = function(challenge, answer, done) {
    this._request.post({url: '/recaptcha', form: {challenge: challenge, response: answer, id: this._clientId}}, function(err, res, body) {
        if(err) {
            return done(err);
        }

        done();
    });
};

/**
 * @callback Omegle~onSubmitRecaptcha
 * @param {Error} err
 */

/**
 * Omegle's master server list.
 * @type {string[]}
 * @private
 */
Omegle._servers = [
    'front1.omegle.com',
    'front2.omegle.com',
    'front3.omegle.com',
    'front4.omegle.com',
    'front5.omegle.com',
    'front6.omegle.com',
    'front7.omegle.com',
    'front8.omegle.com',
    'front9.omegle.com',
    'front10.omegle.com',
    'front11.omegle.com',
    'front11.omegle.com',
    'front12.omegle.com',
    'front13.omegle.com',
    'front14.omegle.com',
    'front15.omegle.com',
    'front16.omegle.com'
];

/**
 * Selects a random server from the Omegle master server list.
 *
 * @returns {string} - a server hostname
 * @private
 *
 * @see {@link Omegle~_servers}
 */
Omegle._getRandServer = function() {
    return this._servers[Math.floor(Math.random() * this._servers.length)];
};

/**
 * Omegle's official algorithm to generate a client ID. Really just a random string containing 2-9 and A-Z.
 *
 * @returns {string}
 * @private
 */
Omegle._getRandId = function() {
    for (var a = "", b = 0; 8 > b; b++) {
        var c = Math.floor(32 * Math.random());
        a = a + "23456789ABCDEFGHJKLMNPQRSTUVWXYZ".charAt(c);
    }

    return a
};

module.exports = Omegle;