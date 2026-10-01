import assert from 'node:assert/strict';
import test from 'node:test';

import { generateDivinationSession } from '../packages/core/src/divination/session';
import {
  formatLiurenLesson,
  formatLiurenOrdinaryTransmissionAdjudication,
  formatLiurenTransmission,
} from '../packages/core/src/prompt/liuren-facts';
import { formatTaiyiConditionSummary } from '../packages/core/src/taiyi';
import type { LiurenData, TaiyiResult } from '../packages/core/src/types/divination';
import type { WuyunLiuqiResult } from '../packages/core/src/wuyun-liuqi';

test('小六壬在线解读保留农历取数、口径与占得宫歌诀', () => {
  for (const rule of ['common', 'duoneng'] as const) {
    const session = generateDivinationSession({
      method: 'xiaoliuren',
      question: '核对时间起课',
      xiaoliuren: { rule },
      divinationTime: '2024-02-05T00:30:00+08:00',
      currentTime: '2024-02-05T00:30:00+08:00',
    });
    assert.match(session.aiPrompt, /农历12月26日/);
    assert.match(session.aiPrompt, /定月宫：12月从大安顺数/);
    assert.match(session.aiPrompt, /定日宫：从月宫/);
    assert.match(session.aiPrompt, /定时宫：从日宫/);
    assert.match(session.aiPrompt, /歌诀原文：/);
    assert.match(session.aiPrompt, /东八区民用日零点换日/);
    assert.match(session.aiPrompt, /闰月沿用同名月序/);
    assert.doesNotMatch(session.aiPrompt, /evidenceAnalysis|monthSeed|schemaVersion|资料来源/);
  }
});

