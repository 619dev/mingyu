import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyClimateCandidates,
  collectClimateRuleCandidates,
  resolveClimateFavorableOrder,
  selectTherapeuticHintRule,
} from '@core/bazi/baziTherapeuticStrategy';
import { CLIMATE_RULES } from '@core/bazi/baziTherapeuticRules';
import { determineUsefulGod } from '@core/bazi/baziUsefulGodStrategy';

function context(visibleStems: string[]) {
  return {
    monthBranch: '寅',
    dayMaster: '金',
    dayStem: '庚',
    visibleStems,
    hiddenStems: [],
    visibleStemSources: visibleStems.map((stem, index) => ({
      pillar: (['year', 'month', 'day', 'hour'] as const)[index],
      stem,
    })),
    hiddenStemSources: [],
    formationWuxings: [],
    wuxingCounts: { 木: 0, 火: 0, 土: 0, 金: 1, 水: 0 },
  };
}

test('调候月令取用对应本月原文，不把虚构等级写入规则', () => {
  const cases = [
    {
      monthBranch: '卯',
      dayMaster: '木',
      dayStem: '甲',
      id: 'mao-month-jia-geng-wu-first',
      order: ['金', '土'],
    },
    {
      monthBranch: '戌',
      dayMaster: '木',
      dayStem: '甲',
      id: 'xu-month-jia-ding-gui-first',
      order: ['火', '水'],
    },
    {
      monthBranch: '戌',
      dayMaster: '木',
      dayStem: '乙',
      id: 'xu-month-yi-gui-xin-first',
      order: ['水', '金'],
    },
    {
      monthBranch: '巳',
      dayMaster: '水',
      dayStem: '壬',
      id: 'si-month-ren-water-self-support',
      order: ['水', '金'],
    },
  ];

  for (const item of cases) {
    const candidate = collectClimateRuleCandidates({
      ...context(['庚', '戊', '丁', '壬']),
      monthBranch: item.monthBranch,
      dayMaster: item.dayMaster,
      dayStem: item.dayStem,
    }).find((entry) => entry.rule.id === item.id);
    assert.equal(candidate?.status, '满足', item.id);
    assert.deepEqual(candidate?.requestedOrder, item.order, item.id);
  }

  const falseRuleIds = [
    'mao-month-jia-bing-gui-first',
    'mao-month-jia-bing-gui-wu-all',
    'xu-month-jia-bing-gui-first',
    'xu-month-jia-bing-gui-geng-all',
    'xu-month-yi-bing-gui-first',
    'xu-month-yi-bing-gui-geng-all',
    'si-month-ren-bing-jia-first',
    'si-month-ren-bing-jia-xin-all',
  ];
  for (const id of falseRuleIds) {
    assert.equal(
      CLIMATE_RULES.some((rule) => rule.id === id),
      false,
      id,
    );
  }
  for (const rule of CLIMATE_RULES) {
    assert.doesNotMatch(
      [rule.label, rule.description, rule.hint, ...(rule.traceHints ?? [])].join('；'),
      /鼎甲可期/u,
      rule.id,
    );
  }
});

test('无本月依据的全透组合不能占据调候参考与病药提示首位', () => {
  const candidates = collectClimateRuleCandidates({
    ...context(['丙', '癸', '辛', '乙']),
    monthBranch: '子',
    dayMaster: '木',
    dayStem: '乙',
  });
  assert.equal(
    candidates.some((item) => item.rule.id === 'zi-month-yi-bing-gui-xin-all'),
    false,
  );
  assert.equal(selectTherapeuticHintRule(candidates, '身弱')?.id, 'zi-month-yi-bing-only');

  const result = applyClimateCandidates(
    {
      favorableWuxing: ['木'],
      unfavorableWuxing: ['金'],
      trace: [],
      primaryReason: '扶抑',
    },
    candidates,
  );
  assert.deepEqual(result.referenceOrder, ['火']);
  assert.equal(result.adjusted, false);
  assert.deepEqual(result.state.favorableWuxing, ['木']);
});

