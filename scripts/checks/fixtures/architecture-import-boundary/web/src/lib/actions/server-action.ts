"use server";

import { adapter } from "../supabase/adapter";

export function serverAction() {
  return adapter;
}
