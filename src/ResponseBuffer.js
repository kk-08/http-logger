class ResponseBuffer {
    #capacity;
    #chunks = [];
    #size = 0;
    #is_truncated = false;

    /**
     * @param {number} capacity Maximum capacity possible for the buffer
     */
    constructor(capacity = 1024) {
        this.#capacity = capacity;
    }

    get size() {
        return this.#size;
    }

    /**
     * @param {Buffer} chunk
     */
    push(chunk) {
        if (!chunk || this.#is_truncated) return;

        if (chunk.length + this.#size < this.#capacity) {
            this.#push(chunk);
        } else {
            if (this.#size < this.#capacity) {
                this.#push(chunk.subarray(0, this.#capacity - this.#size));
            }
            this.#is_truncated = true;
        }
    }

    #push(chunk) {
        this.#chunks.push(chunk);
        this.#size += chunk.length;
    }

    toString() {
        return Buffer.concat(this.#chunks).toString('utf-8')
            + (this.#is_truncated ? `...` : ``);
    }
}

module.exports = ResponseBuffer;