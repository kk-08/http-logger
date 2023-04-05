const utils = require('./src/utils');
const ResponseBuffer = require('./src/ResponseBuffer');


const REQUEST_PARAM_LOG_TITLE = {
    headers: 'headers',
    cookies: 'cookies',
    signedCookies: 'signed cookies',
    body: 'body',
    query: 'query params',
}

/**
 * @param {import('./d.ts').Options} [options={}] 
 * @returns 
 */
function getMiddleware(options = {}) {
    options = utils.sanitizeObject(options);
    _validateOptions(options);
    return _middleware.bind({ options });
}

/**
 * @param {import('./d.ts').Options} options 
 * @private 
 */
function _validateOptions(options) {
    if (options.log) {
        if (typeof options.log !== 'function') 
            throw new Error('log must be a valid function');
    }
    if (options.maxResponseSize) {
        if (typeof options.maxResponseSize !== 'number')
            throw new Error('maxResponseSize must be a valid number');
    }
}

/**
 * Middleware for request and response logging
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {import('express').NextFunction} next 
 * @private 
 */
function _middleware(req, res, next) {
    _addRequestMetadata(req);
    _logRequest(req, this.options);
    _overrideResponseForLogging(req, res, this.options);
    next();
}

/**
 * Adds metadata to request for context and logging
 * @param {import('express').Request} req 
 * @private 
 */
function _addRequestMetadata(req) {
    req.metaData = {
        id: utils.getUuid(),
        startTime: new Date(),
    };
}

/**
 * Logs request received by the application
 * @param {import('./d.ts').ModifiedRequest} req 
 * @param {import('./d.ts').Options} options 
 * @private 
 */
function _logRequest(req, options) {
    let message = `${req.method} request received from IP: ${_getClientIp(req)} on endpoint: ${req.originalUrl}`;
    const data_suffix = _getLogSuffixForProperties(req);
    if (data_suffix) message += data_suffix;
    message += ` assigned ID: ${req.metaData.id}`;

    const logger = options.log || console.log;
    logger(message);
}

/**
 * Returns IP address of client sending the request (if found)
 * @param {import('./d.ts').ModifiedRequest} req 
 * @private 
 * @returns 
 */
function _getClientIp(req) {
    return ((req.headers['x-forwarded-for'] || '').split(',').pop() || req.connection.remoteAddress ||
        req.socket.remoteAddress || req.connection.socket.remoteAddress);
}

/**
 * Returns suffix for log message basis available properties in the request
 * @param {import('./d.ts').ModifiedRequest} req 
 * @private 
 * @returns 
 */
function _getLogSuffixForProperties(req) {
    let message = '';
    for (const [param, title] of Object.entries(REQUEST_PARAM_LOG_TITLE)) {
        if (!utils.isFalsy(req[param])) message += ` ${title}: ${utils.stringify(req[param])},`;
    }
    if (message) message = ` with${message.substring(0, message.length - 1)}`;
    return message;
}

/**
 * Overrides response function(s) for logging response sent
 * @param {import('./d.ts').ModifiedRequest} req 
 * @param {import('./d.ts').Options} options 
 * @private 
 */
function _overrideResponseForLogging(req, res, options) {
    const metaData = { filePath: null, dataChunks: new ResponseBuffer(options.maxResponseSize) };
    _overrideSendFileFunction(res, metaData);
    _overrideWriteFunction(res, metaData);
    _overrideEndFunction(req, res, metaData, options);
}

/**
 * Overrides response sendFile function for logging file path, if not disabled
 * @param {import('express').Response} res 
 * @param {import('./d.ts').ResponseMetaData} metaData
 * @private
 */
function _overrideSendFileFunction(res, metaData) {
    const originalSendFile = res.sendFile
    res.sendFile = function (path, ...args) {
        metaData.filePath = path;
        originalSendFile.apply(res, arguments);
    };
}

/**
 * Overrides response write function for cumulating data for logging
 * @param {import('express').Response} res 
 * @param {import('./d.ts').ResponseMetaData} metaData
 * @private
 */
function _overrideWriteFunction(res, metaData) {
    const originalWrite = res.write;
    res.write = function (data) {
        _addChunk(metaData.dataChunks, data);
        originalWrite.apply(res, arguments);
    };
}

/**
 * Adds the given `chunk` to `dataChunks`, if non-empty
 * @param {ResponseBuffer} dataChunks
 * @param {*} chunk
 * @private
 */
function _addChunk(dataChunks, chunk) {
    if (!chunk) return;

    if (!Buffer.isBuffer(chunk)) {
        dataChunks.push(Buffer.from(chunk));
    } else {
        dataChunks.push(chunk);
    }
}

/**
 * Overrides response end function for logging the response sent for the request
 * @param {import('./d.ts').ModifiedRequest} req
 * @param {import('express').Response} res 
 * @param {import('./d.ts').ResponseMetaData} metaData
 * @param {import('./d.ts').Options} options
 * @private
 */
function _overrideEndFunction(req, res, metaData, options) {
    const originalEnd = res.end;
    res.end = function (data) {
        try {
            _addChunk(metaData.dataChunks, data);
            req.metaData.endTime = new Date();
            req.metaData.responseTime = (req.metaData.endTime - req.metaData.startTime);
            _logResponse(req, res, metaData, options);
        } catch (err) {
            const logger = options.log || console.error;
            if (options.silentErrors) {
                logger(`Error occurred while logging response body: ${err}`);
            } else {
                throw err;
            }
        } finally {
            originalEnd.apply(res, arguments);
        }
    };
}

/**
 * Logs the response sent by the application for the request
 * @param {import('./d.ts').ModifiedRequest} req 
 * @param {import('express').Response} res 
 * @param {import('./d.ts').ResponseMetaData} metaData 
 * @param {import('./d.ts').Options} options 
 * @private 
 */
function _logResponse(req, res, metaData, options) {
    let message = `Response sent with status code: ${res.statusCode}, headers: ${utils.stringify(res.getHeaders())}`;

    if (!options.fileData && metaData.filePath) {
        message += `, file: '${metaData.filePath}'`;
    } else if (metaData.dataChunks.size) {
        message += `, body: '${metaData.dataChunks.toString()}'`;
    }

    message += ` for request ID: ${req.metaData.id} in ${req.metaData.responseTime} ms`;

    const logger = options.log || console.log;
    logger(`${message}`);
}


module.exports = getMiddleware;