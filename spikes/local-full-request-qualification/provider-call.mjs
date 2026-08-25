export const PROVIDER_ERROR_FIELD_MAX_LENGTH = 512;

const safeRead = (value, key) => { try { return value?.[key]; } catch { return undefined; } };
const boundedString = (value) => {
  if (value == null) return null;
  let text;
  try {
    if (typeof value === "string") text = value;
    else if (["number", "boolean", "bigint"].includes(typeof value)) text = String(value);
    else {
      const seen = new WeakSet();
      text = JSON.stringify(value, (_key, member) => {
        if (typeof member === "bigint") return String(member);
        if (member && typeof member === "object") { if (seen.has(member)) return "[Circular]"; seen.add(member); }
        return member;
      });
    }
  } catch { text = Object.prototype.toString.call(value); }
  return String(text ?? Object.prototype.toString.call(value)).slice(0, PROVIDER_ERROR_FIELD_MAX_LENGTH);
};

export function providerErrorDetail(error) {
  const response = safeRead(error, "response"); const cause = safeRead(error, "cause");
  const constructorName = safeRead(safeRead(error, "constructor"), "name");
  const status = [safeRead(error, "status"), safeRead(error, "statusCode"), safeRead(response, "status"), safeRead(cause, "status")]
    .find((value) => Number.isSafeInteger(value) && value >= 100 && value <= 599);
  return {
    class: boundedString(constructorName && constructorName !== "Object" ? constructorName : (safeRead(error, "name") ?? typeof error)),
    message: boundedString(safeRead(error, "message") ?? error),
    http_status: status ?? null,
    code: boundedString(safeRead(error, "code") ?? safeRead(response, "code") ?? safeRead(cause, "code")),
  };
}

export async function boundedProviderCall(operation, timeoutMs, timers = { setTimeout, clearTimeout }) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => { timer = timers.setTimeout(() => reject(new Error("provider_timeout")), timeoutMs); }),
    ]);
  } finally {
    if (timer !== undefined) timers.clearTimeout(timer);
  }
}
