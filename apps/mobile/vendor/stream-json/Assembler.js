'use strict';

const {EventEmitter} = require('events');

class Assembler extends EventEmitter {
  constructor() {
    super();
    this.stack = [];
    this.current = null;
    this.key = null;
    this.done = true;
  }

  get depth() {
    return (this.stack.length >> 1) + (this.done ? 0 : 1);
  }

  consume(token) {
    if (typeof this[token.name] === 'function') this[token.name](token.value);
    return this;
  }

  startObject() {
    if (this.done) this.done = false;
    else this.stack.push(this.current, this.key);
    this.current = {};
    this.key = null;
  }

  startArray() {
    if (this.done) this.done = false;
    else this.stack.push(this.current, this.key);
    this.current = [];
    this.key = null;
  }

  keyValue(value) {
    this.key = value;
  }

  stringValue(value) {
    this.save(value);
  }

  numberValue(value) {
    this.save(Number(value));
  }

  nullValue() {
    this.save(null);
  }

  trueValue() {
    this.save(true);
  }

  falseValue() {
    this.save(false);
  }

  endObject() {
    this.endContainer();
  }

  endArray() {
    this.endContainer();
  }

  endContainer() {
    if (this.stack.length) {
      const value = this.current;
      this.key = this.stack.pop();
      this.current = this.stack.pop();
      this.save(value);
    } else {
      this.done = true;
    }
  }

  save(value) {
    if (this.done) {
      this.current = value;
    } else if (Array.isArray(this.current)) {
      this.current.push(value);
    } else {
      this.current[this.key] = value;
      this.key = null;
    }
  }
}

module.exports = Assembler;
