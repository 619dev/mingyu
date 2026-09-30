import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQizheng } from '../packages/core/src/qi_zheng/index.ts';

test('七政真太阳时只校正传统命身宫，天体位置保持同一时刻', () => {
  const input = {
    year: 1990,
    month: 5,
    day: 12,
    hour: 8,
    minute: 30,
    latitude: 31.2,
    longitude: 121.5,
    timezone: 8,
  } as const;
  const civil = generateQizheng(input);
  const trueSolar = generateQizheng({ ...input, useTrueSolarTime: true });

  assert.equal(trueSolar.calculationContext.palaceTimeMode, '真太阳时混合口径');
  assert.match(trueSolar.calculationContext.palaceTimeNote ?? '', /真太阳时校正/);
  assert.match(trueSolar.calculationContext.palaceTimeNote ?? '', /紫炁古法模型/);
  assert.doesNotMatch(
    trueSolar.calculationContext.palaceTimeNote ?? '',
    /七政四余位置仍用现代星历/,
  );
  assert.deepEqual(
    trueSolar.stars.map((star) => [star.name, star.longitude, star.xiu]),
    civil.stars.map((star) => [star.name, star.longitude, star.xiu]),
  );
  assert.equal(trueSolar.enNan?.sect, civil.enNan?.sect);
});

test('七政昼夜分金按出生地日出日落状态划分极昼极夜，并让提示词保留依据', () => {
  const location = { latitude: 69.65, longitude: 18.96, timezone: 2 };
  const summer = generateQizheng({
    ...location,
    year: 2024,
    month: 6,
    day: 21,
    hour: 2,
    minute: 0,
  });
  const winter = generateQizheng({
    ...location,
    year: 2024,
    month: 12,
    day: 21,
    hour: 12,
    minute: 0,
    timezone: 1,
  });

  assert.equal(summer.calculationContext.solarIllumination.sunriseSunset.status, '全天高于阈值');
  assert.equal(winter.calculationContext.solarIllumination.sunriseSunset.status, '全天低于阈值');
  assert.equal(summer.enNan?.sect, '昼生');
  assert.equal(winter.enNan?.sect, '夜生');
  assert.match(summer.prompt, /昼生.*当地太阳高度阈值.*-0\.833°/);
  assert.match(winter.prompt, /夜生.*当地太阳高度阈值.*-0\.833°/);
  assert.doesNotMatch(`${summer.prompt}\n${winter.prompt}`, /全天高于阈值|全天低于阈值|正常交点/);
  assert.doesNotMatch(
    `${summer.prompt}\n${winter.prompt}`,
    /太阳高朗为贵|太阴清辉为吉|逢险有救应|须防动荡受挫/,
  );
});
