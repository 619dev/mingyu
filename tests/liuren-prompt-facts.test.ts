import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analyzeLiurenEvidence,
  generateLiuren,
} from '../packages/core/src/divination/algorithms/liuren';
import {
  buildDivinationPrompt,
  formatDivinationInfo,
  getDivinationSummaryBlocks,
} from '../packages/core/src/prompt/divination';
import { formatDetailedDivinationInfo } from '../packages/core/src/prompt/divination-detail';
import { formatEnhancedDivinationInfo } from '../packages/core/src/prompt/divination-enhanced';
import { buildDivinationPrompt as buildAppDivinationPrompt } from '../src/lib/divination/engine';
import { formatLiurenOrdinaryTransmissionAdjudication } from '../packages/core/src/prompt/liuren-facts';
import { formatLiurenJudgmentFacts } from '../packages/core/src/prompt/liuren-judgment';
import { resolveLiurenClassicalRules } from '../packages/core/src/divination/algorithms/liuren/helpers/classical-rules';

test('大六壬四课和三传分别绑定实际上下位与前传，十二宫绑定天地盘及天将', () => {
  const data = generateLiuren(new Date('2026-05-19T10:30:00+08:00'));
  assert.deepEqual(
    data.fourLessons.map((item) => [item.upper, item.lower]),
    [
      ['巳', '癸'],
      ['酉', '巳'],
      ['酉', '巳'],
      ['丑', '酉'],
    ],
  );
  assert.deepEqual(
    data.threeTransmissions.map((item) => item.branch),
    ['酉', '丑', '巳'],
  );
  for (const format of [
    formatDivinationInfo,
    formatDetailedDivinationInfo,
    formatEnhancedDivinationInfo,
  ]) {
    const text = format('liuren', data);
    assert.match(text, /下位癸水克上神巳火/);
    assert.match(text, /下位巳火克上神酉金/);
    assert.match(text, /上神丑土生下位酉金/);
    assert.match(text, /初传酉金生一课下位癸水/);
    assert.match(text, /中传丑土生初传酉金/);
    assert.match(text, /末传巳火生中传丑土/);
    assert.match(text, /初传取法：/);
    assert.doesNotMatch(text, /directKe|remoteKe|suppressedByPrior|deferredToSpecial/);
    assert.doesNotMatch(text, /上神酉金克下位巳火|初传酉金生中传丑土/);
  }
  const enhanced = formatEnhancedDivinationInfo('liuren', data);
  assert.match(enhanced, /地盘卯上临天盘未乘朱雀/);
  assert.match(enhanced, /地盘未上临天盘亥乘天空/);
});

test('大六壬概览只列一组四课与三传，贵人临地仍保留', () => {
  const data = generateLiuren(new Date('2026-05-19T10:30:00+08:00'));
  const lines = getDivinationSummaryBlocks('liuren', data).lines;
  assert.equal(lines.filter((line) => line.startsWith('四课：')).length, 1);
  assert.equal(lines.filter((line) => line.startsWith('三传：')).length, 1);
  assert.ok(
    lines.some((line) => line.includes(`贵人${data.noblemanBranch}临${data.noblemanGroundBranch}`)),
  );
  assert.ok(!lines.some((line) => line.startsWith('四课关系：') || line.startsWith('三传主线：')));
  const prompt = buildDivinationPrompt({ method: 'liuren', data, question: '问合作进度' });
  assert.doesNotMatch(prompt, /四课关系：|三传主线：/);
  assert.match(prompt, new RegExp(`贵人${data.noblemanBranch}临${data.noblemanGroundBranch}`));
});

test('大六壬遥克提示词应说明直接克未命中且不得夹带贼克身份', () => {
  const data = generateLiuren(new Date('2026-01-01T06:00:00+08:00'));
  assert.equal(data.transmissionRule, '遥克法');
  assert.deepEqual(
    data.classicalRules?.map((item) => item.rule),
    ['遥克'],
  );

  for (const format of [formatDivinationInfo, formatEnhancedDivinationInfo]) {
    const text = format('liuren', data);
    assert.match(text, /四课没有直接上下克，进入遥克/);
    assert.match(text, /最终按遥克法取.+发用/);
    assert.doesNotMatch(text, /贼克法：|四课先察上下相克/);
  }
});

