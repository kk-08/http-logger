import * as express from 'express';
import ResponseBuffer from '../src/ResponseBuffer';

declare function HTTPLogger(options: HTTPLogger.Options): express.RequestHandler;

declare namespace HTTPLogger {
    type Options = {
        /**
         * Log function to be used for logging request and response log lines
         * Defaults to `console.log`, if not specified
         */
        log?: LogFunction,
        /**
         * Set `true` if file data is to be logged instead of only the file path
         * when a file is sent in response
         */
        fileData?: boolean,
        /**
         * Set `true` if any errors in logging should be logged instead of being thrown
         * Logs would be written using the same `log` function or `console.error`
         */
        silentErrors?: boolean,
        /**
         * Response size, in `bytes`, post which the response log will be truncated
         */
        maxResponseSize?: number
    }

    type LogFunction = (msg: string) => void

    type ModifiedRequest = express.Request
        & {
            metaData: {
                id: string,
                startTime: Date,
                endTime?: Date
            }
        }

    type ResponseMetaData = { 
        filePath?: string, 
        dataChunks: ResponseBuffer 
    }
}

export = HTTPLogger;