import { useRef, useState } from "react";
import { AlertTriangle, Download, Heart, MessageCircle, Repeat2, ShieldAlert } from "lucide-react";
import { toPng } from "html-to-image";
import { withTimeout } from "../utilities/mockup";
import type { CatalogTool } from "../catalog/catalog";
import { avatarColor, initials, POST_PLATFORMS, type PostPlatform } from "../utilities/mockup";
import { PanelShell } from "./PanelShell";
import { Select } from "./Select";
import { useT } from "../i18n/language";

const PLATFORM_LABELS: Record<PostPlatform, string> = {
  tweet: "Tweet",
  "instagram-post": "Instagram post",
};

/**
 * A fake post, built by hand and exported as a picture — the same idea as
 * the chat mockup, for the other shape a screenshot fixture or a design
 * mockup needs: one post rather than a conversation.
 */
export function PostMockupPanel({
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

  const [platform, setPlatform] = useState<PostPlatform>("tweet");
  const [name, setName] = useState("Alex Rivera");
  const [handle, setHandle] = useState("alexrivera");
  const [text, setText] = useState(t("Just shipped a new feature — small change, but it took the whole afternoon to get right."));
  const [likes, setLikes] = useState("128");
  const [comments, setComments] = useState("14");
  const [shares, setShares] = useState("9");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function mark(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      onDirtyChange?.(true);
    };
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

        <p className="notice notice--warning">
          <ShieldAlert size={14} aria-hidden="true" />
          <span>
            {t(
              "For UI mockups and testing only. Nothing here is a real post, and the exported image says so.",
            )}
          </span>
        </p>

        <label className="operation-select">
          <span>{t("App")}</span>
          <Select
            label={t("App")}
            value={platform}
            choices={POST_PLATFORMS.map((value) => ({ value, label: PLATFORM_LABELS[value] }))}
            onChange={(value) => setPlatform(value as PostPlatform)}
          />
        </label>

        <label className="mockup-field">
          <span>{t("Display name")}</span>
          <input type="text" value={name} onChange={(event) => mark(setName)(event.target.value)} />
        </label>

        <label className="mockup-field">
          <span>{t("Username")}</span>
          <input type="text" value={handle} onChange={(event) => mark(setHandle)(event.target.value)} />
        </label>

        <label className="mockup-field">
          <span>{t("Post text")}</span>
          <textarea
            className="utility-input"
            value={text}
            onChange={(event) => mark(setText)(event.target.value)}
          />
        </label>

        <div className="mockup-message-row mockup-message-row--stats">
          <label className="mockup-field">
            <span>{t("Likes")}</span>
            <input type="text" value={likes} onChange={(event) => mark(setLikes)(event.target.value)} />
          </label>
          <label className="mockup-field">
            <span>{platform === "tweet" ? t("Replies") : t("Comments")}</span>
            <input type="text" value={comments} onChange={(event) => mark(setComments)(event.target.value)} />
          </label>
          {platform === "tweet" && (
            <label className="mockup-field">
              <span>{t("Reposts")}</span>
              <input type="text" value={shares} onChange={(event) => mark(setShares)(event.target.value)} />
            </label>
          )}
        </div>

        {error && (
          <p className="run-message run-message--error" role="alert">
            <AlertTriangle size={14} aria-hidden="true" /> {error}
          </p>
        )}
      </section>

      <section className="mockup-panel__preview">
        <div className={`mockup-post mockup-post--${platform}`} ref={previewRef}>
          <div className="mockup-post__header">
            <span className="mockup-avatar" style={{ background: avatarColor(name) }}>
              {initials(name)}
            </span>
            <span className="mockup-post__identity">
              <strong>{name || t("Name")}</strong>
              <small>@{handle || "handle"}</small>
            </span>
          </div>
          <p className="mockup-post__text">{text || t("Post text")}</p>
          <div className="mockup-post__stats">
            <span>
              <MessageCircle size={14} aria-hidden="true" /> {comments}
            </span>
            {platform === "tweet" && (
              <span>
                <Repeat2 size={14} aria-hidden="true" /> {shares}
              </span>
            )}
            <span>
              <Heart size={14} aria-hidden="true" /> {likes}
            </span>
          </div>
          <footer className="mockup-phone__watermark">{t("MOCKUP — not a real post")}</footer>
        </div>

        <button className="button button--primary" type="button" onClick={() => void saveImage()} disabled={saving}>
          <Download size={16} aria-hidden="true" /> {t(saving ? "Saving…" : "Save as image")}
        </button>
      </section>
    </PanelShell>
  );
}
