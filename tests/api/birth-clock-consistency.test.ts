import assert from 'node:assert/strict';
import test from 'node:test';
import { handlePublicApiRequest } from '../../src/lib/public-api/handler';

type BirthInput = Record<string, unknown>;

const birth = {
  name: '出生钟表一致性样本',
  gender: 'male',
  dateType: 'solar',
  year: 2024,
  month: 6,
  day: 1,
} as const;

async function callApi(path: string, input: BirthInput) {
  const response = await handlePublicApiRequest(
    new Request(`https://example.test/api/v1/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  );
  const body = await response.json();
  return { status: response.status, body };
}

function assertSuccess(result: Awaited<ReturnType<typeof callApi>>) {
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body.data;
}

test('无秒钟表按零秒统一八字、紫微单盘与合参时辰', async () => {
  for (const [birthHour, birthMinute] of [
    [0, 5],
    ['0', '5'],
  ]) {
    const input = { ...birth, birthHour, birthMinute, timeIndex: 6 };
    const bazi = assertSuccess(await callApi('bazi/calculate', input));
    const ziwei = assertSuccess(await callApi('ziwei/calculate', input));
    const combined = assertSuccess(
      await callApi('bazi-ziwei/prompt', {
        ...input,
        question: '请核对本命盘。',
        promptScope: 'origin',
        responseMode: 'full',
      }),
    );

    assert.equal(bazi.timeInfo.index, 0);
    assert.equal(bazi.pillars.hour.ganZhi, ziwei.basicInfo.four_pillars.hour_pillar);
    assert.equal(ziwei.basicInfo.birth_time_label, '早子时');
    assert.equal(combined.result.bazi.timeInfo.index, 0);
    assert.equal(combined.result.bazi.pillars.hour.ganZhi, bazi.pillars.hour.ganZhi);
    assert.equal(
      combined.result.ziwei.basicInfo.four_pillars.hour_pillar,
      bazi.pillars.hour.ganZhi,
    );
    assert.equal(combined.result.ziwei.basicInfo.birth_time_label, '早子时');
  }
});

test('仅时分可省略时辰索引，提示词机器身份保留零秒并可重放', async () => {
  const input = { ...birth, birthHour: '0', birthMinute: '5' };
  const bazi = assertSuccess(await callApi('bazi/calculate', input));
  const ziwei = assertSuccess(await callApi('ziwei/calculate', input));
  assert.equal(bazi.timeInfo.index, 0);
  assert.equal(ziwei.basicInfo.birth_time_label, '早子时');

  for (const [path, replayPath] of [
    ['bazi/prompt', 'bazi/calculate'],
    ['ziwei/prompt', 'ziwei/calculate'],
  ]) {
    const prompt = assertSuccess(
      await callApi(path, {
        ...input,
        question: '请核对本命盘。',
        promptScope: 'origin',
        baziFortuneScope: 'natal',
        responseMode: 'full',
      }),
    );
    const identityBirth = prompt.result.calculationIdentity.birth;
    assert.equal(identityBirth.birthHour, 0);
    assert.equal(identityBirth.birthMinute, 5);
    assert.equal(identityBirth.birthSecond, 0);
    assert.equal(identityBirth.timeIndex, undefined);
    const replay = assertSuccess(await callApi(replayPath, identityBirth));
    if (replayPath === 'bazi/calculate') {
      assert.deepEqual(replay.pillars, bazi.pillars);
    } else {
      assert.equal(
        replay.basicInfo.four_pillars.hour_pillar,
        ziwei.basicInfo.four_pillars.hour_pillar,
      );
    }
  }
});

test('传统时辰与空表单沿用索引，部分钟表和坏值明确拒绝', async () => {
  const traditional = { ...birth, timeIndex: 6 };
  const bazi = assertSuccess(await callApi('bazi/calculate', traditional));
  const ziwei = assertSuccess(
    await callApi('ziwei/calculate', { ...traditional, birthHour: '', birthMinute: '' }),
  );
  assert.equal(bazi.timeInfo.index, 6);
  assert.match(ziwei.basicInfo.birth_time_range, /11:00~13:00/);
  const unknown = assertSuccess(
    await callApi('bazi/calculate', { ...birth, timeIndex: -1, detailMode: 'full' }),
  );
  assert.equal(unknown.isThreePillars, true);

  for (const invalidClock of [
    { birthHour: 0 },
    { birthMinute: '5' },
    { birthSecond: 1 },
    { birthHour: 'bad', birthMinute: '5' },
    { birthHour: 24, birthMinute: 5 },
  ]) {
    for (const path of ['bazi/calculate', 'ziwei/calculate', 'bazi-ziwei/prompt']) {
      const result = await callApi(path, {
        ...traditional,
        ...invalidClock,
        question: '请核对本命盘。',
      });
      assert.equal(result.status, 400, `${path}: ${JSON.stringify(result.body)}`);
    }
  }
});