test('乙子专丙与甲丑先庚后丁不把相反天干列入推荐', () => {
  const cases = [
    {
      monthBranch: '子',
      dayStem: '乙',
      stems: ['乙', '丙', '癸'],
      id: 'zi-month-yi-bing-only',
      order: ['火'],
      recommendationStems: ['丙'],
      removedId: 'zi-month-yi-bing-gui-first',
    },
    {
      monthBranch: '丑',
      dayStem: '甲',
      stems: ['甲', '庚', '丁'],
      id: 'chou-month-jia-geng-ding-first',
      order: ['金', '火'],
      recommendationStems: ['庚', '丁'],
      removedId: 'chou-month-jia-bing-gui-first',
    },
  ];
  for (const item of cases) {
    const candidates = collectClimateRuleCandidates({
      ...context(item.stems),
      monthBranch: item.monthBranch,
      dayMaster: '木',
      dayStem: item.dayStem,
    });
    const matched = candidates.find((candidate) => candidate.rule.id === item.id);
    assert.equal(matched?.status, '满足', item.id);
    assert.deepEqual(matched?.requestedOrder, item.order, item.id);
    assert.deepEqual(matched?.rule.recommendationStems, item.recommendationStems, item.id);
    assert.equal(
      candidates.some((candidate) => candidate.rule.id === item.removedId),
      false,
    );
  }
});

test('本月原文明确列出的丙子壬戊与戊午壬甲两透条件仍可匹配', () => {
  const cases = [
    {
      monthBranch: '子',
      dayMaster: '火',
      dayStem: '丙',
      stems: ['壬', '戊', '丙'],
      id: 'zi-month-bing-ren-wu-both-visible',
      order: ['水', '土'],
    },
    {
      monthBranch: '午',
      dayMaster: '土',
      dayStem: '戊',
      stems: ['壬', '甲', '戊'],
      id: 'wu-month-wu-ren-jia-both-visible',
      order: ['水', '木'],
    },
  ];
  for (const item of cases) {
    const candidates = collectClimateRuleCandidates({
      ...context(item.stems),
      monthBranch: item.monthBranch,
      dayMaster: item.dayMaster,
      dayStem: item.dayStem,
    });
    const matched = candidates.find((candidate) => candidate.rule.id === item.id);
    assert.equal(matched?.status, '满足', item.id);
    assert.deepEqual(matched?.requestedOrder, item.order, item.id);
    assert.equal(selectTherapeuticHintRule(candidates, '身强')?.id, item.id);
  }
});

test('庚日寅月丙甲两透优先丙火，未见丙仍按先甲次丁', () => {
  const withBingJia = collectClimateRuleCandidates(context(['丙', '甲', '庚', '辛']));
  const withoutBing = collectClimateRuleCandidates(context(['甲', '庚', '辛', '壬']));
  const withoutJia = collectClimateRuleCandidates(context(['丙', '庚', '辛', '壬']));
  const withDingJia = collectClimateRuleCandidates(context(['丁', '甲', '庚', '辛']));

  const specialized = withBingJia.find(
    (candidate) => candidate.rule.id === 'yin-month-geng-bing-jia',
  );
  assert.equal(specialized?.status, '满足');
  assert.equal(specialized?.rule.priority, 120);
  assert.deepEqual(
    resolveClimateFavorableOrder(
      '金',
      undefined,
      '庚',
      '寅',
      undefined,
      false,
      undefined,
      ['丙', '甲', '庚', '辛'],
      [],
      [],
      [],
      [],
      { 木: 0, 火: 0, 土: 0, 金: 1, 水: 0 },
    ),
    ['火', '木'],
  );
  assert.deepEqual(
    resolveClimateFavorableOrder(
      '金',
      undefined,
      '庚',
      '寅',
      undefined,
      false,
      undefined,
      ['甲', '庚', '辛', '壬'],
      [],
      [],
      [],
      [],
      { 木: 0, 火: 0, 土: 0, 金: 1, 水: 0 },
    ),
    ['木', '火'],
  );
  assert.equal(
    withoutBing.some(
      (candidate) => candidate.rule.id === 'yin-month-geng-bing-jia' && candidate.status === '满足',
    ),
    false,
  );
  assert.equal(
    withoutJia.some(
      (candidate) => candidate.rule.id === 'yin-month-geng-bing-jia' && candidate.status === '满足',
    ),
    false,
  );
  assert.equal(
    withDingJia.find((candidate) => candidate.rule.id === 'yin-month-geng-jia-bing-xin')?.status,
    '满足',
  );

  const usefulGod = determineUsefulGod(
    '身弱',
    { pattern: '普通格', isSpecial: false },
    '金',
    '寅',
    undefined,
    '庚',
    {
      visibleStems: ['甲', '庚', '辛', '壬'],
      hiddenStems: [],
      formationWuxings: [],
      wuxingCounts: { 木: 1, 火: 0, 土: 0, 金: 3, 水: 1 },
    },
  );
  assert.deepEqual(usefulGod.favorableWuxing, ['土', '金']);
  assert.equal(usefulGod.primaryReason, '扶抑');
});

