import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { assertPersistenceAvailable } from "@/lib/persistence/runtime-store";

const STORE_FILE = join(
  process.cwd(),
  "data",
  "local-db",
  "community_bug_reports.json",
);

export type BugReportInput = {
  reportType: "bug" | "idea";
  title: string;
  description: string;
  pagePath: string | null;
};

export type BugReportRecord = BugReportInput & {
  id: string;
  createdAt: string;
  submittedByUserId: string;
  source: "discussion_form";
  status: "open";
};

type StorePayload = {
  updatedAt: string;
  records: BugReportRecord[];
};

function emptyStore(): StorePayload {
  return {
    updatedAt: new Date().toISOString(),
    records: [],
  };
}

async function ensureDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

async function readStore(): Promise<StorePayload> {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as StorePayload;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.records)) {
      return emptyStore();
    }
    return {
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
      records: parsed.records,
    };
  } catch {
    return emptyStore();
  }
}

async function writeStore(store: StorePayload): Promise<void> {
  await ensureDirectory(STORE_FILE);
  await writeFile(
    STORE_FILE,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        records: store.records,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

export async function appendCommunityBugReport(params: {
  submittedByUserId: string;
  input: BugReportInput;
}): Promise<BugReportRecord> {
  assertPersistenceAvailable("community_bug_reports");

  const record: BugReportRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    submittedByUserId: params.submittedByUserId,
    source: "discussion_form",
    status: "open",
    ...params.input,
  };

  const store = await readStore();
  const records = [record, ...store.records].slice(0, 4000);
  await writeStore({ updatedAt: new Date().toISOString(), records });
  return record;
}
