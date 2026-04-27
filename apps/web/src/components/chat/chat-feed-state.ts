export type ChatFeedState ="loading" |"empty" |"ready" |"degraded";

export type ChatFeedStateParams = {
 isLoading: boolean;
 hasMessages: boolean;
 hasError: boolean;
};

export function getChatFeedState(params: ChatFeedStateParams): ChatFeedState {
 if (params.hasError) {
 return"degraded";
 }
 if (params.isLoading) {
 return"loading";
 }
 if (!params.hasMessages) {
 return"empty";
 }
 return"ready";
}

