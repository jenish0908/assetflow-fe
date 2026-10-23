import type { Notification } from "../api/types";
import { code39 } from "./code39";
import { can, describeNotification, initials, timeAgo } from "./format";

describe("code39", () => {
  it("frames the text with start/stop characters", () => {
    // "*" + "A" + "*": 3 characters of 15 modules (6 narrow + 3 wide x3) plus 2 gaps.
    const { bars, width } = code39("A");
    expect(width).toBe(3 * 15 + 2);
    expect(bars).toHaveLength(3 * 5); // 5 bars per character
  });

  it("is deterministic and case-insensitive", () => {
    expect(code39("l-102")).toEqual(code39("L-102"));
  });

  it("drops characters Code 39 cannot encode", () => {
    expect(code39("L-1#2")).toEqual(code39("L-12"));
  });
});

describe("format", () => {
  const now = new Date("2026-10-23T12:00:00Z");

  it.each([
    ["2026-10-23T11:59:40Z", "just now"],
    ["2026-10-23T11:30:00Z", "30 minutes ago"],
    ["2026-10-23T09:00:00Z", "3 hours ago"],
    ["2026-10-21T12:00:00Z", "2 days ago"],
  ])("timeAgo(%s) is %s", (iso, want) => {
    expect(timeAgo(iso, now)).toBe(want);
  });

  it("checks role ranks", () => {
    expect(can("admin", "manager")).toBe(true);
    expect(can("manager", "manager")).toBe(true);
    expect(can("viewer", "manager")).toBe(false);
    expect(can(undefined, "viewer")).toBe(false);
  });

  it("writes notifications for the reader", () => {
    const n = { kind: "asset_allocated", payload: { asset_tag: "L-102", user_id: 3 } } as unknown as Notification;
    expect(describeNotification(n)).toBe("L-102 was allocated to you");
    expect(describeNotification(n, "Priya Shah")).toBe("L-102 allocated to Priya Shah");

    const p = { kind: "payment_succeeded", payload: { amount_cents: 2500, currency: "usd" } } as unknown as Notification;
    expect(describeNotification(p, "Priya Shah")).toMatch(/^Payment of .*25\.00 from Priya Shah$/);
  });

  it("makes initials", () => {
    expect(initials("Priya Shah")).toBe("PS");
    expect(initials("Fatima Al-Sayed")).toBe("FA");
    expect(initials("Cher")).toBe("C");
  });
});
