import { expect, test } from "@playwright/test";
import {
  FEATURE_GUEST_ACCOUNTS,
  FEATURE_SHARE_CONVERSATIONS,
  FEATURE_UPLOAD_FILES,
  FEATURE_WEATHER_TOOL,
  getFeatureFlags,
  resetFeatureFlagsCache,
} from "@/lib/feature-flags";

test.describe("feature flags parsing", () => {
  test.beforeEach(() => {
    process.env.APP_ENABLE_GUEST_ACCOUNTS = undefined as any;
    process.env.APP_ENABLE_SHARE_CONVERSATIONS = undefined as any;
    process.env.APP_ENABLE_UPLOAD_FILES = undefined as any;
    process.env.APP_ENABLE_WEATHER_TOOL = undefined as any;
    resetFeatureFlagsCache();
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
    resetFeatureFlagsCache();
    const flags = getFeatureFlags();
    expect(flags).toEqual({
      guestAccounts: true,
      shareConversations: true,
      uploadFiles: true,
      weatherTool: true,
    });
  });

  test("treats unknown non-empty values as disabled", () => {
    process.env.APP_ENABLE_UPLOAD_FILES = "enabled"; // arbitrary non-empty value
    resetFeatureFlagsCache();
    const flags = getFeatureFlags();
    expect(flags.uploadFiles).toBe(false);
  });

  test("exposes individual constants (initial state)", () => {
    expect(FEATURE_GUEST_ACCOUNTS).toBe(false);
    expect(FEATURE_SHARE_CONVERSATIONS).toBe(false);
    expect(FEATURE_UPLOAD_FILES).toBe(false);
    expect(FEATURE_WEATHER_TOOL).toBe(false);
  });
});