test('六壬 aiPrompt 应保留取传与课体判断依据', () => {
  const session = generateDivinationSession({
    method: 'liuren',
    question: '验证六壬判断依据传播',
    divinationTime: '2024-01-02T12:00:00+08:00',
    currentTime: '2024-01-02T12:00:00+08:00',
  });
  const data = session.data as LiurenData;
  const adjudication = formatLiurenOrdinaryTransmissionAdjudication(data);
  assert.ok(adjudication);
  assert.equal(session.aiPrompt.split(adjudication).length - 1, 1);
  const classicalRules = data.classicalRules ?? [];
  const guaTiFacts = data.guaTiFacts ?? [];

  assert.ok(data.transmissionRule);
  assert.ok(data.transmissionDetail);
  assert.ok(classicalRules.length > 0);
  assert.ok(guaTiFacts.length > 0);
  assert.match(session.aiPrompt, /六壬判断依据：/);
  assert.match(session.aiPrompt, /初传取法：/);
  assert.ok(session.aiPrompt.includes(data.transmissionRule));
  for (const rule of classicalRules) {
    assert.ok(session.aiPrompt.includes(rule.summary));
  }
  for (const fact of guaTiFacts) {
    assert.ok(fact.matchedConditions.length > 0);
    for (const condition of fact.matchedConditions) {
      assert.ok(session.aiPrompt.includes(condition));
    }
  }
  assert.match(session.aiPrompt, /取用定位：/);
  for (const item of data.focusEvidence ?? []) {
    assert.ok(session.aiPrompt.includes(`${item.role}${item.target}（${item.level}）`));
    for (const evidence of item.evidence.filter(Boolean)) {
      assert.ok(session.aiPrompt.includes(evidence));
    }
    for (const limitation of item.limitations) {
      assert.ok(session.aiPrompt.includes(limitation));
    }
  }
  assert.ok(data.evidenceAnalysis!.counterEvidenceFacts.length > 0);
  assert.match(session.aiPrompt, /课传反证：/);
  for (const fact of data.evidenceAnalysis!.counterEvidenceFacts) {
    if (session.aiPrompt.includes(fact.promptText)) continue;
    if (fact.scope === '四课') {
      const lesson = data.evidenceAnalysis!.lessons.find((item) => item.key === fact.ownerKey);
      assert.ok(lesson);
      const lessonLine = formatLiurenLesson(lesson);
      assert.ok(lessonLine.includes(fact.detail), fact.promptText);
      assert.ok(session.aiPrompt.includes(lessonLine), fact.promptText);
      continue;
    }
    const index = data.evidenceAnalysis!.transmissions.findIndex(
      (item) => item.key === fact.ownerKey,
    );
    assert.notEqual(index, -1, fact.promptText);
    const transmission = data.threeTransmissions[index];
    assert.ok(transmission);
    if (fact.basis === '相邻传关系' || fact.basis === '旬空') {
      const transmissionLine = formatLiurenTransmission(data, index);
      assert.ok(session.aiPrompt.includes(transmissionLine), fact.promptText);
      assert.ok(
        fact.basis === '旬空'
          ? transmissionLine.includes('（空）')
          : transmissionLine.includes(fact.detail),
        fact.promptText,
      );
    } else if (fact.basis === '月令旺衰') {
      assert.ok(
        session.aiPrompt.includes(
          `${transmission.stage}${transmission.branch}（月令${fact.detail}`,
        ),
        fact.promptText,
      );
    } else {
      assert.fail(`三传反证缺少对应盘面事实：${fact.promptText}`);
    }
  }
  assert.ok(session.aiPrompt.includes(data.evidenceAnalysis!.counterSummaryFact.status));
  assert.match(session.aiPrompt, /应期依据：/);
  const initial = data.threeTransmissions[0];
  assert.ok(initial?.seasonState);
  assert.ok(
    session.aiPrompt.includes(`${initial.stage}${initial.branch}（月令${initial.seasonState}`),
  );
  for (const timingFact of data.evidenceAnalysis!.timingFacts) {
    if (!timingFact.promptText.startsWith('未给出目标期限时')) {
      assert.ok(session.aiPrompt.includes(timingFact.promptText));
    }
  }
  for (const lesson of data.fourLessons) {
    assert.ok(
      session.aiPrompt.includes(`${lesson.name}${lesson.upper}临${lesson.lower}乘${lesson.god}`),
    );
  }
  for (const transmission of data.threeTransmissions) {
    assert.ok(
      session.aiPrompt.includes(`${transmission.stage}${transmission.branch}乘${transmission.god}`),
    );
  }
  assert.doesNotMatch(session.aiPrompt, /古籍依据依次为：|sourceUrl|evidenceAnalysis/);
});

