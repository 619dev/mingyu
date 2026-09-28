import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBaZhaiByDoorDegree } from '../packages/core/src/ba_zhai/index.ts';

test('八宅宅卦跨界时提示词并列候选并标明中心读数盘', () => {
  const result = analyzeBaZhaiByDoorDegree({
    birthYear: 1990,
    gender: 'male',
    doorToInteriorDegree: 64,
    northReference: 'magnetic',
    magneticDeclinationDegrees: 1,
    measurementUncertaintyDegrees: 3,
  });

  assert.equal(result.directionMeasurement.trueNorthDegree, 65);
  assert.equal(result.directionMeasurement.stability, '宅卦不稳定');
  assert.deepEqual(
    result.directionMeasurement.candidateDirections.map((item) => [
      item.label,
      item.houseGua,
      item.match,
    ]),
    [
      ['寅山申向', '艮', '相冲'],
      ['甲山庚向', '震', '相合'],
    ],
  );
  assert.match(result.prompt, /候选坐向：寅山申向（艮宅、命宅相冲）、甲山庚向（震宅、命宅相合）/);
  assert.match(result.prompt, /宅卦：艮（西四命，中心读数）/);
  assert.match(result.prompt, /命宅配合：相冲（中心读数）/);
  assert.match(result.prompt, /宅卦八方（中心读数）：/);

  const stable = analyzeBaZhaiByDoorDegree({
    mingGua: '坎',
    doorToInteriorDegree: 0,
    northReference: 'true',
  });
  assert.equal(stable.directionMeasurement.stability, '稳定');
  assert.doesNotMatch(stable.prompt, /候选坐向|中心读数/);
});

test('八宅未声明北向时只把原始角度标为暂算依据', () => {
  const result = analyzeBaZhaiByDoorDegree({
    mingGua: '坎',
    doorToInteriorDegree: 0,
  });

  assert.match(
    result.directionMeasurement.promptText,
    /北向基准未声明；按原始读数 0°暂算入户方向（非已确认真北）/,
  );
  assert.match(result.prompt, /北向基准未声明；以下坐向按原始读数暂算/);
  assert.match(result.evidenceAnalysis.measurementFact.promptText, /北向基准未声明/);
  assert.match(result.evidenceAnalysis.measurementCandidateFacts[0].promptText, /按原始读数暂算/);
  assert.match(
    result.evidenceAnalysis.measurementCandidateFacts[0].limitation,
    /不代表真北坐向范围/,
  );
  assert.doesNotMatch(result.evidenceAnalysis.promptText, /真北口径0°|换算真北口径为0°/);
});
