'use strict';

const {Transform} = require('stream');
const Assembler = require('../Assembler');

class StreamBase extends Transform {
  constructor(options) {
    super({writableObjectMode: true, readableObjectMode: true});
    this._assembler = new Assembler(options);
    this._level = 0;
  }

  _transform(token, encoding, callback) {
    this._assembler.consume(token);
    if (this._assembler.done) this._push();
    callback();
  }

  _push() {}
}

module.exports = StreamBase;
