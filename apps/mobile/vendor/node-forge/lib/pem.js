/**
 * Javascript implementation of basic PEM (Privacy Enhanced Mail) algorithms.
 *
 * See: RFC 1421.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2013-2014 Digital Bazaar, Inc.
 *
 * A Forge PEM object has the following fields:
 *
 * type: identifies the type of message (eg: "RSA PRIVATE KEY").
 *
 * procType: identifies the type of processing performed on the message,
 *   it has two subfields: version and type, eg: 4,ENCRYPTED.
 *
 * contentDomain: identifies the type of content in the message, typically
 *   only uses the value: "RFC822".
 *
 * dekInfo: identifies the message encryption algorithm and mode and includes
 *   any parameters for the algorithm, it has two subfields: algorithm and
 *   parameters, eg: DES-CBC,F8143EDE5960C597.
 *
 * headers: contains all other PEM encapsulated headers -- where order is
 *   significant (for pairing data like recipient ID + key info).
 *
 * body: the binary-encoded body.
 */
var forge = require('./forge');
require('./util');

// shortcut for pem API
var pem = module.exports = forge.pem = forge.pem || {};

/**
 * Encodes (serializes) the given PEM object.
 *
 * @param msg the PEM message object to encode.
 * @param options the options to use:
 *          maxline the maximum characters per line for the body, (default: 64).
 *
 * @return the PEM-formatted string.
 */
pem.encode = function(msg, options) {
  options = options || {};
  var rval = '-----BEGIN ' + msg.type + '-----\r\n';

  // encode special headers
  var header;
  if(msg.procType) {
    header = {
      name: 'Proc-Type',
      values: [String(msg.procType.version), msg.procType.type]
    };
    rval += foldHeader(header);
  }
  if(msg.contentDomain) {
    header = {name: 'Content-Domain', values: [msg.contentDomain]};
    rval += foldHeader(header);
  }
  if(msg.dekInfo) {
    header = {name: 'DEK-Info', values: [msg.dekInfo.algorithm]};
    if(msg.dekInfo.parameters) {
      header.values.push(msg.dekInfo.parameters);
    }
    rval += foldHeader(header);
  }

  if(msg.headers) {
    // encode all other headers
    for(var i = 0; i < msg.headers.length; ++i) {
      rval += foldHeader(msg.headers[i]);
    }
  }

  // terminate header
  if(msg.procType) {
    rval += '\r\n';
  }

  // add body
  rval += forge.util.encode64(msg.body, options.maxline || 64) + '\r\n';

  rval += '-----END ' + msg.type + '-----\r\n';
  return rval;
};

/**
 * Decodes (deserializes) all PEM messages found in the given string.
 *
 * @param str the PEM-formatted string to decode.
 *
 * @return the PEM message objects in an array.
 */
