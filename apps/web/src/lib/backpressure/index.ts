export interface BackpressureConfig {
  maxConcurrent: number;
  queueSize: number;
  timeoutMs: number;
  dropPolicy: "delay" | "drop-newest" | "drop-oldest";
}

export interface BackpressureResult {
  allowed: boolean;
  position?: number;
  retryAfter?: number;
  reason?: string;
}

interface QueueItem {
  id: string;
  timestamp: number;
  priority: number;
}

const activeOperations = new Map<string, number>();
const queues = new Map<string, QueueItem[]>();

export function getBackpressureConfig(operationType: string): BackpressureConfig {
  const configs: Record<string, BackpressureConfig> = {
    import: {
      maxConcurrent: 2,
      queueSize: 10,
      timeoutMs: 300000,
      dropPolicy: "drop-newest",
    },
    batch: {
      maxConcurrent: 5,
      queueSize: 20,
      timeoutMs: 60000,
      dropPolicy: "delay",
    },
    event: {
      maxConcurrent: 10,
      queueSize: 100,
      timeoutMs: 30000,
      dropPolicy: "delay",
    },
    default: {
      maxConcurrent: 10,
      queueSize: 50,
      timeoutMs: 30000,
      dropPolicy: "delay",
    },
  };
  
  return configs[operationType] || configs["default"];
}

export function acquireBackpressure(
  operationType: string,
  operationId: string
): BackpressureResult {
  const config = getBackpressureConfig(operationType);
  const currentActive = activeOperations.get(operationType) || 0;
  
  if (currentActive >= config.maxConcurrent) {
    const queue = queues.get(operationType) || [];
    
    if (queue.length >= config.queueSize) {
      switch (config.dropPolicy) {
        case "drop-newest":
          return {
            allowed: false,
            reason: `System busy. ${config.queueSize} operations already queued. Try again later.`,
            retryAfter: 30,
          };
        case "drop-oldest":
          const dropped = queue.shift();
          if (dropped) {
            console.warn(`[Backpressure] Dropping oldest operation: ${dropped.id}`);
          }
          break;
        case "delay":
        default:
          const waitTime = Math.ceil((queue.length + 1) / config.maxConcurrent) * 5;
          return {
            allowed: false,
            reason: `System busy. Estimated wait: ${waitTime} seconds.`,
            retryAfter: waitTime,
          };
      }
    }
    
    const queueItem: QueueItem = {
      id: operationId,
      timestamp: Date.now(),
      priority: Date.now(),
    };
    queue.push(queueItem);
    queues.set(operationType, queue);
    
    const position = queue.length;
    return {
      allowed: false,
      position,
      retryAfter: Math.ceil(position / config.maxConcurrent) * 5,
      reason: `Queued at position ${position}. Processing in progress.`,
    };
  }
  
  activeOperations.set(operationType, currentActive + 1);
  return { allowed: true };
}

export function releaseBackpressure(operationType: string): void {
  const currentActive = activeOperations.get(operationType) || 1;
  const newActive = Math.max(0, currentActive - 1);
  
  if (newActive === 0) {
    activeOperations.delete(operationType);
  } else {
    activeOperations.set(operationType, newActive);
  }
  
  const queue = queues.get(operationType);
  if (queue && queue.length > 0) {
    setTimeout(() => {
      const nextItem = queue.shift();
      if (nextItem) {
        console.log(`[Backpressure] Processing queued operation: ${nextItem.id}`);
      }
    }, 100);
  }
}

export function getBackpressureStatus(operationType: string): {
  active: number;
  queued: number;
  available: boolean;
} {
  const config = getBackpressureConfig(operationType);
  const active = activeOperations.get(operationType) || 0;
  const queue = queues.get(operationType) || [];
  
  return {
    active,
    queued: queue.length,
    available: active < config.maxConcurrent && queue.length < config.queueSize,
  };
}

export function resetBackpressure(operationType?: string): void {
  if (operationType) {
    activeOperations.delete(operationType);
    queues.delete(operationType);
  } else {
    activeOperations.clear();
    queues.clear();
  }
}
