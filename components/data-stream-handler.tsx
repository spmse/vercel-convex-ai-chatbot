"use client";

import { useEffect, useRef } from "react";
import {
  hasArtifactLoaded,
  loadArtifact,
} from "@/components/artifacts/dynamic-loader";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { useDataStream } from "./data-stream-provider";

export function DataStreamHandler() {
  const { dataStream } = useDataStream();

  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);
  // Queue stream parts for kinds still loading so we flush once after module resolves.
  const loadingKinds = useRef<Set<string>>(new Set());
  const loadQueues = useRef<Map<string, any[]>>(new Map());

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    for (const delta of newDeltas) {
      // Apply structural deltas first to get kind set early.
      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }
        switch (delta.type) {
          case "data-id":
            return {
              ...draftArtifact,
              documentId: delta.data,
              status: "streaming",
            };
          case "data-title":
            return { ...draftArtifact, title: delta.data, status: "streaming" };
          case "data-kind":
            return { ...draftArtifact, kind: delta.data, status: "streaming" };
          case "data-clear":
            return { ...draftArtifact, content: "", status: "streaming" };
          case "data-finish":
            return { ...draftArtifact, status: "idle" };
          default:
            return draftArtifact;
        }
      });

      // Stream content deltas (text/code/etc.) only after artifact module is loaded.
      const currentKind =
        delta.type === "data-kind" && typeof delta.data === "string"
          ? delta.data
          : artifact.kind;
      if (!currentKind) {
        continue;
      }

      // If already loaded we can apply immediately.
      if (hasArtifactLoaded(currentKind)) {
        loadArtifact(currentKind)
          .then((loaded) => {
            loaded.onStreamPart?.({
              streamPart: delta,
              setArtifact,
              setMetadata,
            });
          })
          .catch(() => {
            /* ignore */
          });
        continue;
      }

      // Not loaded yet.
      if (loadingKinds.current.has(currentKind)) {
        // Already loading; append to queue.
        const existing = loadQueues.current.get(currentKind);
        if (existing) {
          existing.push(delta);
        } else {
          loadQueues.current.set(currentKind, [delta]);
        }
      } else {
        loadingKinds.current.add(currentKind);
        loadQueues.current.set(currentKind, [delta]);
        loadArtifact(currentKind)
          .then((loaded) => {
            const queue = loadQueues.current.get(currentKind) || [];
            for (const q of queue) {
              loaded.onStreamPart?.({
                streamPart: q,
                setArtifact,
                setMetadata,
              });
            }
            loadQueues.current.delete(currentKind);
            loadingKinds.current.delete(currentKind);
          })
          .catch(() => {
            // Drop queued deltas on error; future deltas may retry.
            loadQueues.current.delete(currentKind);
            loadingKinds.current.delete(currentKind);
          });
      }
    }
  }, [dataStream, setArtifact, setMetadata, artifact]);

  return null;
}
