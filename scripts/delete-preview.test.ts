import { describe, expect, test } from "bun:test";
import { deletePreview } from "./delete-preview";

const deployKey = "preview:silthus:openchords|secret";

function convexWith(previews: Record<string, string>, refuseDelete = false) {
  const live = new Map(Object.entries(previews));
  const send = async (url: string, init: RequestInit) => {
    if (new Headers(init.headers).get("Authorization") !== `Bearer ${deployKey}`) return new Response(null, { status: 401 });
    if (url === "https://api.convex.dev/api/deployment/authorize_preview") {
      const { previewName, projectSelection } = JSON.parse(init.body as string);
      expect(projectSelection).toEqual({ kind: "teamAndProjectSlugs", teamSlug: "silthus", projectSlug: "openchords" });
      const deploymentName = live.get(previewName);
      if (deploymentName === undefined) return Response.json({ code: "PreviewNotFound" }, { status: 404 });
      return Response.json({ deploymentName, adminKey: "admin" });
    }
    const deleted = url.match(/^https:\/\/api\.convex\.dev\/v1\/deployments\/([^/]+)\/delete$/)?.[1];
    if (deleted === undefined || refuseDelete) return new Response(null, { status: 403 });
    for (const [name, deploymentName] of live) if (deploymentName === deleted) live.delete(name);
    return new Response(null, { status: 200 });
  };
  return { send, live: () => [...live.keys()] };
}

describe("Deleting a closed PR's preview", () => {
  test("deletes that PR's preview deployment and leaves the others", async () => {
    const convex = convexWith({ "pr-7": "happy-otter-1", "pr-8": "brave-bat-2" });
    expect(await deletePreview("pr-7", deployKey, convex.send)).toBe("Deleted pr-7 (happy-otter-1)");
    expect(convex.live()).toEqual(["pr-8"]);
  });

  test("a PR that never got a preview has nothing to delete", async () => {
    const convex = convexWith({ "pr-8": "brave-bat-2" });
    expect(await deletePreview("pr-7", deployKey, convex.send)).toBe("pr-7 has no preview deployment");
    expect(convex.live()).toEqual(["pr-8"]);
  });

  test("a refused delete fails, so the job goes red", async () => {
    const convex = convexWith({ "pr-7": "happy-otter-1" }, true);
    await expect(deletePreview("pr-7", deployKey, convex.send)).rejects.toThrow("403");
    expect(convex.live()).toEqual(["pr-7"]);
  });

  test("a key that is not a preview deploy key is refused before any request", async () => {
    const convex = convexWith({ "pr-7": "happy-otter-1" });
    await expect(deletePreview("pr-7", "prod:judicious-falcon-175|secret", convex.send)).rejects.toThrow("preview deploy key");
    expect(convex.live()).toEqual(["pr-7"]);
  });
});
