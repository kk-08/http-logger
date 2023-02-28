const { v4: uuidv4 } = require('uuid');

module.exports = {

    /**
     * Returns the value as-is if it is a non-empty object. Returns an empty object otherwise
     * @param {*} value 
     * @returns {object}
     */
    sanitizeObject(value) {
        if (!this.isNonEmptyObject(value)) value = {};
        return value;
    },

    /**
     * Returns `true` if the received parameter is a valid and non-empty object
     * @param {*} value 
     */
    isNonEmptyObject(value) {
        return Boolean(typeof value === 'object' && Object.keys(value).length);
    },

    /**
     * Generates and returns a v4 UUID without hyphens
     * @returns 
     */
    getUuid() {
        return uuidv4().replace(/-/g, '');
    },

    /**
     * Returns `true` if the received parameter is falsy value or empty array/object
     * @param {*} value 
     */
    isFalsy(value) {
        if (Array.isArray(value)) {
            return !Boolean(value.length);
        } else if (typeof value === 'object') {
            return !this.isNonEmptyObject(value);
        } else {
            return !Boolean(value);
        }
    },

    /**
     * Returns stringified `value`
     * @param {*} value 
     * @returns {string}
     */
    stringify(value) {
        return typeof value === 'object' ? JSON.stringify(value) : value.toString();
    }
}