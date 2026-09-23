/**
 * The data behind a chat mockup — a message list a person edits by hand, not
 * anything captured from a real conversation. Kept apart from the component
 * that renders and exports it so the parts that are just data (an id, a
 * time, an initial) can be tested without a browser.
 */

export type Sender = "me" | "them";

export type MockupMessage = {
  id: string;
  from: Sender;
  text: string;
  time: string;
  type?: "text" | "voice";
  duration?: string; // voice only, e.g. "0:21"
};

let counter = 0;

/** A fresh id that sorts in creation order, for the `key` a list needs. */
export function nextMessageId(): string {
  counter += 1;
  return `msg-${Date.now()}-${counter}`;
}

export function newMessage(from: Sender, time: string): MockupMessage {
  return { id: nextMessageId(), from, text: "", time };
}

/** "10:42 AM" — the clock a phone's status bar and a chat bubble both use. */
export function defaultTime(date: Date = new Date()): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** One or two letters for an avatar that has no picture — the first letter
 * of up to the first two words, upper-cased. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]!.charAt(0);
  const second = words.length > 1 ? words[1]!.charAt(0) : "";
  return (first + second).toUpperCase();
}

/** A stable, muted colour for an avatar with no picture, from the name. */
const AVATAR_PALETTE = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6", "#ef4444", "#0ea5e9"];

export function avatarColor(name: string): string {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!;
}

export const CHAT_PLATFORMS = ["whatsapp", "imessage", "instagram-dm"] as const;
export type ChatPlatform = (typeof CHAT_PLATFORMS)[number];

export const POST_PLATFORMS = ["tweet", "instagram-post"] as const;
export type PostPlatform = (typeof POST_PLATFORMS)[number];

/** Rejects if `promise` has not settled within `ms` — a safety net around
 * html-to-image, which can hang instead of rejecting in some environments. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out saving the image.")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
