import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INSTANT_CHART_DEFINITIONS,
  INSTANT_CHART_TYPES,
  buildInstantChartContext,
  calculateInstantChart,
} from 'mingyu-core/instant';
import { calculateBaziChartFromInput } from '../packages/core/src/bazi';
import {
  buildZiweiChartInput,
  calculateZiweiChartForScopes,
} from '../packages/core/src/ziwei/runtime';

const fixedInstant = new Date('2026-08-24T12:30:00+08:00');
const beijingObserver = {
  locationName: '北京市东城区',
  longitude: 116.416,
  latitude: 39.929,
  timezone: 8,
  timeZoneId: 'Asia/Shanghai',
};

test('即时盘目录只包含可按当前时刻生成的排盘，不混入占卜', () => {
  assert.deepEqual(INSTANT_CHART_TYPES, ['bazi', 'ziwei', 'bazi-ziwei', 'astrolabe', 'qizheng']);
  assert.equal(INSTANT_CHART_DEFINITIONS.length, 5);
  assert.equal(
    INSTANT_CHART_DEFINITIONS.some((item) => item.type === ('liuyao' as never)),
    false,
  );
});

test('北京时间即时盘固定按东八区提取当前墙上时间', () => {
  const context = buildInstantChartContext({
    type: 'bazi',
    customDate: fixedInstant,
    timeStandard: 'beijing',
  });

  assert.deepEqual(context.wallClock, {
    year: 2026,
    month: 8,
    day: 24,
    hour: 12,
    minute: 30,
    second: 0,
    offsetHours: 8,
  });
  assert.equal(context.trueSolarTime, undefined);
});

test('北京时间即时盘应保留秒数并用于节气临界点排盘', async () => {
  // 2025-05-05 13:57:00 北京时间早于当日立夏的 13:57:13；
  // 若回退到未时代表值 14:00，会错误地把月柱切到巳月。
  const customDate = new Date('2025-05-05T05:57:00.000Z');
  const response = await calculateInstantChart({
    type: 'bazi',
    customDate,
    timeStandard: 'beijing',
  });
  const direct = calculateBaziChartFromInput({
    gender: 'male',
    year: 2025,
    month: 5,
    day: 5,
    timeIndex: 6,
    dateType: 'solar',
    isLeapMonth: false,
    birthHour: 13,
    birthMinute: 57,
    birthSecond: 0,
  });

  assert.equal(response.wallClock.second, 0);
  assert.equal(response.result.pillars.month.ganZhi, direct.pillars.month.ganZhi);
});

test('八字即时盘不返回性别、大运和命卦等个人字段', async () => {
  const response = await calculateInstantChart({
    type: 'bazi',
    customDate: fixedInstant,
    timeStandard: 'beijing',
  });
  const result = response.result as unknown as Record<string, unknown>;

  assert.equal(response.generatedAt, fixedInstant.toISOString());
  assert.equal(response.timeStandard, 'beijing');
  assert.equal('gender' in result, false);
  assert.equal('luckInfo' in result, false);
  assert.equal('mingGua' in result, false);
  assert.equal('liunian' in result, false);
  assert.equal(typeof response.result.pillars.hour.ganZhi, 'string');
});

test('紫微即时盘只返回无性别的共通宫位资料', async () => {
  const response = await calculateInstantChart({
    type: 'ziwei',
    customDate: fixedInstant,
  });

  assert.equal('gender' in response.result.basicInfo, false);
  assert.equal(response.result.palaces.length, 12);
  assert.equal('changsheng12' in response.result.palaces[0], false);
  assert.equal('boshi12' in response.result.palaces[0], false);
  assert.equal('ages' in response.result.palaces[0], false);
});