pem.decode = function(str) {
  var rval = [];

  var rHeader = /([\x21-\x7e]+):\s*([\x21-\x7e\s^:]+)/;
  var rCRLF = /\r?\n/;
  var searchOffset = 0;

  // Find message boundaries without nested quantifiers or a backreference.
  // PEM bodies are base64 text, so the end marker cannot be part of a body.
  var findMessage = function() {
    while(true) {
      var begin = str.indexOf('-----BEGIN ', searchOffset);
      if(begin === -1) {
        return null;
      }

      var typeStart = begin + 11;
      var typeEnd = str.indexOf('-----', typeStart);
      if(typeEnd === -1) {
        return null;
      }
      var type = str.slice(typeStart, typeEnd);
      if(!/^[A-Z0-9- ]+$/.test(type)) {
        searchOffset = typeEnd + 5;
        continue;
      }

      var contentStart = typeEnd + 5;
      if(str.substr(contentStart, 2) === '\r\n') {
        contentStart += 2;
      } else if(str.charAt(contentStart) === '\n') {
        ++contentStart;
      }

      var endMarker = '-----END ' + type + '-----';
      var end = str.indexOf(endMarker, contentStart);
      if(end === -1) {
        return null;
      }

      var content = str.slice(contentStart, end);
      var separator = content.indexOf('\r\n\r\n');
      var separatorLength = 4;
      var lfSeparator = content.indexOf('\n\n');
      if(lfSeparator !== -1 &&
        (separator === -1 || lfSeparator < separator)) {
        separator = lfSeparator;
        separatorLength = 2;
      }

      var headers = null;
      var body = content;
      if(separator !== -1) {
        headers = content.slice(0, separator);
        body = content.slice(separator + separatorLength);
      }

      if(headers !== null && !/^[\x21-\x7e\s]+$/.test(headers)) {
        searchOffset = end + endMarker.length;
        continue;
      }
      if(!/^[:A-Za-z0-9+\/=\s]+$/.test(body)) {
        searchOffset = end + endMarker.length;
        continue;
      }

      searchOffset = end + endMarker.length;
      return {type: type, headers: headers, body: body};
    }
  };

  var message;
  while(true) {
    message = findMessage();
    if(!message) {
      break;
    }

    // accept "NEW CERTIFICATE REQUEST" as "CERTIFICATE REQUEST"
    // https://datatracker.ietf.org/doc/html/rfc7468#section-7
    var type = message.type;
    if(type === 'NEW CERTIFICATE REQUEST') {
      type = 'CERTIFICATE REQUEST';
    }

    var msg = {
      type: type,
      procType: null,
      contentDomain: null,
      dekInfo: null,
      headers: [],
      body: forge.util.decode64(message.body)
    };
    rval.push(msg);

    // no headers
    if(!message.headers) {
      continue;
    }

    // parse headers
    var lines = message.headers.split(rCRLF);
    var li = 0;
    while(li < lines.length) {
      // get line, trim any rhs whitespace
      var line = lines[li].replace(/\s+$/, '');

      // RFC2822 unfold any following folded lines
      for(var nl = li + 1; nl < lines.length; ++nl) {
        var next = lines[nl];
        if(!/\s/.test(next[0])) {
          break;
        }
        line += next;
        li = nl;
      }

      // parse header
      var headerMatch = line.match(rHeader);
      if(headerMatch) {
        var header = {name: headerMatch[1], values: []};
        var values = headerMatch[2].split(',');
        for(var vi = 0; vi < values.length; ++vi) {
          header.values.push(ltrim(values[vi]));
        }

        // Proc-Type must be the first header
        if(!msg.procType) {
          if(header.name !== 'Proc-Type') {
            throw new Error('Invalid PEM formatted message. The first ' +
              'encapsulated header must be "Proc-Type".');
          } else if(header.values.length !== 2) {
            throw new Error('Invalid PEM formatted message. The "Proc-Type" ' +
              'header must have two subfields.');
          }
          msg.procType = {version: values[0], type: values[1]};
        } else if(!msg.contentDomain && header.name === 'Content-Domain') {
          // special-case Content-Domain
          msg.contentDomain = values[0] || '';
        } else if(!msg.dekInfo && header.name === 'DEK-Info') {
          // special-case DEK-Info
          if(header.values.length === 0) {
            throw new Error('Invalid PEM formatted message. The "DEK-Info" ' +
              'header must have at least one subfield.');
          }
          msg.dekInfo = {algorithm: values[0], parameters: values[1] || null};
        } else {
          msg.headers.push(header);
        }
      }

      ++li;
    }

    if(msg.procType === 'ENCRYPTED' && !msg.dekInfo) {
      throw new Error('Invalid PEM formatted message. The "DEK-Info" ' +
        'header must be present if "Proc-Type" is "ENCRYPTED".');
    }
  }

  if(rval.length === 0) {
    throw new Error('Invalid PEM formatted message.');
  }

  return rval;
};

function foldHeader(header) {
  var rval = header.name + ': ';

  // ensure values with CRLF are folded
  var values = [];
  var insertSpace = function(match, $1) {
    return ' ' + $1;
  };
  for(var i = 0; i < header.values.length; ++i) {
    values.push(header.values[i].replace(/^(\S+\r\n)/, insertSpace));
  }
  rval += values.join(',') + '\r\n';

  // do folding
  var length = 0;
  var candidate = -1;
  for(var i = 0; i < rval.length; ++i, ++length) {
    if(length > 65 && candidate !== -1) {
      var insert = rval[candidate];
      if(insert === ',') {
        ++candidate;
        rval = rval.substr(0, candidate) + '\r\n ' + rval.substr(candidate);
      } else {
        rval = rval.substr(0, candidate) +
          '\r\n' + insert + rval.substr(candidate + 1);
      }
      length = (i - candidate - 1);
      candidate = -1;
      ++i;
    } else if(rval[i] === ' ' || rval[i] === '\t' || rval[i] === ',') {
      candidate = i;
    }
  }

  return rval;
}

function ltrim(str) {
  return str.replace(/^\s+/, '');
}
