/**
 * @overview
 * @author Rocky Breslow <breslowrocky@gmail.com>
 * @license The MIT License (MIT)
 */

/**
 * @module Logger
 */

'use strict';

var winston  = require('winston');

/**
 * @type {winston.Logger}
 */
module.exports = new winston.Logger({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            handleExceptions: true
        }),

        new (winston.transports.File)({
            filename: 'bot.log'
        })
    ]
});