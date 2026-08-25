import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { atomicWrite } from "./governance.mjs";
import { canonicalBytes, sha256 } from "./contract.mjs";

export async function verifyPublication(directory, basename) {
  const markerBytes = await readFile(path.join(directory, `${basename}.complete.json`));
  const marker = JSON.parse(markerBytes);
  if (marker.schema_version !== "oddspark.local-full-request-publication/v1" || marker.basename !== basename || !Array.isArray(marker.members)) throw new Error("publication marker is invalid");
  for (const member of marker.members) {
    const bytes = await readFile(path.join(directory, member.name));
    if (bytes.length !== member.bytes || sha256(bytes) !== member.sha256) throw new Error(`published member drifted: ${member.name}`);
  }
  return { marker, marker_sha256: sha256(markerBytes) };
}

export async function publishArtifactSet(directory, basename, members) {
  const installed = [];
  try {
    const manifest = [];
    for (const [suffix, bytes] of Object.entries(members)) {
      const name = `${basename}.${suffix}`; await atomicWrite(path.join(directory, name), bytes); installed.push(name);
      manifest.push({ name, bytes: bytes.length, sha256: sha256(bytes) });
    }
    manifest.sort((a, b) => a.name.localeCompare(b.name));
    const marker = { schema_version: "oddspark.local-full-request-publication/v1", basename, members: manifest };
    const markerName = `${basename}.complete.json`; await atomicWrite(path.join(directory, markerName), canonicalBytes(marker)); installed.push(markerName);
    return await verifyPublication(directory, basename);
  } catch (error) {
    await Promise.all(installed.map((name) => rm(path.join(directory, name), { force: true })));
    throw error;
  }
}