test('大六壬复合取传规则只列当前有克或无克条件，重复课对按不同上神计数', () => {
  const fuyinNoKe = resolveLiurenClassicalRules('伏吟法');
  const fuyinKe = resolveLiurenClassicalRules('伏吟重审法');
  const fanyinNoKe = resolveLiurenClassicalRules('返吟法');
  const fanyinKe = resolveLiurenClassicalRules('返吟元首法');
  assert.match(fuyinNoKe[0].summary, /四课无克/);
  assert.doesNotMatch(fuyinNoKe[0].summary, /四课有克/);
  assert.match(fuyinKe[0].summary, /四课有克/);
  assert.doesNotMatch(fuyinKe[0].summary, /四课无克/);
  assert.match(fanyinNoKe[0].summary, /四课无克/);
  assert.doesNotMatch(fanyinNoKe[0].summary, /四课有克/);
  assert.match(fanyinKe[0].summary, /四课有克/);
  assert.doesNotMatch(fanyinKe[0].summary, /四课无克/);

  const data = generateLiuren(new Date('2026-04-10T08:26:00+08:00'));
  assert.equal(data.transmissionRule, '返吟重审法');
  assert.deepEqual(
    data.fourLessons.map((item) => item.upper),
    ['申', '寅', '申', '寅'],
  );
  const prompt = buildDivinationPrompt({ method: 'liuren', data, question: '问合作进度' });
  assert.match(prompt, /返吟课兼四课下贼上：天盘与地盘相冲；四课见下贼上/);
  assert.match(prompt, /四课下贼上候选只有一个不同上神/);
  assert.doesNotMatch(prompt, /四课只有一处下贼上|无克另按井栏射取传/);
});

test('大六壬完整提示词写入课体判据、取用定位和应期依据', () => {
  const data = generateLiuren(new Date('2026-05-19T10:30:00+08:00'));
  const prompt = formatDivinationInfo('liuren', data);
  assert.ok(data.guaTiFacts?.length);
  for (const fact of data.guaTiFacts) {
    assert.ok(prompt.includes(`${fact.name}：${fact.matchedConditions.join('；')}`));
    assert.ok(prompt.includes(fact.sourceTitle));
  }
  for (const focus of data.focusEvidence ?? []) {
    assert.ok(prompt.includes(`${focus.role}${focus.target}`));
  }
  for (const timing of data.timingEvidence ?? []) {
    if (timing.startsWith('未给出目标期限时')) {
      assert.match(prompt, /以问题期限、三传先后和现实触发条件核对应期/);
    } else {
      assert.ok(prompt.includes(timing));
    }
  }
  assert.doesNotMatch(prompt, /sourceUrl|stableKey|notApplicable/);
});

test('大六壬旧结果旬空变化后提示词应同步三传与应期状态', () => {
  const data = generateLiuren(new Date('2026-05-19T10:30:00+08:00'));
  const initial = data.threeTransmissions[0];
  const wasVoid = data.xunKong?.includes(initial.branch) ?? false;
  data.xunKong = wasVoid
    ? data.xunKong?.filter((branch) => branch !== initial.branch)
    : [...(data.xunKong ?? []), initial.branch];

  const evidence = analyzeLiurenEvidence(data);
  const expectedVoid = !wasVoid;
  for (const format of [
    formatDivinationInfo,
    formatDetailedDivinationInfo,
    formatEnhancedDivinationInfo,
  ]) {
    const prompt = format('liuren', data);
    assert.equal(
      prompt.includes(`初传${initial.branch}乘${initial.god}，${initial.relation}（空）`),
      expectedVoid,
    );
  }
  const prompt = formatEnhancedDivinationInfo('liuren', data);
  assert.ok(prompt.includes(evidence.timingFacts[0].promptText));
  assert.ok(prompt.includes(evidence.timingFacts[1].promptText));
  assert.equal(prompt.includes(`初传${initial.branch}${wasVoid ? '空亡' : '不空'}`), false);
  const fullPrompt = buildDivinationPrompt({ method: 'liuren', data, question: '问合作进度' });
  assert.ok(fullPrompt.includes(evidence.timingFacts[0].promptText));
  assert.ok(fullPrompt.includes(evidence.timingFacts[1].promptText));
  assert.equal(fullPrompt.includes(`初传${initial.branch}${wasVoid ? '空亡' : '不空'}`), false);
});

test('大六壬完整提示词只补充尚未在盘面显示的判断事实', () => {
  const data = generateLiuren(new Date('2026-05-19T10:30:00+08:00'));
  const adjudication = formatLiurenOrdinaryTransmissionAdjudication(data);
  assert.ok(adjudication.includes('候选取舍：'));
  assert.ok(formatLiurenJudgmentFacts(data).includes(adjudication));
  for (const prompt of [
    buildDivinationPrompt({ method: 'liuren', data, question: '问合作进度' }),
    buildAppDivinationPrompt('liuren', '问合作进度', data),
  ]) {
    assert.match(prompt, /课传主线：传态递传/);
    assert.doesNotMatch(prompt, /课传主线：取传涉害法/);
    assert.match(prompt, /初传取法：/);
    assert.match(prompt, /取传条件：/);
    assert.match(prompt, /课体判据：/);
    assert.match(prompt, /取用定位：/);
    assert.match(prompt, /应期依据：/);
    assert.match(prompt, /课传反证：/);
    assert.match(prompt, /初传酉与日支关系火克金/);
    assert.doesNotMatch(prompt, /课传反证：[^\n]*一课巳临癸，上下神关系水克火/);
    assert.doesNotMatch(prompt, /课传反证：[^\n]*初传酉月令状态死/);
    assert.doesNotMatch(prompt, /取传说明：|课体条件：|重点依据：|时令依据：/);
    assert.equal(prompt.split(adjudication).length - 1, 1);
    for (const fact of data.guaTiFacts ?? []) {
      assert.equal(prompt.split(fact.matchedConditions.join('；')).length - 1, 1);
    }
    for (const focus of data.focusEvidence ?? []) {
      assert.ok(prompt.includes(`${focus.role}${focus.target}（${focus.level}）`));
      for (const limitation of focus.limitations) assert.ok(prompt.includes(limitation));
    }
  }
});