test('太乙 aiPrompt 应保留三门、五将与阴阳和判断条件', () => {
  const session = generateDivinationSession({
    method: 'taiyi',
    question: '验证太乙判断条件传播',
    taiyi: { scope: 'year', year: 2024 },
    currentTime: '2024-01-01T12:00:00+08:00',
  });
  const data = session.data as TaiyiResult;

  assert.match(session.aiPrompt, /太乙判断依据：/);
  assert.ok(session.aiPrompt.includes(`三门：${data.conditions.threeGates.status}`));
  assert.ok(
    session.aiPrompt.includes(`五将：${data.conditions.fiveGenerals.launched ? '发' : '不发'}`),
  );
  assert.ok(
    session.aiPrompt.includes(`阴阳和：${data.conditions.yinYangHarmony.matched ? '和' : '不和'}`),
  );
  assert.equal(session.aiPrompt.split('三门：').length - 1, 1);
  assert.equal(session.aiPrompt.split('五将：').length - 1, 1);
  assert.equal(session.aiPrompt.split('阴阳和：').length - 1, 1);
  assert.equal(
    session.aiPrompt.split(`直使${data.conditions.threeGates.directGate}`).length - 1,
    1,
  );
  assert.ok(session.aiPrompt.includes(`攻守参考：主算${data.lordCount}`));
  assert.ok(session.aiPrompt.includes('主客吉凶条件相等时，再以算之长短比较'));
  assert.doesNotMatch(session.aiPrompt, /盘面条件：/);
  assert.ok(session.aiPrompt.includes(`主大将${data.lordGeneral}宫`));
  assert.doesNotMatch(session.aiPrompt, /二目五行|日计纳音另论|主关客|客关主|未判定/);
  assert.ok(session.aiPrompt.includes(`文昌${data.wenChangPosition}`));
  assert.ok(session.aiPrompt.includes(`始击${data.shiJiPosition}`));
  assert.doesNotMatch(session.aiPrompt, /sourceUrl|evidenceAnalysis|https?:\/\//);
});

test('太乙 aiPrompt 保留主客定算性且只呈现一次', () => {
  const session = generateDivinationSession({
    method: 'taiyi',
    question: '核对主客定算性',
    taiyi: { scope: 'year', year: 1951 },
    currentTime: '1951-01-01T12:00:00+08:00',
  });
  const data = session.data as TaiyiResult;
  for (const [label, count, nature] of [
    ['主', data.lordCount, data.countNatures?.lord],
    ['客', data.guestCount, data.countNatures?.guest],
    ['定', data.setCount, data.countNatures?.set],
  ] as const) {
    assert.ok(nature);
    assert.equal(session.aiPrompt.split(`${label}算${count}（${nature}）`).length - 1, 1);
  }
  for (const judgment of data.judgments) {
    if (
      judgment !== formatTaiyiConditionSummary(data.conditions) &&
      !/^(主算|客算|定算)\s*\d+\s*为/u.test(judgment)
    ) {
      assert.ok(session.aiPrompt.includes(judgment), judgment);
    }
  }
});

test('五运六气 aiPrompt 保留岁运五音与年度阶段，不输出未具备的平气条件', () => {
  const session = generateDivinationSession({
    method: 'wuyun',
    question: '核对年度条件',
    wuyun: { year: 2026 },
    currentTime: '2026-01-01T12:00:00+08:00',
  });
  for (const label of ['五步主客运：', '六步主客气：', '岁运纪：']) {
    assert.equal(session.aiPrompt.split(label).length - 1, 1, label);
  }
  assert.doesNotMatch(session.aiPrompt, /平气参考条件：|年度符会：/);
  const chart = session.data as WuyunLiuqiResult;
  const movementFact = `岁运：${chart.annualMovement.name}（${chart.annualMovement.toneName}），${chart.annualMovement.strength}（${chart.annualMovement.yinYang}干）`;
  assert.equal(session.aiPrompt.split(movementFact).length - 1, 1);
});

test('五运六气省略目标年份时按起课时间所在的大寒运气年度排盘', () => {
  const beforeDahan = generateDivinationSession({
    method: 'wuyun',
    question: '核对当前运气年度',
    currentTime: '2026-01-01T12:00:00+08:00',
  });
  const beforeChart = beforeDahan.data as WuyunLiuqiResult;
  assert.equal(beforeChart.input.year, 2025);
  assert.equal(beforeChart.input.yearGanZhi, '乙巳');
  assert.equal(
    beforeDahan.aiPrompt.split('年干支：乙巳（公历 2025 年对应的运气年度）').length - 1,
    1,
  );
  assert.ok(
    beforeDahan.aiPrompt.includes(
      `运气年度：${beforeChart.qiSteps[0].boundaryTime?.startBeijing}大寒节令起，至${beforeChart.qiSteps[5].boundaryTime?.endBeijingExclusive}次年大寒节令前`,
    ),
  );

  const afterDahan = generateDivinationSession({
    method: 'wuyun',
    question: '核对当前运气年度',
    currentTime: '2026-02-01T12:00:00+08:00',
  });
  assert.equal((afterDahan.data as WuyunLiuqiResult).input.year, 2026);

  const customTime = generateDivinationSession({
    method: 'wuyun',
    question: '核对指定起课时间',
    divinationTime: '2026-01-01T12:00:00+08:00',
    currentTime: '2026-02-01T12:00:00+08:00',
  });
  assert.equal((customTime.data as WuyunLiuqiResult).input.year, 2025);
});
