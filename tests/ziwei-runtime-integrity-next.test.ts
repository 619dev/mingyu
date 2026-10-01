import assert from 'node:assert/strict';
import test from 'node:test';

import { buildZiweiFortuneTimeline } from '../packages/core/src/ziwei/fortune-timeline';
import { calculateZiweiChart } from '../packages/core/src/ziwei/runtime';
import type { ChartInput } from '../packages/core/src/types/chart';

test('紫微独立运限仅指定日期时沿用当前流时，与完整盘同一时辰事实', async (context) => {
  context.mock.timers.enable({ apis: ['Date'], now: new Date('2026-08-06T04:30:00Z') });
  const input: ChartInput = {
    name: '流时一致性',
    gender: '女',
    dateType: 'solar',
    birthDate: '1992-08-21',
    birthTimeIndex: 4,
  };
  const dateStr = '2026-08-06';
  const expectedContext = { dateStr, hourIndex: 6 };
  const standalone = await buildZiweiFortuneTimeline(input, { scope: 'hour', dateStr });
  const runtime = await calculateZiweiChart(input, {
    scopes: ['origin'],
    skipAnalysis: true,
    horoscopeContext: expectedContext,
    fortuneRange: { scope: 'hour', dateStr },
  });
  const standaloneHour = standalone.periods
    .flatMap((period) => period.years)
    .find((year) => Boolean(year.targetHour))?.targetHour;
  const runtimeHour = runtime.fortuneTimeline?.periods
    .flatMap((period) => period.years)
    .find((year) => Boolean(year.targetHour))?.targetHour;

  assert.equal(standalone.targetDateStr, dateStr);
  assert.equal(standalone.targetHourIndex, 6);
  assert.equal(runtime.fortuneTimeline?.targetHourIndex, 6);
  assert.ok(standaloneHour);
  assert.deepEqual(standaloneHour, runtimeHour);
  assert.equal(standaloneHour.heavenlyStem, runtime.horoscope.hourly.heavenlyStem);
  assert.equal(standaloneHour.earthlyBranch, runtime.horoscope.hourly.earthlyBranch);
  assert.equal(`${standaloneHour.heavenlyStem}${standaloneHour.earthlyBranch}`, '丙午');
});
