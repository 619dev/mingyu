import assert from 'node:assert/strict';
import test from 'node:test';

import {
  analyzeChineseName,
  buildChineseNameAnalysisPrompt,
} from '../packages/core/src/name-number/index.ts';

test('起名提示词只列未知时辰下已确定的出生柱并标明待补柱', () => {
  const analysis = analyzeChineseName({
    fullName: '李明',
    birth: {
      gender: 'male',
      year: 2000,
      month: 1,
      day: 1,
      timeIndex: '',
      dateType: 'solar',
      isThreePillars: true,
    },
  });

  const prompt = buildChineseNameAnalysisPrompt({ analysis });

  assert.match(prompt, /已确定柱：年柱己卯、月柱丙子/);
  assert.match(prompt, /待补柱：日柱、时柱/);
  assert.doesNotMatch(prompt, /四柱（已确定柱）|日柱藏干：|时柱藏干：/);
  assert.match(prompt, /候选日初00:00:00候选/);
  assert.match(prompt, /候选晚子时候选/);
});
