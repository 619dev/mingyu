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
