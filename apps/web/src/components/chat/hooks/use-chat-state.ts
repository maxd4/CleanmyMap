"use client";

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatUser } from "../chat-types";

type UseChatStateParams = {
  initialChannelType: ChatChannelType;
  initialArrondissement?: number;
  initialZoneName?: string | null;
  initialRecipient?: ChatUser | null;
  initialMessage?: string;
};

export type UseChatStateModel = {
  activeChannelType: ChatChannelType;
  setActiveChannelType: Dispatch<SetStateAction<ChatChannelType>>;
  viewMode: "messages" | "graph";
  setViewMode: Dispatch<SetStateAction<"messages" | "graph">>;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  isSending: boolean;
  setIsSending: Dispatch<SetStateAction<boolean>>;
  showMentions: boolean;
  setShowMentions: Dispatch<SetStateAction<boolean>>;
  mentionQuery: string;
  setMentionQuery: Dispatch<SetStateAction<string>>;
  file: File | null;
  setFile: Dispatch<SetStateAction<File | null>>;
  isUploading: boolean;
  setIsUploading: Dispatch<SetStateAction<boolean>>;
  sendError: string | null;
  setSendError: Dispatch<SetStateAction<string | null>>;
  isEditingHandle: boolean;
  setIsEditingHandle: Dispatch<SetStateAction<boolean>>;
  newHandle: string;
  setNewHandle: Dispatch<SetStateAction<string>>;
  recipientQuery: string;
  setRecipientQuery: Dispatch<SetStateAction<string>>;
  selectedRecipient: ChatUser | null;
  setSelectedRecipient: Dispatch<SetStateAction<ChatUser | null>>;
  isRecipientPickerOpen: boolean;
  setIsRecipientPickerOpen: Dispatch<SetStateAction<boolean>>;
  selectedZone: string;
  isBugReportChannel: boolean;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  submitLockRef: MutableRefObject<boolean>;
  handleTextChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  insertMention: (handle: string) => void;
};

export function useChatState({
  initialChannelType,
  initialArrondissement,
  initialZoneName,
  initialRecipient,
  initialMessage,
}: UseChatStateParams): UseChatStateModel {
  const [activeChannelType, setActiveChannelTypeState] =
    useState<ChatChannelType>(initialChannelType);
  const [viewMode, setViewMode] = useState<"messages" | "graph">("messages");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [isSending, setIsSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<ChatUser | null>(
    initialRecipient ?? null,
  );
  const [isRecipientPickerOpen, setIsRecipientPickerOpen] = useState(
    initialChannelType === "dm",
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const submitLockRef = useRef(false);

  const selectedZone =
    initialZoneName?.trim().length
      ? initialZoneName.trim()
      : initialArrondissement
        ? `${initialArrondissement}e arrondissement`
        : "";
  const isBugReportChannel = activeChannelType === "bug_report";

  const setActiveChannelType: Dispatch<SetStateAction<ChatChannelType>> = useCallback(
    (nextValue) => {
      setActiveChannelTypeState((currentValue) => {
        const resolvedValue =
          typeof nextValue === "function" ? nextValue(currentValue) : nextValue;
        setIsRecipientPickerOpen(resolvedValue === "dm");
        setSendError(null);
        return resolvedValue;
      });
    },
    [],
  );

  const handleTextChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setMessage(value);

      const cursor = e.target.selectionStart;
      const textBefore = value.slice(0, cursor);
      const match = textBefore.match(/@([a-z0-9_]*)$/i);

      if (match) {
        setShowMentions(true);
        setMentionQuery(match[1] ?? "");
      } else {
        setShowMentions(false);
        setMentionQuery("");
      }
    },
    [],
  );

  const insertMention = useCallback(
    (handle: string) => {
      const lastAt = message.lastIndexOf("@");
      if (lastAt < 0) {
        return;
      }

      const newText =
        message.slice(0, lastAt) +
        `@${handle} ` +
        message.slice(lastAt + mentionQuery.length + 1);
      setMessage(newText);
      setShowMentions(false);
      setMentionQuery("");
    },
    [message, mentionQuery.length],
  );

  return {
    activeChannelType,
    setActiveChannelType,
    viewMode,
    setViewMode,
    message,
    setMessage,
    isSending,
    setIsSending,
    showMentions,
    setShowMentions,
    mentionQuery,
    setMentionQuery,
    file,
    setFile,
    isUploading,
    setIsUploading,
    sendError,
    setSendError,
    isEditingHandle,
    setIsEditingHandle,
    newHandle,
    setNewHandle,
    recipientQuery,
    setRecipientQuery,
    selectedRecipient,
    setSelectedRecipient,
    isRecipientPickerOpen,
    setIsRecipientPickerOpen,
    selectedZone,
    isBugReportChannel,
    fileInputRef,
    scrollRef,
    submitLockRef,
    handleTextChange,
    insertMention,
  };
}
