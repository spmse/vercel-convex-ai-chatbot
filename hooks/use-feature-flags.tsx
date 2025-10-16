"use client";
import { createContext, useContext } from "react";
import type { FeatureFlags } from "@/lib/feature-flags";

export const FeatureFlagsContext = createContext<FeatureFlags>({
  guestAccounts: false,
  shareConversations: false,
  uploadFiles: false,
  weatherTool: false,
});

export function FeatureFlagsProvider({
  value,
  children,
}: {
  value: FeatureFlags;
  children: React.ReactNode;
}) {
  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}
