/** Original Lumen Shift rules. All arithmetic is bounded to the board's bit width. */
export function rotate(value, amount, width) {
  if (
    !Number.isInteger(width) ||
    width < 2 ||
    width > 8 ||
    !Number.isInteger(value) ||
    value < 0 ||
    value >= 2 ** width ||
    !Number.isInteger(amount)
  )
    throw new Error("Invalid register");
  const n = ((amount % width) + width) % width,
    mask = 2 ** width - 1;
  return n === 0 ? value : ((value << n) | (value >>> (width - n))) & mask;
}
export const bits = (value, width) =>
  Array.from({ length: width }, (_, i) =>
    Boolean(value & (1 << (width - 1 - i))),
  );
export function signals(level, offsets) {
  if (
    !Array.isArray(offsets) ||
    offsets.length !== level.masks.length ||
    offsets.some((n) => !Number.isInteger(n) || n < 0 || n >= level.width)
  )
    throw new Error("Invalid offsets");
  let value = level.emitter;
  return level.masks.map((mask, row) => {
    value =
      rotate(value, level.turns[row], level.width) ^
      rotate(mask, offsets[row], level.width);
    return value;
  });
}
export function initial(level) {
  return { offsets: level.masks.map(() => 0), actions: [] };
}
export function won(level, state) {
  const s = signals(level, state.offsets);
  return Object.entries(level.targets).every(
    ([row, target]) => s[Number(row)] === target,
  );
}
export function move(level, state, action) {
  if (
    !action ||
    Object.keys(action).sort().join(",") !== "direction,row" ||
    !Number.isInteger(action.row) ||
    action.row < 0 ||
    action.row >= level.masks.length ||
    ![-1, 1].includes(action.direction) ||
    level.locked.includes(action.row)
  )
    throw new Error("Invalid shift");
  if (state.actions.length >= 2000)
    throw new Error("Replay limit reached; reset this board");
  const offsets = [...state.offsets];
  offsets[action.row] =
    (offsets[action.row] + action.direction + level.width) % level.width;
  return { offsets, actions: [...state.actions, { ...action }] };
}
export function replay(level, actions) {
  if (!Array.isArray(actions) || actions.length > 2000)
    throw new Error("Invalid replay");
  return actions.reduce(
    (state, action) => move(level, state, action),
    initial(level),
  );
}
/** Exhaustive BFS over at most 8^4 orientations, with an explicit incomplete result. */
export function solve(level, state, maxStates = 10000) {
  if (!Number.isInteger(maxStates) || maxStates < 1 || maxStates > 10000)
    throw new Error("Invalid search budget");
  signals(level, state.offsets);
  const key = (offsets) => offsets.join(","),
    start = key(state.offsets),
    queue = [state.offsets],
    seen = new Map([[start, null]]),
    parents = new Map();
  for (let q = 0; q < queue.length; q++) {
    const offsets = queue[q],
      current = key(offsets);
    if (won(level, { offsets })) {
      const actions = [];
      let cursor = current;
      while (cursor !== start) {
        const item = parents.get(cursor);
        actions.push(item.action);
        cursor = item.previous;
      }
      if (actions.length > 2000 - state.actions.length)
        return { status: "replay-limit", actions: [], visited: seen.size };
      return {
        status: "solved",
        actions: actions.reverse(),
        visited: seen.size,
      };
    }
    for (let row = 0; row < offsets.length; row++)
      if (!level.locked.includes(row))
        for (const direction of [-1, 1]) {
          const next = [...offsets];
          next[row] = (next[row] + direction + level.width) % level.width;
          const k = key(next);
          if (seen.has(k)) continue;
          if (seen.size >= maxStates)
            return { status: "incomplete", actions: [], visited: seen.size };
          seen.set(k, true);
          parents.set(k, { previous: current, action: { row, direction } });
          queue.push(next);
        }
  }
  return { status: "unreachable", actions: [], visited: seen.size };
}
export function readProgress(raw, levels) {
  const value = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (
    !value ||
    value.schema !== 1 ||
    typeof value.records !== "object" ||
    value.records === null ||
    Array.isArray(value.records) ||
    Object.keys(value.records).length > levels.length
  )
    throw new Error("Invalid save");
  const records = {};
  for (const [id, item] of Object.entries(value.records)) {
    const level = levels.find((level) => level.id === id);
    if (
      !level ||
      !item ||
      !Array.isArray(item.actions) ||
      !Number.isInteger(item.hints) ||
      item.hints < 0 ||
      item.hints > 2000
    )
      throw new Error("Invalid record");
    const state = replay(level, item.actions);
    records[id] = { actions: state.actions, hints: item.hints };
  }
  return { schema: 1, records };
}
