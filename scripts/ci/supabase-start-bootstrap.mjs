const BOOTSTRAP_JOB_IMAGES = Object.freeze({
  realtime: "realtime",
  "storage-api": "storage",
  gotrue: "auth",
});

const BOOTSTRAP_JOB_ORDER = Object.freeze(["realtime", "storage", "auth"]);

function parseEvent(line) {
  try {
    const event = JSON.parse(line);
    return event && typeof event === "object" && !Array.isArray(event) ? event : null;
  } catch {
    return null;
  }
}

function eventAttributes(event) {
  return event.Actor?.Attributes ?? event.actor?.attributes ?? {};
}

function imageService(image) {
  const reference = String(image ?? "").split("@", 1)[0];
  const repository = reference.slice(0, reference.lastIndexOf(":") > reference.lastIndexOf("/")
    ? reference.lastIndexOf(":")
    : undefined);
  const name = repository.split("/").at(-1)?.toLowerCase();
  return BOOTSTRAP_JOB_IMAGES[name] ?? null;
}

function isPersistentServiceName(name, projectId) {
  const escapedProjectId = String(projectId).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^/?supabase_(?:realtime|storage_api|auth)_${escapedProjectId}$`, "i").test(String(name ?? ""));
}

function isProjectEvent(attributes, projectId) {
  const labels = attributes.labels ?? attributes.Labels ?? attributes;
  return typeof projectId === "string"
    && projectId.length > 0
    && labels["com.supabase.cli.project"] === projectId;
}

function projectLabelPresent(attributes) {
  const labels = attributes.labels ?? attributes.Labels ?? attributes;
  return Object.hasOwn(labels, "com.supabase.cli.project");
}

function boundedExitCode(value) {
  return /^\d{1,3}$/.test(String(value ?? "")) ? String(value) : "unknown";
}

/**
 * Summarize only Supabase 2.117.0's allowlisted one-off bootstrap jobs.
 * Raw event identifiers, names, images and labels never leave this function.
 */
export function parseSupabaseBootstrapJobs(rawEvents, projectId) {
  const jobsById = new Map();
  const events = [];

  for (const line of String(rawEvents ?? "").split(/\r?\n/u)) {
    if (!line.trim()) continue;
    const event = parseEvent(line);
    if (!event) continue;
    const action = String(event.Action ?? event.status ?? "").toLowerCase();
    if (!["create", "start", "die", "destroy", "oom"].includes(action)) continue;

    const attributes = eventAttributes(event);
    const id = String(event.Actor?.ID ?? event.actor?.id ?? "");
    if (!id) continue;
    const knownJob = jobsById.get(id);
    if (projectLabelPresent(attributes) && !isProjectEvent(attributes, projectId)) continue;
    const eventService = imageService(attributes.image ?? attributes.Image);
    const name = attributes.name ?? attributes.Name;
    if (!knownJob && (!isProjectEvent(attributes, projectId) || !eventService || isPersistentServiceName(name, projectId))) continue;
    if (knownJob && eventService && eventService !== knownJob.service) continue;
    if (knownJob && isPersistentServiceName(name, projectId)) continue;
    const service = knownJob?.service ?? eventService;
    const job = knownJob ?? { service, started: false, exitCode: "unknown", state: "created" };
    if (action === "start") {
      job.started = true;
      job.state = "running";
    } else if (action === "die") {
      job.exitCode = boundedExitCode(attributes.exitCode ?? attributes.exitcode);
      job.state = job.exitCode === "0" ? "succeeded" : job.exitCode === "unknown" ? "unknown" : "failed";
    } else if (action === "oom") {
      job.state = "failed";
    } else if (action === "destroy" && job.state === "succeeded") {
      job.state = "cleaned_up";
    }
    jobsById.set(id, job);
    events.push({ id, action, service, exitCode: job.exitCode, state: job.state });
  }

  const startedEvents = events.filter((event) => event.action === "start");
  const lastStarted = startedEvents.at(-1) ?? null;
  const firstFailed = events.find((event) => event.action === "die" && event.exitCode !== "0" && event.exitCode !== "unknown"
    || event.action === "oom") ?? null;
  const orderedJobs = [...jobsById.values()]
    .sort((left, right) => BOOTSTRAP_JOB_ORDER.indexOf(left.service) - BOOTSTRAP_JOB_ORDER.indexOf(right.service));
  const lastStartedJobState = lastStarted ? jobsById.get(lastStarted.id) : null;

  return {
    lastStartedJob: lastStarted?.service ?? null,
    lastStartedJobExitCode: lastStartedJobState?.exitCode ?? null,
    firstFailedJob: firstFailed
      ? { service: firstFailed.service, exitCode: firstFailed.exitCode, signal: firstFailed.action === "oom" ? "DOCKER_OOM" : "JOB_EXIT" }
      : null,
    jobs: orderedJobs.map((job) => `${job.service}:${job.state}:exit_${job.exitCode}`),
    observed: events.length > 0,
  };
}
