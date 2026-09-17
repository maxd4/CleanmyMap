'use strict';

const {Transform} = require('stream');

function skipWhitespace(text, index) {
  while (index < text.length && /\s/.test(text[index])) index += 1;
  return index;
}

function scanValueEnd(text, start) {
  const first = text[start];
  if (first === '"') {
    let escaped = false;
    for (let index = start + 1; index < text.length; index += 1) {
      const char = text[index];
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') return index + 1;
    }
    return -1;
  }

  if (first === '{' || first === '[') {
    const closing = first === '{' ? '}' : ']';
    const stack = [closing];
    let string = false;
    let escaped = false;
    for (let index = start + 1; index < text.length; index += 1) {
      const char = text[index];
      if (string) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') string = false;
        continue;
      }
      if (char === '"') string = true;
      else if (char === '{') stack.push('}');
      else if (char === '[') stack.push(']');
      else if (char === '}' || char === ']') {
        if (stack.pop() !== char) throw new Error('Parser cannot parse input: mismatched container');
        if (!stack.length) return index + 1;
      }
    }
    return -1;
  }

  const rest = text.slice(start);
  const primitive = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(rest);
  if (!primitive) throw new Error('Parser cannot parse input: expected a value');
  return start + primitive[0].length;
}

function parseValues(text, jsonStreaming) {
  const values = [];
  let index = skipWhitespace(text, 0);
  while (index < text.length) {
    const end = scanValueEnd(text, index);
    if (end < 0) throw new Error('Parser has expected a complete value');
    values.push(JSON.parse(text.slice(index, end)));
    index = skipWhitespace(text, end);
    if (!jsonStreaming && index < text.length) {
      throw new Error('Parser cannot parse input: unexpected characters');
    }
  }
  if (!values.length) throw new Error('Parser has expected a value');
  return values;
}

function emitTokens(value, push) {
  if (Array.isArray(value)) {
    push({name: 'startArray'});
    for (const item of value) emitTokens(item, push);
    push({name: 'endArray'});
  } else if (value && typeof value === 'object') {
    push({name: 'startObject'});
    for (const [key, item] of Object.entries(value)) {
      push({name: 'keyValue', value: key});
      emitTokens(item, push);
    }
    push({name: 'endObject'});
  } else if (value === null) {
    push({name: 'nullValue', value: null});
  } else if (value === true) {
    push({name: 'trueValue', value: true});
  } else if (value === false) {
    push({name: 'falseValue', value: false});
  } else if (typeof value === 'number') {
    push({name: 'numberValue', value});
  } else {
    push({name: 'stringValue', value});
  }
}

class Parser extends Transform {
  static make(options) {
    return new Parser(options);
  }

  constructor(options) {
    super({readableObjectMode: true});
    this.jsonStreaming = Boolean(options && options.jsonStreaming);
    this.chunks = [];
  }

  _transform(chunk, encoding, callback) {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk));
    callback();
  }

  _flush(callback) {
    try {
      for (const value of parseValues(this.chunks.join(''), this.jsonStreaming)) {
        emitTokens(value, token => this.push(token));
      }
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

module.exports = Parser;
