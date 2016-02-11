/**
 * @overview
 * @author Rocky Breslow <breslowrocky@gmail.com>
 * @license The MIT License (MIT)
 */

/**
 * @module Event
 */

'use strict';

/**
 * Constructs a new event
 *
 * @class Event
 * @classdesc Wrapper class for inter-process transport of data
 *
 * @param {EventEnum} type
 * @param {Object} data
 */
function Event(type, data) {
    this.type = type;
    this.data = data;
}

module.exports = Event;