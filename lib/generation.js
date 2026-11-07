export const SCENE_MAX_TURNS = 10;
export const SCENE_MAX_TEXT = 1200;
export const MAX_QUOTA_RETRIES = 5;

export function planGeneration(sections, selectedIds, byScene) {
  const groups = [];
  let group = [];
  let speakers = new Set();
  let length = 0;
  for (const section of sections) {
    const selected = selectedIds.has(section.id);
    if (!selected || !byScene || group.length >= SCENE_MAX_TURNS ||
        length + section.text.length > SCENE_MAX_TEXT ||
        (speakers.size === 2 && !speakers.has(section.speaker))) {
      group = [];
      speakers = new Set();
      length = 0;
    }
    if (!selected) continue;
    if (!group.length) groups.push(group);
    group.push(section);
    speakers.add(section.speaker);
    length += section.text.length;
  }
  return groups;
}

export function invalidateClips(clips, ids) {
  const affected = new Set(ids.map(id => clips[id]).filter(Boolean));
  return Object.fromEntries(Object.entries(clips).filter(([, clip]) => !affected.has(clip)));
}

export function quotaDelay(header, attempt) {
  const delay = header ? (Number.isFinite(Number(header)) ? Number(header) * 1000 : Date.parse(header) - Date.now()) : 0;
  return Math.max(60_000 * 2 ** attempt, Number.isFinite(delay) ? delay : 0);
}

export function waitForRetry(ms, signal) {
  return new Promise(resolve => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(finish, ms);
    function finish() {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    }
    signal.addEventListener('abort', finish, {once: true});
  });
}
