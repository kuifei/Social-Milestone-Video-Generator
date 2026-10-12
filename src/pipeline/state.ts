import {open, readFile, rename, rm, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {randomUUID} from "node:crypto";

export async function saveJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {flag: "wx"});
    await rename(temporary, path);
  } finally { await rm(temporary, {force: true}); }
}

export async function withJobLock<T>(jobDir: string, action: () => Promise<T>): Promise<T> {
  const path = join(jobDir, ".job.lock");
  let lock;
  try { lock = await open(path, "wx"); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const pid = Number(await readFile(path, "utf8"));
    if (!Number.isInteger(pid) || pid <= 0) throw new Error("Job lock is unreadable; inspect .job.lock before retrying.");
    try {
      process.kill(pid, 0);
      throw new Error(`Job is already running in process ${pid}.`);
    } catch (checkError) {
      if ((checkError as NodeJS.ErrnoException).code !== "ESRCH") throw checkError;
    }
    await rm(path);
    lock = await open(path, "wx");
  }
  try {
    await lock.writeFile(String(process.pid));
    await lock.close();
    return await action();
  } finally {
    await lock.close();
    await rm(path, {force: true});
  }
}
