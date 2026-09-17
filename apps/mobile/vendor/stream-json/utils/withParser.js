'use strict';

const {Duplex} = require('stream');
const Parser = require('../Parser');

const withParser = (factory, options) => {
  const parser = new Parser(options);
  const values = factory(options);
  const bridge = new Duplex({
    readableObjectMode: true,
    read() {},
    write(chunk, encoding, callback) {
      parser.write(chunk, encoding, callback);
    },
    final(callback) {
      if (values.readableEnded) {
        callback();
        return;
      }
      values.once('end', callback);
      parser.end();
    },
    destroy(error, callback) {
      parser.destroy();
      values.destroy();
      callback(error);
    },
  });

  parser.pipe(values);
  values.on('data', value => bridge.push(value));
  values.on('end', () => bridge.push(null));
  parser.on('error', error => bridge.destroy(error));
  values.on('error', error => bridge.destroy(error));
  return bridge;
};

module.exports = withParser;
