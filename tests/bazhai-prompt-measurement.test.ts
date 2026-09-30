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
  assert.match(result.prompt, /宅卦：艮（西四宅，中心读数）/);
  assert.match(result.prompt, /命宅配合：相冲（中心读数）/);
  assert.match(result.prompt, /宅卦八方（中心读数）：/);
  assert.match(result.prompt, /【任务】[\s\S]*【盘面资料】/);
  assert.match(result.prompt, /候选震宅八方：[\s\S]*东伏位/);
  assert.match(result.prompt, /【传统依据】[\s\S]*大游年八方/);

  const stable = analyzeBaZhaiByDoorDegree({
    mingGua: '坎',
    doorToInteriorDegree: 0,
    northReference: 'true',
  });
  assert.equal(stable.directionMeasurement.stability, '稳定');
  assert.doesNotMatch(stable.prompt, /候选坐向|中心读数/);
  assert.match(stable.prompt, /测向资料：站在大门处面向屋内测量，读数0°，北向基准真北/);
  assert.match(stable.prompt, /换算为子山午向，距最近二十四山分界7\.5°，测量状态稳定/);
});

test('八宅同宅卦跨山界时提示词保留候选山向和测向事实', () => {
  const result = analyzeBaZhaiByDoorDegree({
    mingGua: '坎',
    doorToInteriorDegree: 7,
    northReference: 'true',
    measurementUncertaintyDegrees: 1,
  });
  assert.equal(result.directionMeasurement.stability, '山向边界敏感');
  assert.match(result.prompt, /读数7°，北向基准真北/);
  assert.match(result.prompt, /候选坐向：子山午向、癸山丁向；宅卦仍属坎/);
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
