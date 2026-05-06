export type EventType = 
  | "ACTION_CREATED"
  | "ACTION_VALIDATED"
  | "ACTION_REJECTED"
  | "SPOT_CREATED"
  | "SPOT_VALIDATED"
  | "USER_REGISTERED"
  | "COMMUNITY_EVENT_CREATED"
  | "COMMUNITY_RSVP_YES"
  | "NEWSLETTER_SUBSCRIBED";

export interface EventPayload {
  ACTION_CREATED: {
    actionId: string;
    userId: string;
    locationLabel: string;
    wasteKg: number;
  };
  ACTION_VALIDATED: {
    actionId: string;
    userId: string;
    moderatorId: string;
  };
  ACTION_REJECTED: {
    actionId: string;
    userId: string;
    moderatorId: string;
  };
  SPOT_CREATED: {
    spotId: string;
    userId: string;
    label: string;
    wasteType: string;
  };
  SPOT_VALIDATED: {
    spotId: string;
    userId: string;
    moderatorId: string;
  };
  USER_REGISTERED: {
    userId: string;
    email: string;
    role: string;
  };
  COMMUNITY_EVENT_CREATED: {
    eventId: string;
    userId: string;
    title: string;
  };
  COMMUNITY_RSVP_YES: {
    eventId: string;
    userId: string;
  };
  NEWSLETTER_SUBSCRIBED: {
    email: string;
    source: string;
  };
}

export interface Event<T extends EventType = EventType> {
  id: string;
  type: T;
  payload: EventPayload[T];
  timestamp: number;
  source?: string;
}

export type EventHandler<T extends EventType = EventType> = (
  event: Event<T>
) => Promise<void> | void;

export interface EventSubscription {
  eventType: EventType;
  handler: EventHandler;
}