test('大六壬在线提示词用取传依据和期限条件表达候选取舍', () => {
  const data = generateLiuren(new Date('2026-05-19T10:30:00+08:00'));
  const legacyTiming = '未给出目标期限时，只判断先后、快慢和触发条件，不硬换成唯一日期';
  data.timingEvidence = [...(data.timingEvidence ?? []).slice(0, 3), legacyTiming];

  const analysis = analyzeLiurenEvidence(data);
  assert.equal(analysis.timingFacts[3].rawText, legacyTiming);
  assert.equal(analysis.timingFacts[3].promptText, '以问题期限、三传先后和现实触发条件核对应期');
  assert.ok(analysis.ordinaryTransmissionAdjudicationFact.candidateFacts.length > 0);
  assert.ok(analysis.counterEvidenceFacts.length > 0);

  for (const prompt of [
    buildDivinationPrompt({ method: 'liuren', data, question: '问合作进度' }),
    buildAppDivinationPrompt('liuren', '问合作进度', data),
    formatLiurenJudgmentFacts(data).join('\n'),
  ]) {
    assert.match(prompt, /四课直接上下克前置成立，取传采用直接克候选/);
    assert.match(prompt, /以问题期限、三传先后和现实触发条件核对应期/);
    assert.match(prompt, /课传反证：/);
    assert.doesNotMatch(prompt, /遥克不得抢占|未给出目标期限时|不硬换成唯一日期/);
  }
});

test('初传不空及空亡古诀只列发端条件，不直接断定现实进展', () => {
  const nonVoid = generateLiuren(new Date('2026-05-19T10:30:00+08:00'));
  assert.equal(nonVoid.threeTransmissions[0].isVoid, false);
  assert.equal(nonVoid.threeTransmissions[0].seasonState, '死');
  const nonVoidPrompt = buildDivinationPrompt({
    method: 'liuren',
    data: nonVoid,
    question: '问合作进度',
  });
  assert.match(nonVoidPrompt, /初传酉不空，按月令旺衰、日支关系和事项类神核对发端条件/);
  assert.doesNotMatch(nonVoidPrompt, /可直接作为起始信号|为当前起始信号/);

  const recomputed = analyzeLiurenEvidence({ ...nonVoid, timingEvidence: [] });
  assert.match(recomputed.timingFacts[0].promptText, /按月令旺衰、日支关系和事项类神核对发端条件/);
  assert.deepEqual(
    recomputed.timingConditions,
    recomputed.timingFacts.map((item) => item.promptText),
  );
  assert.doesNotMatch(recomputed.promptText, /原结果提供|由盘面补齐|应期边界|不得|不换算/);

  const legacy = structuredClone(nonVoid);
  legacy.timingEvidence![0] = '一级发用：先看初传酉不空，可直接作为起始信号';
  const legacyPrompt = buildDivinationPrompt({
    method: 'liuren',
    data: legacy,
    question: '问合作进度',
  });
  assert.match(legacyPrompt, /初传酉不空，按月令旺衰、日支关系和事项类神核对发端条件/);
  assert.doesNotMatch(legacyPrompt, /可直接作为起始信号/);

  const voidData = generateLiuren(new Date('2026-05-02T10:30:00+08:00'));
  assert.equal(voidData.threeTransmissions[0].isVoid, true);
  const voidPrompt = buildDivinationPrompt({
    method: 'liuren',
    data: voidData,
    question: '问合作进度',
  });
  assert.match(voidPrompt, /毕法断诀：【旬在空亡发用虚】；初传空亡/);
  assert.doesNotMatch(voidPrompt, /发端有声无实|谋事防中途落空/);
});

test('大六壬未在四课行标明的空亡反证仍保留', () => {
  const data = generateLiuren(new Date('2026-05-19T10:30:00+08:00'));
  data.xunKong = [...new Set([...(data.xunKong ?? []), data.fourLessons[0].upper])];
  const prompt = buildDivinationPrompt({ method: 'liuren', data, question: '问合作进度' });
  assert.match(prompt, /课传反证：[^\n]*一课上神巳落日柱旬空/);
});
