import assert from 'node:assert/strict';
import test from 'node:test';
import { handlePublicApiRequest } from '../../src/lib/public-api/handler';

async function post(path: string, input: object) {
  const response = await handlePublicApiRequest(
    new Request(`https://aov.cc/api/v1/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  );
  return { status: response.status, body: await response.json() };
}

test('八字公开排盘传递公历当年的冬至节气日期', async () => {
  const { status, body } = await post('bazi/calculate', {
    gender: 'male',
    year: 2026,
    month: 12,
    day: 25,
    timeIndex: 6,
    dateType: 'solar',
    detailMode: 'full',
  });
  assert.equal(status, 200);
  const terms = body.data.seasonInfo.jieqiList;
  assert.equal(terms.length, 24);
  assert.deepEqual(terms[0], { name: '小寒', date: '2026-01-05' });
  assert.deepEqual(terms.at(-1), { name: '冬至', date: '2026-12-22' });
});

test('真太阳时公开换算传递支持年份边界的跨年结果', async () => {
  const { status, body } = await post('calendar/true-solar-time', {
    localDateTime: '1900-01-01T00:00:00',
    longitude: -180,
    timezone: 8,
  });
  assert.equal(status, 200);
  assert.equal(body.data.correctedTime.year, 1899);
  assert.equal(body.data.crossesDate, true);
  assert.match(body.data.promptText, /1899-12-31/);
});
