import { useCallback, useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { isNativeHost } from "./useOperationRunner";

export type UpdateState =
  | { phase: "idle" }
  /** A check somebody asked for, which reports either way. */
  | { phase: "checking" }
  /** Asked, and there is nothing newer. */
  | { phase: "current" }
  /** A newer version exists and is being fetched. */
  | { phase: "downloading"; version: string; progress: number | null }
  /** Installed and waiting for a restart to take effect. */
  | { phase: "ready"; version: string }
  | { phase: "failed"; message: string };

/**
 * Keeps the app up to date, without taking it away mid-sentence.
 *
 * It checks once on launch and downloads on its own — that part is automatic,
 * as asked. Installing is deliberately not: on Windows the installer exits the
 * app the moment it is launched, so installing on launch would mean the window
 * disappearing by itself, possibly mid-job. The download is the slow half, and
 * it is already done by the time the button is pressed.
 *
 * Everything here is verified before it runs: the plugin checks the download
 * against a signature whose public half is compiled into the binary, so a
 * tampered release is refused rather than installed.
 */
export function useUpdate() {
  const [state, setState] = useState<UpdateState>({ phase: "idle" });
  /** Which version is running, for the line in Settings. */
  const [version, setVersion] = useState("");
  /** Held so the Restart button can install what was already fetched. */
  const [pending, setPending] = useState<Update | null>(null);

  useEffect(() => {
    if (!isNativeHost()) return;
    void getVersion().then(setVersion).catch(() => undefined);
  }, []);

  /** Asks now rather than waiting for the next launch. */
  const checkNow = useCallback(async () => {
    if (!isNativeHost()) return;
    setState({ phase: "checking" });
    await run(setState, setPending, () => true, { silent: false });
  }, []);

  useEffect(() => {
    if (!isNativeHost()) return;
    let active = true;
    // Silent on launch: no network, a release that has not published its
    // manifest yet, a signature that did not verify — none of those is worth
    // interrupting somebody's work over. The app carries on at this version.
    void run(setState, setPending, () => active, { silent: true });
    return () => {
      active = false;
    };
  }, []);

  const restart = useCallback(() => {
    void (async () => {
      try {
        // On Windows this hands over to the installer and exits the app; the
        // relaunch below is for the platforms where it does not.
        await pending?.install();
        await relaunch();
      } catch (error) {
        setState({ phase: "failed", message: describe(error) });
      }
    })();
  }, [pending]);

  const dismiss = useCallback(() => setState({ phase: "idle" }), []);

  return { state, version, restart, dismiss, checkNow };
}

/**
 * The check-download cycle, shared by the one on launch and the one a button
 * asks for, so the two cannot drift into behaving differently.
 */
async function run(
  setState: (state: UpdateState) => void,
  setPending: (update: Update | null) => void,
  active: () => boolean,
  { silent }: { silent: boolean },
) {
  let update: Update | null = null;
  try {
    update = await check();
  } catch (error) {
    // A button press deserves an answer either way; a launch does not.
    if (active() && !silent) setState({ phase: "failed", message: describe(error) });
    return;
  }
  if (!active()) return;
  if (!update) {
    if (!silent) setState({ phase: "current" });
    return;
  }

  const version = update.version;
  setState({ phase: "downloading", version, progress: null });
  try {
    let total = 0;
    let taken = 0;
    await update.download((event) => {
      if (!active()) return;
      if (event.event === "Started") {
        total = event.data.contentLength ?? 0;
      } else if (event.event === "Progress") {
        taken += event.data.chunkLength;
        setState({
          phase: "downloading",
          version,
          progress: total > 0 ? Math.min(1, taken / total) : null,
        });
      }
    });
    if (active()) {
      setPending(update);
      setState({ phase: "ready", version });
    }
  } catch (error) {
    if (active()) setState({ phase: "failed", message: describe(error) });
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "The update could not be installed.";
}
