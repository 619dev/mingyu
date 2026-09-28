import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveBirthPlace } from '../packages/core/src/location/index.ts';
import {
  analyzeChineseName,
  buildChineseNameAnalysisPrompt,
} from '../packages/core/src/name-number/index.ts';

test('姓名出生事实区分地点代表坐标并列出实际校正经度和时区', () => {
  const birth = {
    gender: 'male' as const,
    year: 2000,
    month: 1,
    day: 1,
    timeIndex: 6,
    dateType: 'solar' as const,
    useTrueSolarTime: true,
    birthHour: 9,
    birthMinute: 0,
  };
  const district = resolveBirthPlace('110101')!;
  const districtAnalysis = analyzeChineseName({
    fullName: '李清和',
    birth: {
      ...birth,
      birthPlace: district.displayName,
      birthLongitude: district.longitude,
      timezone: 8,
    },
  });
  const districtPrompt = buildChineseNameAnalysisPrompt({ analysis: districtAnalysis });
  assert.equal(districtAnalysis.birthContext?.timeBasis.locationLevel, 'district');
  assert.equal(
    districtAnalysis.birthContext?.timeBasis.coordinateAccuracy,
    'administrative-center',
  );
  assert.equal(districtAnalysis.birthContext?.timeBasis.timezone, 8);
  assert.match(
    districtPrompt,
    /地点记录：北京市 东城区；真太阳时校正经度：116\.416334°（区县行政中心代表点）；时区：UTC\+8/,
  );
  assert.doesNotMatch(districtPrompt, /出生地按经度定位|中国行政区地点数据|来源与精度未注明/);

  const approximatePlace = resolveBirthPlace('710246')!;
  const approximateAnalysis = analyzeChineseName({
    fullName: '李清和',
    birth: {
      ...birth,
      birthPlace: approximatePlace.displayName,
      birthLongitude: approximatePlace.longitude,
    },
  });
  assert.equal(
    approximateAnalysis.birthContext?.timeBasis.coordinateAccuracy,
    'province-approximation',
  );
  assert.match(buildChineseNameAnalysisPrompt({ analysis: approximateAnalysis }), /省级近似坐标/);

  const longitudeOnlyAnalysis = analyzeChineseName({
    fullName: '李清和',
    birth: {
      ...birth,
      birthPlace: '',
      birthLongitude: 75,
      timeZoneId: 'Asia/Kolkata',
    },
  });
  assert.equal(longitudeOnlyAnalysis.birthContext?.timeBasis.locationLevel, null);
  assert.equal(longitudeOnlyAnalysis.birthContext?.timeBasis.timezone, 5.5);
  assert.match(
    buildChineseNameAnalysisPrompt({ analysis: longitudeOnlyAnalysis }),
    /地点记录：未提供；真太阳时校正经度：75°；时区：Asia\/Kolkata，UTC\+5\.5/,
  );
});
