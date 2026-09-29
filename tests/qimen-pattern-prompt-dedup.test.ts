import assert from 'node:assert/strict';
import test from 'node:test';

import { generateQimen } from '../packages/core/src/divination/algorithms/qimen';
import { analyzeQimenEvidence } from '../packages/core/src/divination/qimen-evidence';

test('奇门证据提示词保留命中条件并省略同宫格局的重复前提', () => {
  const data = generateQimen(new Date('2026-05-19T10:30:00+08:00'));
  const prompt = analyzeQimenEvidence(data).promptText;
  const patterns = prompt.split('【传统格局】\n')[1]?.split('【应期资料】')[0] ?? '';

  assert.match(patterns, /吉格：天遁（兑七宫）；生门、丙奇、地盘戊同宫/);
  assert.doesNotMatch(patterns, /乃天遁之格/);
  assert.doesNotMatch(patterns, /^吉格：月奇得使（/mu);
  assert.match(
    patterns,
    /吉格：月奇得使临吉门；丙奇加地盘戊（甲子\/甲申所遁）于兑七宫；同宫临生门/,
  );
  assert.doesNotMatch(patterns, /月奇得使又临吉门生门/);
  assert.match(patterns, /凶格：门迫；惊门（金）克巽四宫（木）/);
});

test('三奇入墓在固定盘与证据提示词中只保留三奇专名', () => {
  const data = generateQimen(new Date('2026-05-01T14:00:00+08:00'));
  const tombNames = (data.classicPatterns ?? []).map((pattern) => pattern.name);
  assert.ok(tombNames.includes('日奇入墓'));
  assert.ok(!tombNames.includes('乙入墓'));
  assert.ok(tombNames.includes('己入墓'));

  const prompt = analyzeQimenEvidence(data).promptText;
  const patterns = prompt.split('【传统格局】\n')[1]?.split('【应期资料】')[0] ?? '';
  assert.match(patterns, /凶格：日奇入墓；乙奇入坤二宫/);
  assert.doesNotMatch(patterns, /凶格：乙入墓/);
  assert.match(patterns, /凶格：己入墓/);
});
