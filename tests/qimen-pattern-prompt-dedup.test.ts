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
  assert.match(patterns, /吉格：月奇得使（兑七宫）；丙奇加地盘戊/);
  assert.match(patterns, /吉格：月奇得使临吉门（兑七宫）；同宫临生门/);
  assert.doesNotMatch(patterns, /月奇得使又临吉门生门/);
  assert.match(patterns, /凶格：门迫（巽四宫）；惊门（金）克巽四宫（木）/);
});
