import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { generateJinkoujue } from '../packages/core/src/divination/algorithms/jinkoujue';
import { formatEnhancedDivinationInfo } from '../packages/core/src/prompt/divination-enhanced';

const date = new Date('2025-01-01T08:00:00+08:00');

test('金口诀辅助位受月令限制时保留反证，不误标发用主线受限', () => {
  const data = generateJinkoujue({ method: 'branch', branch: '午', customDate: date });
  const evidence = data.evidenceAnalysis!;

  assert.equal(data.yinYangUse.usePosition, '将神');
  assert.equal(data.positions.jiangShen.seasonState, '相');
  assert.equal(data.positions.jiangShen.isVoid, false);
  assert.ok(evidence.counterEvidenceFacts.some((item) => item.detail === '地分月令死'));
  assert.equal(evidence.summaryFact.status, '证据链完整');
  assert.ok(evidence.counterEvidenceFacts.every((item) => item.type !== '主证受限'));
});

test('金口诀发用位旬空仍标主线受限，辅助位旬空只作为该位事实', () => {
  const mainVoid = generateJinkoujue({ method: 'branch', branch: '寅', customDate: date });
  assert.equal(mainVoid.yinYangUse.usePosition, '将神');
  assert.equal(mainVoid.positions.jiangShen.isVoid, true);
  assert.equal(mainVoid.evidenceAnalysis?.summaryFact.status, '主线受限');
  assert.equal(
    mainVoid.evidenceAnalysis?.counterEvidenceFacts.filter(
      (item) => item.type === '旬空' && item.ownerKey === 'jinkoujue:position:将神',
    ).length,
    1,
  );

  const auxiliaryVoid = generateJinkoujue({
    method: 'branch',
    branch: '巳',
    customDate: new Date('2025-02-01T08:00:00+08:00'),
  });
  assert.equal(auxiliaryVoid.yinYangUse.usePosition, '将神');
  assert.equal(auxiliaryVoid.positions.jiangShen.isVoid, false);
  assert.equal(auxiliaryVoid.positions.guiShen.isVoid, true);
  assert.equal(auxiliaryVoid.evidenceAnalysis?.summaryFact.status, '证据链完整');
  const prompt = formatEnhancedDivinationInfo('jinkoujue', auxiliaryVoid);
  assert.match(prompt, /贵神巳落日旬空/);
  assert.doesNotMatch(prompt, /需待填实后再作主断|主证受限/);
});

test('金口诀公元 1 年大寒前沿用上一冬至的丑将', () => {
  const data = generateJinkoujue({ customDate: new Date('0001-01-20T00:00:00Z') });
  assert.equal(data.monthLeader, '丑');
  assert.equal(
    generateJinkoujue({ customDate: new Date('0001-01-21T08:39:40Z') }).monthLeader,
    '丑',
  );
  assert.equal(
    generateJinkoujue({ customDate: new Date('0001-01-21T08:39:41Z') }).monthLeader,
    '子',
  );
});
