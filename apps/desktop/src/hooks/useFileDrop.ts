import { useEffect, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { isNativeHost } from "./useOperationRunner";

const noPaths: string[] = [];

/**
 * Windows reports drag and drop at the window level, not per element, so the whole
 * app shares one hover state and the paths of the last drop.
 */
export function useFileDrop() {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [droppedPaths, setDroppedPaths] = useState<string[]>(noPaths);

  useEffect(() => {
    if (!isNativeHost()) return;
    let active = true;
    let unlisten: (() => void) | undefined;

    void getCurrentWebview()
      .onDragDropEvent((event) => {
        if (!active) return;
        if (event.payload.type === "enter" || event.payload.type === "over") {
          setIsDraggingOver(true);
          return;
        }
        setIsDraggingOver(false);
        if (event.payload.type === "drop" && event.payload.paths.length > 0) {
          setDroppedPaths(event.payload.paths);
        }
      })
      .then((cleanup) => {
        if (active) unlisten = cleanup;
        else cleanup();
      })
      .catch(() => {
        // Without the native bridge the picker button remains the only entry point.
      });

    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  return { isDraggingOver, droppedPaths };
}
