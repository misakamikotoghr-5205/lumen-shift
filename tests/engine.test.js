import test from "node:test";
import assert from "node:assert/strict";
import {
  rotate,
  bits,
  signals,
  initial,
  move,
  replay,
  won,
  solve,
  readProgress,
} from "../engine.js";
import { levels } from "../levels.js";
test("circular shifts preserve every bit over all supported registers", () => {
  for (let width = 2; width <= 8; width++)
    for (let value = 0; value < 2 ** width; value++)
      for (const amount of [-17, -8, -1, 0, 1, 8, 19]) {
        const shifted = rotate(value, amount, width);
        assert.equal(rotate(shifted, -amount, width), value);
        assert.equal(
          bits(shifted, width).filter(Boolean).length,
          bits(value, width).filter(Boolean).length,
        );
      }
  assert.equal(rotate(0b100001, 1, 6), 0b000011);
  assert.equal(rotate(0b100001, -1, 6), 0b110000);
});
test("signal propagation agrees with a boolean-array reference, including negative turns", () => {
  for (const level of levels) {
    const offsets = level.masks.map((_, i) => (i + 2) % level.width);
    let incoming = bits(level.emitter, level.width);
    for (let row = 0; row < level.masks.length; row++) {
      const turn =
        ((level.turns[row] % level.width) + level.width) % level.width;
      incoming = [...incoming.slice(turn), ...incoming.slice(0, turn)];
      const mask = bits(level.masks[row], level.width),
        n = offsets[row];
      const shifted = [...mask.slice(n), ...mask.slice(0, n)];
      incoming = incoming.map((on, i) => on !== shifted[i]);
      assert.deepEqual(
        bits(signals(level, offsets)[row], level.width),
        incoming,
      );
    }
  }
});
test("all eight boards start unfinished and have replayable exact-search solutions", () => {
  assert.equal(levels.length, 8);
  for (const level of levels) {
    assert.equal(won(level, initial(level)), false, level.id);
    const result = solve(level, initial(level));
    assert.equal(result.status, "solved", level.id);
    assert.ok(result.actions.length > 0 && result.actions.length < 20);
    assert.ok(result.visited <= level.width ** level.masks.length);
    assert.equal(won(level, replay(level, result.actions)), true, level.id);
    for (const action of result.actions)
      assert.ok(!level.locked.includes(action.row));
  }
});
test("checkpoint must match as well as final receiver", () => {
  const l = levels.find((l) => Object.keys(l.targets).length > 1),
    s = initial(l),
    out = signals(l, s.offsets);
  const custom = {
    ...l,
    targets: { 0: out[0] ^ 1, [l.masks.length - 1]: out.at(-1) },
  };
  assert.equal(won(custom, s), false);
});
test("shifts are immutable, reversible and wrap exactly once per board width", () => {
  for (const l of levels) {
    let state = initial(l);
    const before = structuredClone(state),
      row = l.masks.findIndex((_, i) => !l.locked.includes(i));
    for (let i = 0; i < l.width; i++)
      state = move(l, state, { row, direction: 1 });
    assert.deepEqual(state.offsets, before.offsets);
    assert.deepEqual(initial(l), before);
    const next = move(l, initial(l), { row, direction: -1 });
    assert.deepEqual(
      move(l, next, { row, direction: 1 }).offsets,
      before.offsets,
    );
  }
});
test("invalid, locked, out-of-range and extra-field actions are rejected", () => {
  const l = levels.find((l) => l.locked.length),
    state = initial(l);
  for (const action of [
    { row: l.locked[0], direction: 1 },
    { row: -1, direction: 1 },
    { row: 0, direction: 0 },
    { row: 100, direction: 1 },
    { row: 0, direction: "1" },
    { row: 0, direction: 1, won: true },
  ])
    assert.throws(() => move(l, state, action));
  assert.deepEqual(state, initial(l));
});
test("bounded search reports incomplete rather than pretending a hint exists", () => {
  assert.equal(solve(levels[2], initial(levels[2]), 1).status, "incomplete");
  assert.throws(() => solve(levels[0], initial(levels[0]), 0));
});
test("search distinguishes an unreachable locked board", () => {
  const level = {
    width: 3,
    emitter: 0,
    masks: [0],
    turns: [0],
    locked: [0],
    targets: { 0: 1 },
  };
  assert.equal(solve(level, initial(level)).status, "unreachable");
});
test("valid progress is reconstructed from actions instead of trusting claimed results", () => {
  const l = levels[0],
    actions = solve(l, initial(l)).actions;
  const parsed = readProgress(
    {
      schema: 1,
      records: { [l.id]: { actions, hints: 1, won: false, moves: -999 } },
    },
    levels,
  );
  assert.equal(won(l, replay(l, parsed.records[l.id].actions)), true);
  assert.deepEqual(Object.keys(parsed.records[l.id]).sort(), [
    "actions",
    "hints",
  ]);
});
test("malformed or forged imported replays fail before replacing progress", () => {
  for (const value of [
    "bad json",
    { schema: 2, records: {} },
    { schema: 1, records: [] },
    { schema: 1, records: { missing: { actions: [], hints: 0 } } },
    {
      schema: 1,
      records: {
        [levels[0].id]: { actions: [{ row: 99, direction: 1 }], hints: 0 },
      },
    },
    { schema: 1, records: { [levels[0].id]: { actions: [], hints: -1 } } },
  ])
    assert.throws(() => readProgress(value, levels));
});
test("a replay has an explicit size limit and offsets cannot escape the register", () => {
  assert.throws(() =>
    replay(
      levels[0],
      Array.from({ length: 2001 }, () => ({ row: 0, direction: 1 })),
    ),
  );
  for (const offsets of [[], [0, -1], [0, 6], [0, 1.5]])
    assert.throws(() => signals(levels[0], offsets));
  for (const args of [
    [-1, 1, 6],
    [64, 1, 6],
    [0, 0, 10],
    [0, 0.5, 6],
  ])
    assert.throws(() => rotate(...args));
});
test("one-step hint from a partially played board remains replayable", () => {
  const l = levels[6];
  let state = initial(l);
  for (let i = 0; i < 5; i++) {
    const result = solve(l, state);
    assert.equal(result.status, "solved");
    if (!result.actions.length) break;
    state = move(l, state, result.actions[0]);
  }
  const rest = solve(l, state);
  for (const action of rest.actions) state = move(l, state, action);
  assert.equal(won(l, state), true);
});
test('a hint never promises actions beyond the remaining replay allowance', () => {
  const level = levels[0];
  const full = replay(level, Array.from({length: 2000}, () => ({row: 0, direction: 1})));
  assert.equal(won(level, full), false);
  const result = solve(level, full);
  assert.equal(result.status, 'replay-limit');
  assert.deepEqual(result.actions, []);
  const near = replay(level, full.actions.slice(0, 1998));
  const next = solve(level, near);
  assert.equal(next.status, 'solved');
  assert.ok(next.actions.length <= 2000 - near.actions.length);
  let continued = near;
  for (const action of next.actions) continued = move(level, continued, action);
  assert.equal(won(level, continued), true);
});
