import { expect, test } from "@playwright/test";

// Import using relative path to avoid cached flags across tests after env changes
import {
  FEATURE_GUEST_ACCOUNTS,
  FEATURE_SHARE_CONVERSATIONS,
  FEATURE_UPLOAD_FILES,
  FEATURE_WEATHER_TOOL,
  getFeatureFlags,
} from "@/lib/feature-flags";

test.describe("feature flags parsing", () => {
  test.beforeEach(() => {
    // Reset process env modifications for isolation (clear cache by reloading module is out-of-scope here)
    process.env.APP_ENABLE_GUEST_ACCOUNTS = undefined as any;
    process.env.APP_ENABLE_SHARE_CONVERSATIONS = undefined as any;
    process.env.APP_ENABLE_UPLOAD_FILES = undefined as any;
    process.env.APP_ENABLE_WEATHER_TOOL = undefined as any;
  });

  test("defaults to all disabled when unset", () => {
    const flags = getFeatureFlags();
    expect(flags).toEqual({
      guestAccounts: false,
      shareConversations: false,
      uploadFiles: false,
      weatherTool: false,
    });
  });

  test("accepts truthy values", () => {
    process.env.APP_ENABLE_GUEST_ACCOUNTS = "true";
    process.env.APP_ENABLE_SHARE_CONVERSATIONS = "1";
    process.env.APP_ENABLE_UPLOAD_FILES = "on";
    process.env.APP_ENABLE_WEATHER_TOOL = "yes";
    const flags = getFeatureFlags();
    expect(flags).toEqual({
      guestAccounts: true,
      shareConversations: true,
      uploadFiles: true,
      weatherTool: true,
    });
  });

  test("treats unknown non-empty values as enabled", () => {
    process.env.APP_ENABLE_UPLOAD_FILES = "enabled"; // not in truthy list but non-empty
    const flags = getFeatureFlags();
    expect(flags.uploadFiles).toBe(true);
  });

  test("exposes individual constants", () => {
    expect(FEATURE_GUEST_ACCOUNTS).toBe(false);
    expect(FEATURE_SHARE_CONVERSATIONS).toBe(false);
    expect(FEATURE_UPLOAD_FILES).toBe(false);
    expect(FEATURE_WEATHER_TOOL).toBe(false);
  });
});
