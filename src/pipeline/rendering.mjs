import { buildCommittedBrief, deepFreeze, sha256Hex } from "./contracts.mjs";

export const RETENTION_COPY = "Local references expire 30 days after they are created; website references expire one hour after they are created.";
export const CONTACT_URL = "https://hearn.systems/contact";

// The UX-governed quiet disclosure a served house Brief carries above the
// title (UX-DR A8 override). Single source: the assembled writer stamps it on
// house commits and the Worker's served-metric classification matches on it.
export const HOUSE_NOTICE = "This plan is one of ours, not built for you.";

export const ROUTABLE_COMMITTED_BRIEF_ID = /^[A-Za-z0-9._-]{1,128}$/;
const cloneCommitted = (value) => {
  const committed = buildCommittedBrief(value);
  if (!ROUTABLE_COMMITTED_BRIEF_ID.test(committed.id)) throw new TypeError("Committed Brief id is not routable.");
  return committed;
};
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

const geometryDescriptor = (family, publicId) => deepFreeze({
  version: 1,
  hash: sha256Hex(`oddspark-seed-geometry/v1\0${family}\0${publicId}`),
});

export function committedBriefJson(committedBrief) {
  return cloneCommitted(committedBrief);
}

export function projectCommittedBrief(committedBrief) {
  const envelope = cloneCommitted(committedBrief);
  const brief = envelope.brief;
  return deepFreeze({
    id: envelope.id,
    geometry: geometryDescriptor("committed_brief", envelope.id),
    request_scope: envelope.request_scope,
    mode: brief.mode,
    notice: brief.notice ?? null,
    title: brief.title,
    plan: brief.plan,
    why_fits: deepFreeze({ text: brief.why_fits.text, breadcrumb: brief.mode === "domain" ? brief.why_fits.breadcrumb : null }),
    what_gets_better: brief.what_gets_better,
    before_after: deepFreeze({ before: brief.before_after.before, after: brief.before_after.after }),
    change_level: deepFreeze({
      preliminary: "preliminary",
      time_range: brief.change_level.time_range,
      steps_changed: brief.change_level.steps_changed,
      steps_removed: brief.change_level.steps_removed,
    }),
    stays_same: deepFreeze({
      tools: [...brief.stays_same.tools], authority: [...brief.stays_same.authority], steps: [...brief.stays_same.steps],
    }),
    invitation: brief.invitation,
    contact_url: CONTACT_URL,
    retention: RETENTION_COPY,
    share: envelope.request_scope === "local" ? deepFreeze({ id: envelope.id, path: `/s/${encodeURIComponent(envelope.id)}` }) : null,
  });
}

function chips(label, values) {
  if (!values.length) return "";
  return `<div class="chip-group"><h2>${label}</h2><div class="chips">${values.map((value) => `<span class="chip">${escapeHtml(value)}</span>`).join("")}</div></div>`;
}

export function renderCommittedBriefMarkup(committedBrief) {
  const view = projectCommittedBrief(committedBrief);
  const stays = chips("Tools", view.stays_same.tools) + chips("Authority", view.stays_same.authority) + chips("Steps", view.stays_same.steps)
    || "<p>Nothing in the current routine is replaced.</p>";
  return [
    view.notice ? `<aside class="notice" role="note"><span class="sr-only">Note:</span> ${escapeHtml(view.notice)}</aside>` : "",
    `<h1 id="headline" tabindex="-1">${escapeHtml(view.title)}</h1>`,
    `<section class="brief-field"><h2>The Plan</h2><p>${escapeHtml(view.plan)}</p></section>`,
    `<section class="brief-field"><h2>Why It Fits</h2><p>${escapeHtml(view.why_fits.text)}</p>${view.mode === "domain" ? `<p class="breadcrumb">${escapeHtml(view.why_fits.breadcrumb)}</p>` : ""}</section>`,
    `<section class="brief-field"><h2>What Gets Better</h2><p>${escapeHtml(view.what_gets_better)}</p></section>`,
    `<section class="brief-field"><h2>Before/After</h2><dl><div><dt>Before</dt><dd>${escapeHtml(view.before_after.before)}</dd></div><div><dt>After</dt><dd>${escapeHtml(view.before_after.after)}</dd></div></dl></section>`,
    `<section class="brief-field"><h2>Change Level</h2><p><strong>preliminary</strong> · ${escapeHtml(view.change_level.time_range)} · ${view.change_level.steps_changed} steps changed · ${view.change_level.steps_removed} steps removed</p></section>`,
    `<section class="brief-field"><h2>What Stays the Same</h2>${stays}</section>`,
    `<section class="brief-field invitation"><h2>Next step</h2><p><a href="${CONTACT_URL}">${escapeHtml(view.invitation)}</a></p><p class="retention">${escapeHtml(view.retention)}</p></section>`,
  ].join("");
}

export function committedBriefPresentation(committedBrief) {
  return deepFreeze({ projection: projectCommittedBrief(committedBrief), markup: renderCommittedBriefMarkup(committedBrief) });
}

export function committedBriefAsText(committedBrief) {
  const view = projectCommittedBrief(committedBrief);
  const lines = [];
  if (view.notice) lines.push(`Note: ${view.notice}`, "");
  lines.push(
    view.title, "", "The Plan", view.plan, "", "Why It Fits", view.why_fits.text,
    ...(view.mode === "domain" ? [view.why_fits.breadcrumb] : []), "", "What Gets Better", view.what_gets_better, "",
    "Before/After", `Before: ${view.before_after.before}`, `After: ${view.before_after.after}`, "",
    "Change Level", `preliminary · ${view.change_level.time_range} · ${view.change_level.steps_changed} steps changed · ${view.change_level.steps_removed} steps removed`, "",
    "What Stays the Same",
  );
  const groups = [["Tools", view.stays_same.tools], ["Authority", view.stays_same.authority], ["Steps", view.stays_same.steps]];
  if (groups.every(([, values]) => values.length === 0)) lines.push("Nothing in the current routine is replaced.");
  else for (const [label, values] of groups) if (values.length) lines.push(`${label}: ${values.join("; ")}`);
  lines.push("", "Next step", view.invitation, view.contact_url, view.retention);
  if (view.share) lines.push("", `Permalink: ${view.share.path}`);
  return lines.join("\n");
}
