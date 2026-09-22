import { useRef, useState } from "react";
import { AlertTriangle, CheckCheck, Download, Plus, Trash2 } from "lucide-react";
import { toPng } from "html-to-image";
import { withTimeout } from "../utilities/mockup";
import type { CatalogTool } from "../catalog/catalog";
import {
  avatarColor,
  CHAT_PLATFORMS,
  defaultTime,
  initials,
  newMessage,
  type ChatPlatform,
  type MockupMessage,
} from "../utilities/mockup";
import { PanelShell } from "./PanelShell";
import { Select } from "./Select";
import { useT } from "../i18n/language";

const PLATFORM_LABELS: Record<ChatPlatform, string> = {
  whatsapp: "WhatsApp",
  imessage: "iMessage",
  "instagram-dm": "Instagram DM",
};

/**
 * A fake chat, built by hand and exported as a picture.
 *
 * Every message is typed in here — there is no import, no connected account
 * and nothing captured from a real conversation. It exists to produce a
 * clean screenshot of a chat interface for a design mockup, a caption graphic
 * or a test fixture, without staging a real conversation to screenshot.
 */
export function ChatMockupPanel({
  tool,
  leaving = false,
  onClose,
  onExited,
  onDirtyChange,
}: {
  tool: CatalogTool;
  leaving?: boolean;
  onClose: () => void;
  onExited?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const t = useT();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const [platform, setPlatform] = useState<ChatPlatform>("whatsapp");
  const [contactName, setContactName] = useState("Alex");
  const [messages, setMessages] = useState<MockupMessage[]>(() => [
    { ...newMessage("them", defaultTime()), text: t("Hey, are we still on for tomorrow?") },
    { ...newMessage("me", defaultTime()), text: t("Yes! See you at 10.") },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateMessage(id: string, patch: Partial<MockupMessage>) {
    setMessages((current) => current.map((message) => (message.id === id ? { ...message, ...patch } : message)));
    onDirtyChange?.(true);
  }

  function addMessage() {
    const lastSender = messages.at(-1)?.from ?? "them";
    setMessages((current) => [...current, newMessage(lastSender === "me" ? "them" : "me", defaultTime())]);
    onDirtyChange?.(true);
  }

  function removeMessage(id: string) {
    setMessages((current) => current.filter((message) => message.id !== id));
    onDirtyChange?.(true);
  }

  async function saveImage() {
    if (!previewRef.current) return;
    setSaving(true);
    setError("");
    try {
      const dataUrl = await withTimeout(
        toPng(previewRef.current, { pixelRatio: 2, skipFonts: true }),
        10_000,
      );
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${platform}-mockup.png`;
      link.click();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("The image could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelShell
      ref={closeButtonRef}
      title={tool.integrationName}
      leaving={leaving}
      onClose={onClose}
      onExited={onExited}
      wide
      bodyClassName="mockup-panel__body"
    >
      <section className="tool-panel__controls mockup-panel__form">
        <h2 id="tool-panel-title">{t(tool.title)}</h2>
        <p>{t(tool.description)}</p>

        <label className="operation-select">
          <span>{t("App")}</span>
          <Select
            label={t("App")}
            value={platform}
            choices={CHAT_PLATFORMS.map((value) => ({ value, label: PLATFORM_LABELS[value] }))}
            onChange={(value) => setPlatform(value as ChatPlatform)}
          />
        </label>

        <label className="mockup-field">
          <span>{t("Contact name")}</span>
          <input
            type="text"
            value={contactName}
            onChange={(event) => {
              setContactName(event.target.value);
              onDirtyChange?.(true);
            }}
          />
        </label>

        <div className="mockup-messages">
          {messages.map((message) => (
            <div className="mockup-message-row" key={message.id}>
              <button
                type="button"
                className={`mockup-sender mockup-sender--${message.from}`}
                onClick={() => updateMessage(message.id, { from: message.from === "me" ? "them" : "me" })}
                aria-label={t(message.from === "me" ? "Sent by you — tap to switch" : "Sent by them — tap to switch")}
              >
                {t(message.from === "me" ? "You" : "Them")}
              </button>
              <input
                type="text"
                className="mockup-message-text"
                value={message.text}
                placeholder={t("Type a message")}
                onChange={(event) => updateMessage(message.id, { text: event.target.value })}
              />
              <input
                type="text"
                className="mockup-message-time"
                value={message.time}
                onChange={(event) => updateMessage(message.id, { time: event.target.value })}
                aria-label={t("Time")}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => removeMessage(message.id)}
                aria-label={t("Remove this message")}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <button className="button button--light" type="button" onClick={addMessage}>
          <Plus size={15} aria-hidden="true" /> {t("Add a message")}
        </button>

        {error && (
          <p className="run-message run-message--error" role="alert">
            <AlertTriangle size={14} aria-hidden="true" /> {error}
          </p>
        )}
      </section>

      <section className="mockup-panel__preview">
        <div className={`mockup-phone mockup-phone--${platform}`} ref={previewRef}>
          <header className="mockup-phone__header">
            <span className="mockup-avatar" style={{ background: avatarColor(contactName) }}>
              {initials(contactName)}
            </span>
            <strong>{contactName || t("Contact")}</strong>
          </header>
          <div className="mockup-phone__messages">
            {messages.map((message) => (
              <div key={message.id} className={`mockup-bubble mockup-bubble--${message.from}`}>
                <span className="mockup-bubble__text">{message.text || t("Type a message")}</span>
                <span className="mockup-bubble__meta">
                  <span className="mockup-bubble__time">{message.time}</span>
                  {message.from === "me" && platform === "whatsapp" && (
                    <CheckCheck size={14} className="mockup-bubble__check" aria-hidden="true" />
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button className="button button--primary" type="button" onClick={() => void saveImage()} disabled={saving}>
          <Download size={16} aria-hidden="true" /> {t(saving ? "Saving…" : "Save as image")}
        </button>
      </section>
    </PanelShell>
  );
}
