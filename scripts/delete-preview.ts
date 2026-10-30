type Send = (url: string, init: RequestInit) => Promise<Response>;

const convexApi = "https://api.convex.dev";

function projectOf(deployKey: string) {
  const [, teamSlug, projectSlug] = deployKey.match(/^preview:([^:]+):([^|]+)\|/) ?? [];
  if (teamSlug === undefined || projectSlug === undefined) throw new Error("CONVEX_DEPLOY_KEY must be a preview deploy key");
  return { kind: "teamAndProjectSlugs", teamSlug, projectSlug };
}

function post(send: Send, path: string, deployKey: string, body?: object) {
  return send(`${convexApi}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${deployKey}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
}

async function refused(path: string, response: Response) {
  return new Error(`POST ${path} answered ${response.status}: ${await response.text()}`);
}

async function deploymentNamed(previewName: string, deployKey: string, send: Send) {
  const path = "/api/deployment/authorize_preview";
  const response = await post(send, path, deployKey, { previewName, projectSelection: projectOf(deployKey) });
  if (response.status === 404) return null;
  if (!response.ok) throw await refused(path, response);
  const { deploymentName } = (await response.json()) as { deploymentName: string };
  return deploymentName;
}

export async function deletePreview(previewName: string, deployKey: string, send: Send = fetch) {
  const deploymentName = await deploymentNamed(previewName, deployKey, send);
  if (deploymentName === null) return `${previewName} has no preview deployment`;
  const path = `/v1/deployments/${deploymentName}/delete`;
  const response = await post(send, path, deployKey);
  if (!response.ok) throw await refused(path, response);
  return `Deleted ${previewName} (${deploymentName})`;
}

if (import.meta.main) {
  const [previewName] = process.argv.slice(2);
  if (previewName === undefined) throw new Error("Usage: bun scripts/delete-preview.ts <preview name>");
  console.log(await deletePreview(previewName, process.env.CONVEX_DEPLOY_KEY ?? ""));
}
