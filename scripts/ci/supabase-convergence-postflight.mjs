#!/usr/bin/env node

import { evaluateSupabasePostflight } from "./supabase-convergence-gate.mjs";

const [eventName, status, exitCodeText] = process.argv.slice(2);
const exitCode = Number(exitCodeText);
const result = evaluateSupabasePostflight({ eventName, status, exitCode });

console.log(`SUPABASE_POSTFLIGHT: ${result.mode} ${result.reason}`);
if (!result.pass) process.exitCode = 1;
