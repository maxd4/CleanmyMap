#!/usr/bin/env node

import { createWriteStream } from "node:fs";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const [, , filePath, rawLimit] = process.argv;
const limit = Number(rawLimit);
if (!filePath || !Number.isSafeInteger(limit) || limit < 256) {
  process.stderr.write("Usage: capture-bounded-log.mjs <private-log-path> <max-bytes>\n");
  process.exitCode = 2;
} else {
  const marker = Buffer.from("\n[private diagnostic log truncated]\n", "utf8");
  const capacity = limit - marker.length;
  const retained = Buffer.allocUnsafe(capacity);
  let next = 0;
  let size = 0;
  let total = 0;
  const ring = new Transform({
    transform(chunk, _encoding, callback) {
      total += chunk.length;
      for (let offset = 0; offset < chunk.length;) {
        const length = Math.min(chunk.length - offset, capacity - next);
        chunk.copy(retained, next, offset, offset + length);
        next = (next + length) % capacity;
        size = Math.min(capacity, size + length);
        offset += length;
      }
      callback();
    },
    flush(callback) {
      if (size < capacity || next === 0) this.push(retained.subarray(0, size));
      else {
        this.push(retained.subarray(next));
        this.push(retained.subarray(0, next));
      }
      if (total > capacity) this.push(marker);
      callback();
    },
  });
  try {
    await pipeline(process.stdin, ring, createWriteStream(filePath, { flags: "w", mode: 0o600 }));
  } catch {
    process.exitCode = 1;
  }
}
