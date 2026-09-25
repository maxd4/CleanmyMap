"use client";

import { createContext, useContext, type ReactNode } from "react";

const ChatSurfaceActivityContext = createContext(true);

export function ChatSurfaceActivityProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <ChatSurfaceActivityContext.Provider value={active}>
      {children}
    </ChatSurfaceActivityContext.Provider>
  );
}

export function useChatSurfaceActivity(): boolean {
  return useContext(ChatSurfaceActivityContext);
}