test('木火两旺及身强才旺有根规则不在身弱时命中', () => {
  const weakWoodFire = {
    ...context(['庚', '甲', '乙', '丙']),
    strengthStatus: '身弱',
    wuxingCounts: { 木: 3, 火: 2, 土: 0, 金: 1, 水: 0 },
  };
  const strongWoodFire = { ...weakWoodFire, strengthStatus: '身强' };
  assert.equal(
    collectClimateRuleCandidates(weakWoodFire).find(
      (candidate) => candidate.rule.id === 'yin-month-geng-wood-fire-both',
    )?.status,
    '不满足',
  );
  assert.equal(
    collectClimateRuleCandidates(strongWoodFire).find(
      (candidate) => candidate.rule.id === 'yin-month-geng-wood-fire-both',
    )?.status,
    '满足',
  );

  const strengthGatedRules = [
    {
      id: 'yin-month-ding-jia-geng-all',
      monthBranch: '寅',
      dayMaster: '火',
      dayStem: '丁',
      stems: ['甲', '庚', '丁'],
    },
    {
      id: 'yin-month-geng-wu-xin-ji',
      monthBranch: '寅',
      dayMaster: '金',
      dayStem: '庚',
      stems: ['戊', '壬', '丁', '庚'],
    },
    {
      id: 'shen-month-geng-jia-ding-all',
      monthBranch: '申',
      dayMaster: '金',
      dayStem: '庚',
      stems: ['甲', '丁', '庚'],
    },
    {
      id: 'yin-month-ren-bing-geng-jia',
      monthBranch: '寅',
      dayMaster: '水',
      dayStem: '壬',
      stems: ['丙', '庚', '甲', '壬'],
    },
    {
      id: 'mao-month-ren-bing-jia-all',
      monthBranch: '卯',
      dayMaster: '水',
      dayStem: '壬',
      stems: ['丙', '甲', '壬'],
    },
  ] as const;

  for (const ruleCase of strengthGatedRules) {
    const base = {
      ...context(ruleCase.stems),
      monthBranch: ruleCase.monthBranch,
      dayMaster: ruleCase.dayMaster,
      dayStem: ruleCase.dayStem,
    };
    const weak = collectClimateRuleCandidates({ ...base, strengthStatus: '身弱' });
    const strong = collectClimateRuleCandidates({ ...base, strengthStatus: '身强' });
    assert.equal(
      weak.find((candidate) => candidate.rule.id === ruleCase.id)?.status,
      '不满足',
      `${ruleCase.id} 不应在身弱命中`,
    );
    assert.equal(
      strong.find((candidate) => candidate.rule.id === ruleCase.id)?.status,
      '满足',
      `${ruleCase.id} 应在身强命中`,
    );
  }
});
