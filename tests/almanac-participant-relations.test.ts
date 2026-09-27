import test from 'node:test';
import assert from 'node:assert/strict';

import { generateAlmanacSelection } from '../packages/core/src/divination/algorithms/almanac.ts';
import { isLiuhai, isSanxing } from '../packages/core/src/ganzhi/index.ts';

test('寅日与巳年参与人同时命中刑害，逐日事实与公开证据均保留', () => {
  assert.equal(isSanxing('寅', '巳'), true);
  assert.equal(isLiuhai('寅', '巳'), true);

  const result = generateAlmanacSelection({
    topic: 'custom',
    startDate: '2026-06-09',
    endDate: '2026-06-09',
    participants: [
      {
        id: 'owner',
        name: '屋主',
        gender: '男',
        year: '1989',
        month: '7',
        day: '1',
        timeIndex: '6',
        dateType: 'solar',
      },
    ],
  });
  const day = result.days[0]!;
  const candidate = result.evidenceAnalysis!.candidates[0]!;
  assert.equal(day.ganzhi.day, '甲寅');
  assert.equal(result.participants[0]!.pillars.year, '己巳');

  const yearRelations = day
    .participantRelationFacts!.filter(
      (fact) => fact.participantId === 'owner' && fact.basis === '年支',
    )
    .map((fact) => fact.relation);
  assert.deepEqual(yearRelations, ['刑', '害']);
  assert.ok(day.participantNotes.some((note) => /刑生肖\/年支巳.*害生肖\/年支巳/u.test(note)));
  assert.deepEqual(
    candidate.participantRelationFacts
      .filter((fact) => fact.participantId === 'owner' && fact.basis === '年支')
      .map((fact) => fact.relation),
    yearRelations,
  );
  assert.equal(candidate.status, '慎用候选');
  assert.match(result.evidenceAnalysis!.promptText, /与其年支巳刑/u);
  assert.match(result.evidenceAnalysis!.promptText, /与其年支巳害/u);
});

test('出生区间内稳定的寅巳刑害分别覆盖完整半开区间', () => {
  const startTimestamp = Date.parse('2024-02-11T15:00:00+08:00');
  const endTimestamp = Date.parse('2024-02-11T17:00:00+08:00');
  const result = generateAlmanacSelection({
    topic: 'custom',
    startDate: '2026-06-09',
    endDate: '2026-06-09',
    participants: [
      {
        id: 'ranged',
        name: '区间参与人',
        gender: '',
        year: '2024',
        month: '2',
        day: '11',
        birthHour: '15',
        birthMinute: '0',
        birthSecond: '0',
        dateType: 'solar',
        birthTimeRange: {
          startTimestamp,
          endTimestamp,
          endExclusive: true,
          timezone: 'Asia/Shanghai',
          offsetHours: 8,
          pillars: { year: '甲辰', month: '丙寅', day: '乙巳', hour: '甲申' },
        },
      },
    ],
  });

  const dayBranchFacts = result.days[0]!.participantRelationFacts!.filter(
    (fact) => fact.participantId === 'ranged' && fact.basis === '日支',
  );
  assert.deepEqual(
    dayBranchFacts.map((fact) => fact.relation),
    ['刑', '害'],
  );
  for (const fact of dayBranchFacts) {
    assert.equal(fact.birthTimeRange?.status, 'stable');
    assert.deepEqual(fact.birthTimeRange?.intervals, [
      { startTimestamp, endTimestamp, endExclusive: true },
    ]);
  }
});
