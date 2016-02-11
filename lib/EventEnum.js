/**
 * @overview
 * @author Rocky Breslow <breslowrocky@gmail.com>
 * @license The MIT License (MIT)
 */

/**
 * @module EventEnum
 */

'use strict';

/**
 * Enum for events between worker and main process.
 * @enum {number}
 */
module.exports = {
    ON_CONNECT: 0,
    TYPING: 1,
    STOP_TYPING: 2,
    DISCONNECT: 3,
    MESSAGE: 4,
    IDLE: 5,
    CONNECTION_ERROR: 6,
    RESTART: 7,
    TOPICS: 8,
    LIKE: 9,
    KILL: 10
};