test('即时八字与紫微公开字段不随底层技术性性别参数改变', async () => {
  const bazi = await calculateInstantChart({ type: 'bazi', customDate: fixedInstant });
  const femaleBazi = calculateBaziChartFromInput({
    gender: 'female',
    year: 2026,
    month: 8,
    day: 24,
    timeIndex: 6,
    dateType: 'solar',
    isLeapMonth: false,
    birthHour: 12,
    birthMinute: 30,
    birthSecond: 0,
  }) as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(bazi.result)) {
    assert.deepEqual(value, femaleBazi[key], `八字即时盘字段 ${key} 不应依赖性别`);
  }

  const ziwei = await calculateInstantChart({ type: 'ziwei', customDate: fixedInstant });
  const femaleInput = buildZiweiChartInput({
    name: '紫微即时盘',
    gender: 'female',
    dateType: 'solar',
    year: 2026,
    month: 8,
    day: 24,
    timeIndex: 6,
    isLeapMonth: false,
    useTrueSolarTime: false,
    birthHour: 12,
    birthMinute: 30,
    birthSecond: 0,
  });
  const femaleZiwei = (await calculateZiweiChartForScopes(femaleInput, ['origin'])).payloadByScope
    .origin;
  const compareFields = (actual: object, expected: object, label: string) => {
    const expectedRecord = expected as Record<string, unknown>;
    for (const [key, value] of Object.entries(actual)) {
      assert.deepEqual(value, expectedRecord[key], `${label}字段 ${key} 不应依赖性别`);
    }
  };
  compareFields(ziwei.result.basicInfo, femaleZiwei.basic_info, '紫微基础资料');
  compareFields(ziwei.result.activeScope, femaleZiwei.active_scope, '紫微当前范围');
  ziwei.result.palaces.forEach((palace, index) =>
    compareFields(palace, femaleZiwei.palaces[index], `紫微第 ${index + 1} 宫`),
  );
});

test('真太阳时即时盘必须提供地点并返回校正结果', async () => {
  await assert.rejects(
    () =>
      calculateInstantChart({
        type: 'bazi',
        customDate: fixedInstant,
        timeStandard: 'true-solar',
      }),
    /观测地点/,
  );

  const response = await calculateInstantChart({
    type: 'bazi',
    customDate: fixedInstant,
    timeStandard: 'true-solar',
    observer: beijingObserver,
  });
  assert.equal(response.timeStandard, 'true-solar');
  assert.equal(response.observer?.locationName, '北京市东城区');
  assert.ok(response.trueSolarTime?.correctedDateTime);
});

test('即时盘保留 IANA 秒级历史偏移，按给定瞬时点生成真太阳时', () => {
  const customDate = new Date('1900-02-04T05:51:31.000Z');
  const context = buildInstantChartContext({
    type: 'bazi',
    customDate,
    timeStandard: 'true-solar',
    observer: { longitude: 2.35, timeZoneId: 'Europe/Paris' },
  });

  assert.equal(context.wallClock.offsetHours! * 3_600_000, 561_000);
  assert.deepEqual(
    [
      context.wallClock.year,
      context.wallClock.month,
      context.wallClock.day,
      context.wallClock.hour,
      context.wallClock.minute,
      context.wallClock.second,
    ],
    [1900, 2, 4, 6, 0, 52],
  );
  assert.equal(context.trueSolarTime?.timezoneEvidence?.offsetConflict, false);
  assert.equal(
    context.trueSolarTime?.timezoneEvidence?.selectedUtcDateTime,
    customDate.toISOString(),
  );
});

test('星盘和七政四余即时盘始终要求完整观测地点', async () => {
  await assert.rejects(
    () =>
      calculateInstantChart({
        type: 'astrolabe',
        customDate: fixedInstant,
      }),
    /观测地点/,
  );

  const astrolabe = await calculateInstantChart({
    type: 'astrolabe',
    customDate: fixedInstant,
    observer: beijingObserver,
  });
  assert.equal('gender' in astrolabe.result.birth, false);
  assert.match(astrolabe.result.birth.location, /北京市东城区/);

  const qizheng = await calculateInstantChart({
    type: 'qizheng',
    customDate: fixedInstant,
    observer: beijingObserver,
  });
  assert.equal(qizheng.result.stars.length >= 11, true);
  assert.equal(qizheng.result.calculationContext.longitude, beijingObserver.longitude);
  assert.match(qizheng.result.prompt, /起盘时间/);
  assert.match(qizheng.result.prompt, /起盘地点：/);
  assert.match(qizheng.result.prompt, /按起盘时刻与当地太阳高度阈值/);
  assert.match(qizheng.result.prompt, /命宫主宰星/);
  assert.match(qizheng.result.prompt, /本盘记录起盘时刻的星曜位置、落宿、落宫和吊照/);
  assert.doesNotMatch(qizheng.result.prompt, /出生|昼生|夜生|命主|命宫主星/);
});
