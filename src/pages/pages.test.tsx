import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { adminMe, fakeApi, renderApp } from "../test/utils";
import { AssetsPage } from "./AssetsPage";
import { AssistantPage } from "./AssistantPage";
import { SignInPage } from "./SignInPage";

afterEach(() => vi.unstubAllGlobals());

const asset = (id: number, tag: string, holder?: number) => ({
  id,
  tag,
  name: `Laptop ${tag}`,
  category: "laptop",
  status: holder ? "allocated" : "available",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  allocations: holder ? [{ id: id * 10, asset_id: id, user_id: holder, allocated_at: "2026-09-01T00:00:00Z" }] : [],
});

describe("AssetsPage", () => {
  it("names every holder on the page with one batched request", async () => {
    const api = fakeApi({
      "GET /me": () => adminMe,
      "GET /assets": () => ({
        items: [asset(1, "L-101", 7), asset(2, "L-102", 8), asset(3, "L-103", 7), asset(4, "L-104")],
        limit: 25,
        offset: 0,
        total: 4,
      }),
      "GET /users": (url) => {
        expect(url.searchParams.get("ids")).toBe("7,8"); // de-duplicated and sorted
        return {
          items: [
            { id: 7, name: "Priya Shah", email: "priya@x.dev", role: "viewer", created_at: "" },
            { id: 8, name: "Kenji Watanabe", email: "kenji@x.dev", role: "viewer", created_at: "" },
          ],
        };
      },
    });

    renderApp(<AssetsPage />, { path: "/assets", route: "/assets" });

    expect(await screen.findAllByText("Priya Shah")).toHaveLength(2);
    expect(screen.getByText("Kenji Watanabe")).toBeInTheDocument();
    expect(screen.getByText("Nobody")).toBeInTheDocument();
    expect(api.calls.filter((c) => c.path === "/users")).toHaveLength(1);
  });

  it("sends the status filter and search to the API", async () => {
    const api = fakeApi({
      "GET /me": () => adminMe,
      "GET /assets": () => ({ items: [], limit: 25, offset: 0, total: 0 }),
    });
    renderApp(<AssetsPage />, { path: "/assets", route: "/assets?status=maintenance" });

    await screen.findByText("No assets match");
    await userEvent.type(screen.getByRole("searchbox", { name: /search/i }), "dell");
    await waitFor(() => expect(api.calls.some((c) => c.path === "/assets" && c.search.includes("q=dell"))).toBe(true));
    const last = api.calls.filter((c) => c.path === "/assets").at(-1)!;
    expect(last.search).toContain("status=maintenance");
  });

  it("hides the add button from viewers", async () => {
    fakeApi({
      "GET /me": () => ({ ...adminMe, user: { ...adminMe.user, role: "viewer" } }),
      "GET /assets": () => ({ items: [], limit: 25, offset: 0, total: 0 }),
    });
    renderApp(<AssetsPage />, { path: "/assets", route: "/assets" });
    await screen.findByText("No assets yet");
    expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument();
  });
});

describe("SignInPage", () => {
  it("shows the server's message when sign-in fails", async () => {
    fakeApi({
      "POST /auth/login": () => ({ status: 401, body: { error: { code: "unauthenticated", message: "invalid email or password" } } }),
    });
    renderApp(<SignInPage />, { path: "/signin", route: "/signin", signedIn: false });

    await userEvent.type(screen.getByLabelText("Email"), "admin@assetflow.dev");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("invalid email or password");
  });
});

describe("AssistantPage", () => {
  it("shows the reply and what the assistant did, including refusals", async () => {
    const api = fakeApi({
      "GET /me": () => ({ ...adminMe, user: { ...adminMe.user, role: "viewer" } }),
      "POST /agent/chat": () => ({
        reply: "Could not allocate L-102 to Priya: permission denied.",
        tool_calls: [
          {
            step: 1,
            name: "allocateAsset",
            arguments: '{"asset_tag":"L-102","user":"Priya"}',
            ok: false,
            error: "permission denied: allocateAsset requires role manager or higher; the caller is viewer",
            duration_ms: 0.02,
          },
        ],
      }),
    });
    renderApp(<AssistantPage />, { path: "/assistant", route: "/assistant" });

    await userEvent.type(await screen.findByLabelText("Message the assistant"), "allocate laptop L-102 to Priya");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/Could not allocate L-102/)).toBeInTheDocument();
    const trace = screen.getByRole("list", { name: "What the assistant did" });
    expect(within(trace).getByText("Allocated")).toBeInTheDocument();
    expect(within(trace).getByText(/requires role manager/)).toBeInTheDocument();
    expect(api.calls.find((c) => c.path === "/agent/chat")?.body).toEqual({ message: "allocate laptop L-102 to Priya" });
  });
});
