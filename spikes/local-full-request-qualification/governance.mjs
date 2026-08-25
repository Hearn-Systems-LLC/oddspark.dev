import { constants } from "node:fs";
import { open, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const STALE_LOCK_MS = 4 * 60 * 60 * 1000;
async function fsyncDirectory(directory) { const handle = await open(directory, constants.O_RDONLY); try { await handle.sync(); } finally { await handle.close(); } }
export async function atomicWrite(file, bytes) {
  const temporary = `${file}.${randomUUID()}.tmp`; const handle = await open(temporary, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  await rename(temporary, file); await fsyncDirectory(path.dirname(file));
}
export async function appendAttempt(file, value) {
  const handle = await open(file, constants.O_CREAT | constants.O_APPEND | constants.O_WRONLY, 0o600);
  try { await handle.writeFile(`${JSON.stringify(value)}\n`); await handle.sync(); } finally { await handle.close(); }
  await fsyncDirectory(path.dirname(file));
}
export async function acquireLock(directory, { now = Date.now(), alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } } } = {}) {
  const lockPath = path.join(directory, ".cycle.lock"); const nonce = randomUUID(); const value = { pid: process.pid, nonce, acquired_at: new Date(now).toISOString() };
  try { const handle = await open(lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600); await handle.writeFile(`${JSON.stringify(value)}\n`); await handle.sync(); await handle.close(); await fsyncDirectory(directory); return { lockPath, nonce }; }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    const existing = JSON.parse(await (await open(lockPath, constants.O_RDONLY | constants.O_NOFOLLOW)).readFile("utf8"));
    const age = now - Date.parse(existing.acquired_at);
    if (!Number.isFinite(age) || age <= STALE_LOCK_MS || alive(existing.pid)) throw new Error("qualification cycle lock is live or not stale");
    const before = await stat(lockPath); await unlink(lockPath); const after = await stat(directory); if (!before.ino || !after.ino) throw new Error("lock identity unavailable");
    return acquireLock(directory, { now, alive });
  }
}
export async function releaseLock(lock) {
  const handle = await open(lock.lockPath, constants.O_RDONLY | constants.O_NOFOLLOW); const value = JSON.parse(await handle.readFile("utf8")); await handle.close();
  if (value.nonce !== lock.nonce) throw new Error("refusing to release successor lock"); await unlink(lock.lockPath); await fsyncDirectory(path.dirname(lock.lockPath));
}
