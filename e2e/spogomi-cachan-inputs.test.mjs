import assert from "node:assert/strict";
import test from "node:test";
import {
  OPERATIONAL_TIME_ZONE,
  operationalInstantAt,
  parseLocalDateTimeInTimeZone,
  teamSubmissionIdempotencyKey,
} from "./spogomi-cachan-inputs.mjs";

test("Cachan generates API-valid, unique and stable keys for every World Cup and Casual team", () => {
  const refs = ["WC-01", "WC-02", "WC-03", "WC-04", "WC-05", "WC-06", "CAS-01", "CAS-02", "CAS-03", "CAS-04", "CAS-05"];
  const firstRun = refs.map((teamRef) => teamSubmissionIdempotencyKey(teamRef));
  const resumedRun = refs.map((teamRef) => teamSubmissionIdempotencyKey(teamRef));
  assert.equal(new Set(firstRun).size, refs.length);
  assert.equal(new Set(firstRun).size, new Set(resumedRun).size);
  assert.deepEqual(resumedRun, firstRun);
  for (const key of firstRun) {
    assert.ok(key.length >= 16 && key.length <= 160);
    assert.match(key, /^cachan-[a-z0-9-]+-team-v1$/);
  }
  assert.notEqual(teamSubmissionIdempotencyKey("CAS-01"), teamSubmissionIdempotencyKey("CAS-01", 2));
});

test("Cachan converts summer and winter Paris wall clocks using the seasonal offset", () => {
  assert.equal(OPERATIONAL_TIME_ZONE, "Europe/Paris");
  assert.equal(operationalInstantAt("2030-06-01", 9), "2030-06-01T07:00:00.000Z");
  assert.equal(operationalInstantAt("2030-01-01", 9), "2030-01-01T08:00:00.000Z");
});

test("Cachan rejects invalid civil dates and nonexistent or ambiguous Paris times", () => {
  assert.throws(() => operationalInstantAt("2030-02-30", 9), /Invalid operational civil date/);
  assert.throws(() => parseLocalDateTimeInTimeZone("2030-03-31T02:30", OPERATIONAL_TIME_ZONE), /Nonexistent/);
  assert.throws(() => parseLocalDateTimeInTimeZone("2030-10-27T02:30", OPERATIONAL_TIME_ZONE), /Ambiguous/);
});

test("Cachan keeps announced Paris local hours aligned with UTC route payloads", () => {
  const checks = [
    ["2030-06-01", 9, "2030-06-01T07:00:00.000Z"],
    ["2030-01-01", 16, "2030-01-01T15:00:00.000Z"],
  ];
  for (const [date, hour, expected] of checks) {
    const instant = operationalInstantAt(date, hour);
    assert.equal(instant, expected);
    const local = new Intl.DateTimeFormat("en-CA", {
      timeZone: OPERATIONAL_TIME_ZONE,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(instant)).replace(", ", "T");
    assert.equal(local, `${date}T${String(hour).padStart(2, "0")}:00`);
  }
});
