'use strict';

const {Writable} = require('stream');

function validate(text, jsonStreaming) {
  let index = 0;
  let count = 0;
  while (index < text.length) {
    while (index < text.length && /\s/.test(text[index])) index += 1;
    if (index >= text.length) break;
    const start = index;
    const first = text[index];
    if (first === '{' || first === '[') {
      const closing = first === '{' ? '}' : ']';
      const stack = [closing];
      let string = false;
      let escaped = false;
      index += 1;
      for (; index < text.length && stack.length; index += 1) {
        const char = text[index];
        if (string) {
          if (escaped) escaped = false;
          else if (char === '\\') escaped = true;
          else if (char === '"') string = false;
        } else if (char === '"') string = true;
        else if (char === '{') stack.push('}');
        else if (char === '[') stack.push(']');
        else if (char === '}' || char === ']') {
          if (stack.pop() !== char) throw new Error('Verifier cannot parse input: mismatched container');
        }
      }
      if (stack.length || string || escaped) throw new Error('Verifier has expected a complete value');
    } else if (first === '"') {
      let escaped = false;
      index += 1;
      for (; index < text.length; index += 1) {
        const char = text[index];
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') { index += 1; break; }
      }
      if (escaped || text[index - 1] !== '"') throw new Error('Verifier has expected a complete string');
    } else {
      const match = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(index));
      if (!match) throw new Error('Verifier cannot parse input: expected a value');
      index += match[0].length;
    }
    JSON.parse(text.slice(start, index));
    count += 1;
    if (!jsonStreaming) {
      while (index < text.length && /\s/.test(text[index])) index += 1;
      if (index < text.length) throw new Error('Verifier cannot parse input: unexpected characters');
    }
  }
  if (!count) throw new Error('Verifier has expected a value');
}

class Verifier extends Writable {
  static make(options) {
    return new Verifier(options);
  }

  constructor(options) {
    super();
    this.jsonStreaming = Boolean(options && options.jsonStreaming);
    this.chunks = [];
  }

  _write(chunk, encoding, callback) {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk));
    callback();
  }

  _final(callback) {
    try {
      validate(this.chunks.join(''), this.jsonStreaming);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

Verifier.verifier = Verifier.make;
Verifier.make.Constructor = Verifier;

module.exports = Verifier;
