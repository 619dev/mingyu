import test from 'node:test';
import assert from 'node:assert/strict';

import { generateResidentialFengshui } from '../packages/core/src/residential_fengshui/index.ts';

test('候选宅卦改变命宅关系时建议复测坐向而非补充已提供资料', () => {
  const result = generateResidentialFengshui({
    year: 2024,
    birthYear: 1990,
    gender: 'male',
    doorToInteriorDegree: 64,
    northReference: 'magnetic',
    magneticDeclinationDegrees: 1,
    measurementUncertaintyDegrees: 3,
  });

  assert.equal(result.xuankong?.measurement?.stability, '山向边界敏感');
  assert.ok(result.bazhai && 'directionMeasurement' in result.bazhai);
  assert.deepEqual(
    result.bazhai.directionMeasurement.candidateDirections.map((item) => [
      item.label,
      item.houseGua,
      item.match,
    ]),
    [
      ['寅山申向', '艮', '相冲'],
      ['甲山庚向', '震', '相合'],
    ],
  );
  assert.ok(result.advice.some((item) => item.includes('复测坐向')));
  assert.ok(result.advice.every((item) => !item.includes('补山向或居住人信息')));
});

test('候选宅卦同属东四宅时证据仍标明中心宅卦及另一候选宅卦', () => {
  const result = generateResidentialFengshui({
    year: 2024,
    mingGua: '坎',
    sitDegree: 112,
    northReference: 'true',
    measurementUncertaintyDegrees: 1,
  });

  assert.ok(result.bazhai && 'directionMeasurement' in result.bazhai);
  assert.equal(result.bazhai.directionMeasurement.stability, '宅卦不稳定');
  assert.deepEqual(
    result.bazhai.directionMeasurement.candidateDirections.map((item) => [
      item.houseGua,
      item.match,
    ]),
    [
      ['震', '相合'],
      ['巽', '相合'],
    ],
  );
  assert.match(result.evidencePromptText, /宅卦震（中心读数；候选震宅、巽宅），命宅关系相合/);
  assert.match(result.prompt, /候选坐向：乙山辛向（震宅、命宅相合）、辰山戌向（巽宅、命宅相合）/);
});

test('交运首年只给年份时，宅运摘要与提示词保持暂排口径', () => {
  const result = generateResidentialFengshui({
    year: 2024,
    mingGua: '坎',
    sitMountain: '子',
  });

  assert.equal(result.xuankong?.period.boundaryStatus, '待核定');
  assert.match(result.agreements[0].detail, /玄空见暂按下元9运/);
  assert.match(result.advice[0], /先看宅运：暂按下元9运/);
  assert.match(result.advice[0], /需按建造或起运日期核定运期/);
  assert.match(result.prompt, /运程：暂按下元9运/);
  assert.match(result.evidencePromptText, /暂按下元9运/);

  const settled = generateResidentialFengshui({ year: 2025, mingGua: '坎', sitMountain: '子' });
  assert.equal(settled.xuankong?.period.boundaryStatus, undefined);
  assert.doesNotMatch(settled.advice[0], /暂按|核定运期/);
});

test('立春同小时出生时刻不完整时，住宅合参不把命卦写成已核定', () => {
  const result = generateResidentialFengshui({
    year: 2024,
    birthYear: 2024,
    birthMonth: 2,
    birthDay: 4,
    birthHour: 16,
    gender: 'male',
    sitMountain: '子',
  });

  assert.equal(result.bazhai?.birthYearBoundaryStatus, '待复核');
  assert.match(result.agreements[0].detail, /八宅暂按命卦巽/);
  assert.match(result.advice[1], /暂按命卦巽/);
  assert.match(result.evidencePromptText, /暂按命卦巽/);
  assert.match(result.prompt, /候选命卦：2023年巽命、2024年震命/);
});

test('住宅合参按缺失的出生日期或秒数提出复核资料', () => {
  const onlyYear = generateResidentialFengshui({ birthYear: 1990, gender: 'male' });
  assert.equal(onlyYear.bazhai?.birthYearBoundaryStatus, '待复核');
  assert.match(onlyYear.advice.join(' '), /补充出生月日后复核/);
  assert.doesNotMatch(onlyYear.advice.join(' '), /补充准确出生时刻/);

  const birth = {
    birthYear: 2024,
    birthMonth: 2,
    birthDay: 4,
    birthHour: 16,
    birthMinute: 27,
    gender: 'male' as const,
  };
  const partial = generateResidentialFengshui(birth);
  const settled = generateResidentialFengshui({ ...birth, birthSecond: 8 });
  assert.match(partial.advice.join(' '), /补充出生秒数后复核/);
  assert.equal(settled.bazhai?.birthYearBoundaryStatus, '已核定');
  assert.equal(settled.bazhai?.calculationInput.birthSecond, 8);
  assert.doesNotMatch(settled.advice.join(' '), /补充出生秒数/);
});
