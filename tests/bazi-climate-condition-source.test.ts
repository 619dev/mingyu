import assert from 'node:assert/strict';
import test from 'node:test';

import { baziCalculator } from '../packages/core/src/bazi/baziCalculator';

// 《穷通宝鉴·九月丙火》：https://zh.wikisource.org/w/index.php?title=穷通宝鉴&oldid=2294674
test('丙日戌月庚戊困木水按实盘透藏命中，缺木时不命中', () => {
  const ruleId = 'xu-month-bing-geng-wu-trap-jia-ren';
  const chartWithWood = baziCalculator.calculateBazi({
    year: 1982,
    month: 10,
    day: 10,
    timeIndex: 0,
    gender: 'male',
    isLunar: false,
  });
  assert.deepEqual(
    Object.values(chartWithWood.pillars).map((pillar) => pillar.ganZhi),
    ['壬戌', '庚戌', '丙寅', '戊子'],
  );
  assert.ok(chartWithWood.analysis.usefulGod.matchedRules?.some((item) => item.id === ruleId));

  const chartWithoutWood = baziCalculator.calculateBazi({
    year: 1982,
    month: 10,
    day: 20,
    timeIndex: 0,
    gender: 'male',
    isLunar: false,
  });
  assert.deepEqual(
    Object.values(chartWithoutWood.pillars).map((pillar) => pillar.ganZhi),
    ['壬戌', '庚戌', '丙子', '戊子'],
  );
  assert.ok(!chartWithoutWood.analysis.usefulGod.matchedRules?.some((item) => item.id === ruleId));
});
