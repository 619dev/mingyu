import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeLenormandEvidence,
  conditionLenormandTraditionalText,
  drawLenormandSpread,
  LENORMAND_CARDS,
  LENORMAND_FIXED_COMBINATIONS,
  resolveInteractiveLenormandCards,
} from '../packages/core/src/divination/algorithms/lenormand.ts';
import type { LenormandData, LenormandSpreadType } from '../packages/core/src/types/divination.ts';
import { getDivinationSummaryBlocks } from '../packages/core/src/prompt/divination.ts';
import { formatDetailedDivinationInfo } from '../packages/core/src/prompt/divination-detail.ts';
import { formatEnhancedDivinationInfo } from '../packages/core/src/prompt/divination-enhanced.ts';
import { generateDivinationSession } from '../packages/core/src/divination/session.ts';
import { assertPromptIsPortableTaskText } from './prompt-assertions';

const spreadTypes: LenormandSpreadType[] = [
  'single',
  'three',
  'five',
  'relationship',
  'decision',
  'nine',
  'element',
  'grandTableau',
];

test('雷诺曼入口拒绝原型牌阵、非文本牌阵和缺项录入', () => {
  for (const spread of ['toString', '__proto__', 'constructor', ['single'], null]) {
    assert.throws(() => drawLenormandSpread(spread as never), /未知的雷诺曼牌阵类型/);
    assert.throws(
      () => resolveInteractiveLenormandCards(spread as never, []),
      /未知的雷诺曼牌阵类型/,
    );
  }
  for (const samples of [new Array(1), null, false, { length: 1 }]) {
    assert.throws(() => resolveInteractiveLenormandCards('single', samples as never));
    assert.throws(() => drawLenormandSpread('single', { interactiveSamples: samples as never }));
    assert.throws(() => drawLenormandSpread('single', { manualCardIds: samples as never }));
  }
});

test('雷诺曼未完成进度可续抽且36张均不重复，完整入口拒绝缺牌记录', () => {
  assert.deepEqual(resolveInteractiveLenormandCards('grandTableau', []), []);
  const partial = resolveInteractiveLenormandCards('grandTableau', [0, 0]);
  const complete = resolveInteractiveLenormandCards('grandTableau', Array(36).fill(0));
  assert.deepEqual(complete.slice(0, 2), partial);
  assert.deepEqual(
    complete.map((card) => card.id),
    Array.from({ length: 36 }, (_, i) => i + 1),
  );
  assert.throws(() => drawLenormandSpread('grandTableau', { interactiveSamples: [0, 0] }));
});

test('雷诺曼整组随机记录应与牌面顺序一致并完整消耗', () => {
  for (const data of [
    drawLenormandSpread('three', { seed: '雷诺曼重放' }),
    drawLenormandSpread('three', { interactiveSamples: [0, 0.25, 0.5] }),
  ]) {
    for (const samples of [
      data.meta!.random!.samples.slice(0, -1),
      [...data.meta!.random!.samples, 0],
    ]) {
      const changed = structuredClone(data);
      changed.meta!.random!.samples = samples;
      assert.throws(() => analyzeLenormandEvidence(changed));
    }
    const changed = structuredClone(data);
    [changed.cards[0], changed.cards[1]] = [changed.cards[1], changed.cards[0]];
    assert.throws(() => analyzeLenormandEvidence(changed), /随机轨迹与牌面或顺序不一致/);
    assert.equal(analyzeLenormandEvidence(data).randomFact.status, '可重放');
  }
});

test('雷诺曼大桌牌阵应抽取完整 36 张牌', () => {
  const result = drawLenormandSpread('grandTableau');

  assert.equal(result.cards.length, 36);
  assert.equal(new Set(result.cards.map((card) => card.id)).size, 36);
  assert.equal(result.cards[0].position, '第1宫（骑士宫）');
  assert.equal(result.cards[35].position, '第36宫（十字架宫）');
  assert.equal(result.cards[0].house, '骑士');
  assert.equal(result.draw?.deckSize, 36);
  assert.equal(result.draw?.order.length, 36);
  assert.deepEqual(
    result.draw?.order.map((item) => [item.position, item.cardId, item.cardName, item.house]),
    result.cards.map((card) => [card.position, card.id, card.name, card.house]),
  );
  assert.ok((result.combinations?.length ?? 0) > 0);
  assert.ok(
    result.combinations?.every(
      (item) =>
        item.source &&
        item.relation &&
        item.relation !== '牌序相邻' &&
        item.position1 &&
        item.position2,
    ),
  );
  assert.ok(result.layoutEvidence?.some((item) => item.includes('男士落第')));
  assert.ok(result.layoutEvidence?.some((item) => item.includes('女士落第')));
  assert.equal(
    result.evidenceAnalysis?.structuredLayoutFacts.filter((item) => item.kind === '大桌宫位')
      .length,
    36,
  );
  assert.equal(
    result.evidenceAnalysis?.structuredLayoutFacts.filter((item) => item.kind === '人物牌近身')
      .length,
    2,
  );
  assert.ok(
    result.evidenceAnalysis?.structuredLayoutFacts.every(
      (item) => item.source && item.limitation.includes('不自动证明吉凶'),
    ),
  );
  const promptLayoutItems = result.evidenceAnalysis?.evidence.items.filter((item) =>
    item.tags?.includes('布局证据'),
  );
  assert.ok(promptLayoutItems?.every((item) => !item.tags?.includes('大桌宫位')));
  assert.match(result.evidenceAnalysis?.promptText || '', /逐牌宫位落点见对应牌面条目/);
});

test('雷诺曼九宫应输出横纵与对角线结构证据', () => {
  const result = drawLenormandSpread('nine', { seed: 20260711 });
  assert.equal(result.cards.length, 9);
  assert.equal(result.draw?.deckSize, 36);
  assert.equal(result.draw?.method, 'Fisher-Yates洗牌后依牌位顺序取顶牌');
  assert.equal(result.draw?.order.length, 9);
  assert.deepEqual(
    result.draw?.order.map((item) => [
      item.index,
      item.position,
      item.cardName,
      item.row,
      item.column,
    ]),
    result.cards.map((card, index) => [index + 1, card.position, card.name, card.row, card.column]),
  );
  assert.equal(result.combinations?.length, 20);
  assert.ok(result.combinations?.some((item) => item.relation === '纵向相邻'));
  assert.ok(result.combinations?.some((item) => item.relation === '对角相邻'));
  assert.ok(result.layoutEvidence?.some((item) => item.includes('横向')));
  assert.ok(result.layoutEvidence?.some((item) => item.includes('对角线')));
  const layoutItems = result.evidenceAnalysis?.evidence.items.filter((item) =>
    item.tags?.includes('布局证据'),
  );
  assert.equal(layoutItems?.length, 9);
  assert.ok(layoutItems?.every((item) => item.level === '辅证'));
  assert.equal(result.evidenceAnalysis?.structuredLayoutFacts.length, 9);
  assert.equal(
    result.evidenceAnalysis?.structuredLayoutFacts.filter((item) => item.kind === '九宫路径')
      .length,
    8,
  );
  const structureItem = result.evidenceAnalysis?.evidence.items.find((item) =>
    item.title.startsWith('牌阵结构：'),
  );
  const sequenceItem = result.evidenceAnalysis?.evidence.items.find(
    (item) => item.title === '牌位顺序推进',
  );
  const randomItem = result.evidenceAnalysis?.evidence.items.find(
    (item) => item.title === '随机过程重放记录',
  );
  const drawItem = result.evidenceAnalysis?.evidence.items.find(
    (item) => item.title === '洗牌与抽取顺序事实',
  );
  assert.equal(structureItem?.level, '辅证');
  assert.equal(sequenceItem?.level, '辅证');
  assert.equal(randomItem?.level, '辅证');
  assert.equal(drawItem?.level, '辅证');
  assert.match(drawItem?.detail || '', /牌组规模：36张/);
  assert.match(drawItem?.detail || '', /Fisher-Yates/);
  assert.match(result.evidenceAnalysis?.drawFacts.join('；') || '', /第1张对应/);
  assert.equal(result.evidenceAnalysis?.drawFact.status, '可核验');
  assert.equal(result.evidenceAnalysis?.drawFact.deckSize, 36);
  assert.equal(result.evidenceAnalysis?.drawFact.order.length, result.cards.length);
  assert.equal(result.evidenceAnalysis?.drawFact.recordedCardCount, result.cards.length);
  assert.ok((result.evidenceAnalysis?.drawFact.sources.length ?? 0) >= 2);
  assert.match(result.evidenceAnalysis?.drawFact.limitation || '', /不表示牌义可信度/);
  assert.match(randomItem?.detail || '', /不表示可信度或预测有效性/);
  assert.ok(
    result.evidenceAnalysis?.randomFacts.some((item) => item.includes('随机种子：20260711')),
  );
  assert.equal(result.evidenceAnalysis?.randomFact.status, '可重放');
  assert.equal(result.evidenceAnalysis?.randomFact.seed, 20260711);
  assert.equal(
    result.evidenceAnalysis?.randomFact.sampleCount,
    result.meta?.random?.samples.length,
  );
  assert.doesNotMatch(result.evidenceAnalysis?.randomFact.promptText || '', /20260711/);
  assert.doesNotMatch(result.evidenceAnalysis?.promptText || '', /随机种子：20260711/);
  assert.doesNotMatch(result.evidenceAnalysis?.promptText || '', /成功率|吉凶总分|score/i);
});

test('雷诺曼手工录入应按牌位成盘，并将随机轨迹标为不适用', () => {
  const result = drawLenormandSpread('three', { manualCardIds: [1, 24, 36] });

  assert.deepEqual(
    result.cards.map((card) => [card.id, card.position]),
    [
      [1, '起因'],
      [24, '现状'],
      [36, '走向'],
    ],
  );
  assert.equal(result.draw?.method, '用户按牌位手工录入');
  assert.equal(result.meta?.algorithm, 'lenormand.spread.manual');
  assert.equal(result.meta?.random, undefined);
  assert.equal(result.evidenceAnalysis?.randomFact.status, '不适用');
  assert.equal(result.evidenceAnalysis?.summaryFact.status, '证据链完整');
  assert.ok(result.evidenceAnalysis?.evidence.items.some((item) => item.title === '手工录入来源'));

  assert.throws(() => drawLenormandSpread('three', { manualCardIds: [1, 1, 2] }), /不能重复录入/);
  assert.throws(
    () => drawLenormandSpread('single', { seed: '冲突参数', manualCardIds: [1] }),
    /不能同时提供随机选项/,
  );
});

test('雷诺曼证据分析按牌号重建被篡改的牌面资料并报告缺口', () => {
  const data = structuredClone(drawLenormandSpread('single', { manualCardIds: [1] }));
  Object.assign(data.cards[0], {
    name: '伪造牌名',
    keywords: ['伪造关键词'],
    meaning: '伪造牌义',
  });

  const evidence = analyzeLenormandEvidence(data);

  assert.equal(evidence.cards[0].name, '骑士');
  assert.deepEqual(evidence.cards[0].keywords, ['消息', '到来', '进展']);
  assert.equal(evidence.cards[0].meaning, '消息抵达，事情开始移动。');
  assert.equal(evidence.cards[0].status, '存在缺口');
  assert.deepEqual(evidence.cards[0].mismatches, ['牌名', '关键词', '基础牌义']);
  assert.equal(evidence.traditionalFacts[0].status, '存在缺口');
  assert.equal(evidence.summaryFact.status, '证据链有缺口');
  assert.doesNotMatch(evidence.promptText, /伪造牌名|伪造关键词|伪造牌义/);
});

test('雷诺曼抽牌组合被改写时拒绝把虚构组合当作牌面证据', () => {
  const original = drawLenormandSpread('three', { manualCardIds: [1, 24, 25] });
  assert.match(original.evidenceAnalysis!.promptText, /固定组合骑士\+心/);

  const changedMeaning = structuredClone(original);
  changedMeaning.combinations![0]!.meaning = '已经确定婚约';
  assert.throws(
    () => analyzeLenormandEvidence(changedMeaning),
    /雷诺曼组合记录与牌号、牌位或相邻关系不一致/,
  );

  const changedPair = structuredClone(original);
  changedPair.combinations![0]!.card2 = '孩子';
  assert.throws(
    () => analyzeLenormandEvidence(changedPair),
    /雷诺曼组合记录与牌号、牌位或相邻关系不一致/,
  );

  const changedCardAndCombination = structuredClone(original);
  changedCardAndCombination.cards[0]!.name = '伪造牌名';
  changedCardAndCombination.combinations![0]!.meaning = '已经确定婚约';
  assert.throws(
    () => analyzeLenormandEvidence(changedCardAndCombination),
    /雷诺曼组合记录与牌号、牌位或相邻关系不一致/,
  );

  const missingCombination = structuredClone(original);
  missingCombination.combinations = [];
  assert.throws(
    () => analyzeLenormandEvidence(missingCombination),
    /雷诺曼组合记录与牌号、牌位或相邻关系不一致/,
  );

  const noDraw = structuredClone(original);
  noDraw.draw = undefined;
  noDraw.meta = undefined;
  noDraw.combinations![0]!.meaning = '已经确定婚约';
  assert.throws(
    () => analyzeLenormandEvidence(noDraw),
    /雷诺曼组合记录与牌号、牌位或相邻关系不一致/,
  );

  const legacyWithoutCombinations = structuredClone(original);
  legacyWithoutCombinations.draw = undefined;
  legacyWithoutCombinations.meta = undefined;
  legacyWithoutCombinations.combinations = undefined;
  assert.equal(analyzeLenormandEvidence(legacyWithoutCombinations).fixedCombinations.length, 0);
});

test('雷诺曼在线提示词重新核对牌面和组合，不采信过期证据对象', () => {
  const original = drawLenormandSpread('three', { manualCardIds: [1, 24, 25] });
  const changed = structuredClone(original);
  changed.combinations![0]!.meaning = '已经确定婚约';
  for (const render of [
    () => getDivinationSummaryBlocks('lenormand', changed),
    () => formatEnhancedDivinationInfo('lenormand', changed),
    () => formatDetailedDivinationInfo('lenormand', changed),
  ]) {
    assert.throws(render, /雷诺曼组合记录与牌号、牌位或相邻关系不一致/);
  }

  const changedCard = structuredClone(original);
  changedCard.cards[0]!.name = '伪造牌名';
  changedCard.cards[0]!.keywords = ['伪造关键词'];
  changedCard.cards[0]!.meaning = '伪造牌义';
  const text = [
    ...getDivinationSummaryBlocks('lenormand', changedCard).lines,
    formatEnhancedDivinationInfo('lenormand', changedCard),
    formatDetailedDivinationInfo('lenormand', changedCard),
  ].join('\n');
  assert.match(text, /骑士/);
  assert.doesNotMatch(text, /伪造牌名|伪造关键词|伪造牌义/);
});

test('雷诺曼在线文字保留牌义主题与固定组合，避免把婚约写成已发生事实', () => {
  const data = drawLenormandSpread('three', { manualCardIds: [24, 25, 1] });
  const texts = [
    ...getDivinationSummaryBlocks('lenormand', data).lines,
    formatEnhancedDivinationInfo('lenormand', data),
    formatDetailedDivinationInfo('lenormand', data),
  ];
  const rendered = texts.join('\n');
  assert.match(rendered, /起因：心；关键词：感情、喜欢、热情/);
  assert.match(rendered, /心\+戒指：传统固定组合/);
  assert.match(rendered, /关系承诺、契约或婚约议题/);
  assert.doesNotMatch(rendered, /基础牌义：情感动机强|心\+戒指：感情的承诺或婚约/);
});

test('雷诺曼含先后语义的固定组合只在原牌序命中', () => {
  for (const [firstName, secondName] of [
    ['骑士', '心'],
    ['月亮', '太阳'],
    ['星星', '月亮'],
    ['锚', '星星'],
    ['船', '鹳'],
  ]) {
    const first = LENORMAND_CARDS.find((card) => card.name === firstName);
    const second = LENORMAND_CARDS.find((card) => card.name === secondName);
    assert.ok(first && second);
    const thirdId = [1, 2, 3].find((id) => id !== first.id && id !== second.id);
    assert.ok(thirdId);

    const forward = drawLenormandSpread('three', {
      manualCardIds: [first.id, second.id, thirdId],
    });
    const reverse = drawLenormandSpread('three', {
      manualCardIds: [second.id, first.id, thirdId],
    });

    assert.equal(forward.combinations?.[0].source, '固定组合');
    assert.equal(
      forward.combinations?.[0].meaning,
      LENORMAND_FIXED_COMBINATIONS[`${firstName}+${secondName}`],
    );
    assert.equal(reverse.combinations?.[0].source, '相邻牌义合读');
    assert.doesNotMatch(reverse.combinations?.[0].meaning ?? '', /。，/);
    assert.ok(
      reverse.evidenceAnalysis?.traditionalFacts.some(
        (item) =>
          item.kind === '相邻合读' && item.cardNames.join('+') === `${secondName}+${firstName}`,
      ),
    );
    assert.doesNotMatch(
      `${forward.evidenceAnalysis?.promptText}\n${reverse.evidenceAnalysis?.promptText}`,
      /登记次序|登记判词|本抽牌为反序/,
    );
  }

  const reverseMoonSun = drawLenormandSpread('three', { manualCardIds: [31, 32, 1] });
  assert.doesNotMatch(
    reverseMoonSun.evidenceAnalysis?.promptText ?? '',
    /从迷茫走向清晰|信息由模糊转向清晰的线索/,
  );

  const reverseRiderHeart = drawLenormandSpread('three', { manualCardIds: [24, 1, 2] });
  assert.doesNotMatch(reverseRiderHeart.evidenceAnalysis?.promptText ?? '', /消息带来感情进展/);

  const reversible = drawLenormandSpread('three', { manualCardIds: [25, 24, 1] });
  assert.equal(reversible.combinations?.[0].source, '固定组合');
});

test('雷诺曼选择牌阵不把A方案走向与B方案拼成连续组合', () => {
  const result = drawLenormandSpread('decision', { manualCardIds: [1, 2, 3, 4, 5, 6] });
  const crossBranchCombination = result.combinations?.find(
    (item) => item.position1 === '选择A走向' && item.position2 === '选择B',
  );

  assert.equal(crossBranchCombination, undefined);
  assert.ok(
    result.evidenceAnalysis?.adjacentReadings.every(
      (item) => !(item.position1 === '选择A走向' && item.position2 === '选择B'),
    ),
  );
});

test('雷诺曼非时间牌阵按牌位并列合读，三牌事件线保留先后', () => {
  for (const spreadType of ['five', 'relationship', 'decision', 'element'] as const) {
    const cardCount = {
      five: 5,
      relationship: 5,
      decision: 6,
      element: 4,
    }[spreadType];
    const result = drawLenormandSpread(spreadType, {
      manualCardIds: Array.from({ length: cardCount }, (_, index) => index + 1),
    });
    const adjacent = result.combinations?.find((item) => item.relation === '牌序相邻');

    assert.ok(adjacent);
    assert.match(adjacent.meaning, /牌序相邻的两组线索/u);
    assert.doesNotMatch(adjacent.meaning, /前后相接|先按|再看/u);
  }

  const eventLine = drawLenormandSpread('three', { manualCardIds: [1, 2, 3] });
  assert.match(eventLine.combinations?.[0]?.meaning ?? '', /前后相接，先按[\s\S]*再看/u);
});

test('雷诺曼在线提示词使用重算后的关系牌阵组合事实', () => {
  const session = generateDivinationSession({
    method: 'lenormand',
    question: '我和对方目前的关系如何？',
    currentTime: new Date('2026-09-28T00:00:00+08:00'),
    lenormand: { spread: 'relationship', manualCardIds: [1, 2, 3, 4, 5] },
  });
  const first = session.data.combinations?.[0];
  assert.equal(first?.position1, '你的状态');
  assert.equal(first?.position2, '对方状态');
  assert.match(
    session.aiPrompt,
    /相邻合读 骑士\+三叶草：相邻牌骑士\+三叶草通过你的状态与对方状态的牌序相邻形成消息、到来、进展、机会、短暂好运、轻松的合读范围/u,
  );
  assert.doesNotMatch(session.aiPrompt, /前后相接|先按|再看/u);
});

test('雷诺曼关系牌阵旧版组合文案可核验并在证据输出中重算', () => {
  const legacy = structuredClone(
    drawLenormandSpread('relationship', { manualCardIds: [1, 2, 3, 4, 5] }),
  );
  const first = legacy.cards[0]!;
  const second = legacy.cards[1]!;
  legacy.combinations![0]!.meaning = `${first.position}${first.name}的“${first.keywords.slice(0, 2).join('、')}”与${second.position}${second.name}的“${second.keywords.slice(0, 2).join('、')}”前后相接，先按${first.meaning.replace(/[。！？]$/u, '')}，再看${second.meaning}`;

  const evidence = analyzeLenormandEvidence(legacy);
  assert.equal(evidence.summaryFact.status, '证据链完整');
  assert.match(evidence.adjacentReadings[0]?.meaning ?? '', /牌序相邻的两组线索/u);
  assert.doesNotMatch(evidence.promptText, /前后相接|先按|再看/u);
});

test('雷诺曼九宫固定组合应按纵向空间相邻命中并保留牌位', () => {
  const result = drawLenormandSpread('nine', {
    manualCardIds: [24, 1, 2, 25, 3, 4, 5, 6, 7],
  });
  const combination = result.combinations?.find(
    (item) => item.card1 === '心' && item.card2 === '戒指',
  );

  assert.equal(combination?.source, '固定组合');
  assert.equal(combination?.relation, '纵向相邻');
  assert.equal(combination?.position1, '左上');
  assert.equal(combination?.position2, '左侧');
  const fact = result.evidenceAnalysis?.traditionalFacts.find(
    (item) =>
      item.kind === '固定组合' && item.cardNames.includes('心') && item.cardNames.includes('戒指'),
  );
  assert.match(fact?.promptText ?? '', /左上与左侧的纵向相邻/);
  assert.ok(fact?.sources.some((source) => source.includes('纵向相邻')));
});

test('雷诺曼大桌不应把行尾与下一行行首误判为空间相邻', () => {
  const cardIds = Array.from({ length: 36 }, (_, index) => index + 1);
  [cardIds[8], cardIds[23]] = [cardIds[23], cardIds[8]];
  [cardIds[9], cardIds[24]] = [cardIds[24], cardIds[9]];
  const result = drawLenormandSpread('grandTableau', { manualCardIds: cardIds });

  assert.equal(
    result.combinations?.some(
      (item) =>
        (item.card1 === '心' && item.card2 === '戒指') ||
        (item.card1 === '戒指' && item.card2 === '心'),
    ),
    false,
  );
});

test('雷诺曼大桌固定组合应按纵向空间相邻命中', () => {
  const cardIds = Array.from({ length: 36 }, (_, index) => index + 1);
  [cardIds[0], cardIds[23]] = [cardIds[23], cardIds[0]];
  [cardIds[9], cardIds[24]] = [cardIds[24], cardIds[9]];
  const result = drawLenormandSpread('grandTableau', { manualCardIds: cardIds });
  const combination = result.combinations?.find(
    (item) => item.card1 === '心' && item.card2 === '戒指',
  );

  assert.equal(combination?.source, '固定组合');
  assert.equal(combination?.relation, '纵向相邻');
  assert.equal(combination?.rowDistance, 1);
  assert.equal(combination?.columnDistance, 0);
});

test('雷诺曼手动抽取应按样本逐张无重复翻牌并保留可重放轨迹', () => {
  const samples = [0, 0.5, 0.999];
  const preview = resolveInteractiveLenormandCards('three', samples);
  const result = drawLenormandSpread('three', { interactiveSamples: samples });

  assert.deepEqual(
    result.cards.map((card) => card.id),
    preview.map((card) => card.id),
  );
  assert.equal(new Set(result.cards.map((card) => card.id)).size, 3);
  assert.equal(result.draw?.method, '用户逐张触发前端随机抽取');
  assert.equal(result.meta?.algorithm, 'lenormand.spread.interactive');
  assert.deepEqual(result.meta?.random, { mode: 'system', seed: undefined, samples });
  assert.equal(result.evidenceAnalysis?.randomFact.status, '可重放');

  assert.throws(
    () => drawLenormandSpread('three', { interactiveSamples: samples.slice(0, -1) }),
    /需要逐张抽取3张牌/,
  );
  assert.throws(
    () => drawLenormandSpread('three', { seed: '冲突', interactiveSamples: samples }),
    /不能同时提供随机选项/,
  );
});

test('雷诺曼全部单牌应保留原文并生成关键词核验范围', () => {
  const facts = LENORMAND_CARDS.flatMap((card) => {
    const data: LenormandData = {
      spreadType: 'single',
      spreadName: '单牌线索',
      cards: [{ ...card, position: '核心线索' }],
      timestamp: 0,
    };
    return analyzeLenormandEvidence(data).traditionalFacts;
  });

  assert.equal(facts.length, 36);
  assert.ok(
    facts.every(
      (item) =>
        item.kind === '单牌牌义' &&
        item.originalText &&
        item.promptText &&
        item.verificationTargets.length > 0 &&
        item.sources.length > 0 &&
        item.limitation.includes('不证明现实事件'),
    ),
  );
  assert.ok(facts.some((item) => /隐藏动机|家庭添丁|问题有解/.test(item.originalText)));
  assert.doesNotMatch(
    facts.map((item) => item.promptText).join('\n'),
    /隐藏动机|家庭添丁|问题有解|会提供支持|不能强行续命/,
  );
});

test('雷诺曼全部固定组合应保留原文并生成条件化核验事实', () => {
  const facts = Object.entries(LENORMAND_FIXED_COMBINATIONS).flatMap(([pair, meaning], index) => {
    const [firstName, secondName] = pair.split('+');
    const first = LENORMAND_CARDS.find((card) => card.name === firstName);
    const second = LENORMAND_CARDS.find((card) => card.name === secondName);
    assert.ok(first && second, `${pair} 应引用有效牌名`);
    const data: LenormandData = {
      spreadType: 'three',
      spreadName: '组合审计',
      cards: [
        { ...first, position: '前牌' },
        { ...second, position: '后牌' },
      ],
      combinations: [{ card1: first.name, card2: second.name, meaning, source: '固定组合' }],
      timestamp: index,
    };
    return analyzeLenormandEvidence(data).traditionalFacts.filter(
      (item) => item.kind === '固定组合',
    );
  });

  assert.equal(facts.length, Object.keys(LENORMAND_FIXED_COMBINATIONS).length);
  assert.ok(
    facts.every(
      (item) =>
        item.originalText &&
        item.promptText &&
        item.verificationTargets.length > 0 &&
        item.sources.length > 0 &&
        item.limitation.includes('感情承诺'),
    ),
  );
  assert.ok(facts.some((item) => /婚约|家庭添丁|获利|欺骗/.test(item.originalText)));
  assert.doesNotMatch(
    facts.map((item) => item.promptText).join('\n'),
    /感情的承诺或婚约|家庭添丁|通过网络\/远程获利|隐藏在迷雾中的欺骗/,
  );
});

test('雷诺曼条件化函数应区分固定组合与普通相邻合读', () => {
  const fixed = conditionLenormandTraditionalText('家庭添丁', {
    kind: '固定组合',
    cardNames: ['孩子', '房子'],
    keywords: ['新开始', '家庭'],
  });
  const adjacent = conditionLenormandTraditionalText('先看房子，再看孩子', {
    kind: '相邻合读',
    cardNames: ['房子', '孩子'],
    keywords: ['家庭', '新开始'],
  });

  assert.match(fixed, /家庭成员变化或生育议题/);
  assert.match(fixed, /不得直接认定婚约、生育、收益、欺骗/);
  assert.match(adjacent, /这不是传统固定组合/);
  assert.doesNotMatch(adjacent, /先看房子，再看孩子/);
});

test('雷诺曼旧数据缺少抽牌来源时应明确保留证据缺口', () => {
  const result = drawLenormandSpread('single', { seed: 1 });
  const legacyData = { ...result, draw: undefined, evidenceAnalysis: undefined };
  const analysis = result.evidenceAnalysis;

  assert.ok(analysis);
  const legacyAnalysis = analyzeLenormandEvidence(legacyData);
  const missingItem = legacyAnalysis.evidence.items.find((item) => item.title === '抽牌来源链缺失');
  assert.equal(legacyAnalysis.drawFact.status, '来源链缺失');
  assert.equal(legacyAnalysis.drawFact.recordedCardCount, 0);
  assert.equal(legacyAnalysis.summaryFact.status, '证据链有缺口');
  assert.equal(legacyAnalysis.calculationSteps[1]?.status, '资料不足');
  assert.equal(legacyAnalysis.calculationSteps[7]?.status, '资料不足');
  assert.match(legacyAnalysis.drawFact.promptText, /不能反推完整抽牌来源链/);
  assert.equal(missingItem?.level, '反证');
  assert.match(missingItem?.detail || '', /不能反推完整抽牌来源链/);
});

test('雷诺曼未知牌阵应明确报错，不应静默退回单牌', () => {
  assert.throws(() => drawLenormandSpread('unknown' as never), /未知的雷诺曼牌阵类型/);
});

test('雷诺曼全部牌阵应输出覆盖、逐牌、牌序、来源与限制对象', () => {
  spreadTypes.forEach((spreadType) => {
    const result = drawLenormandSpread(spreadType, { seed: `雷诺曼结构证据-${spreadType}` });
    const evidence = result.evidenceAnalysis;

    assert.ok(evidence);
    assert.equal(evidence.key, 'lenormand:evidence');
    assert.equal(evidence.status, '已计算');
    assert.equal(evidence.calculationSteps.length, 8);
    assert.equal(evidence.calculationChain.length, evidence.calculationSteps.length);
    const calculationStepKeys = new Set(evidence.calculationSteps.map((item) => item.key));
    assert.ok(
      evidence.calculationSteps.every(
        (item) =>
          item.dependsOnStepKeys.every((key) => calculationStepKeys.has(key)) &&
          item.sources.length > 0 &&
          item.limitation.includes('不证明预测有效性'),
      ),
    );
    assert.equal(evidence.spreadCoverageFact.status, '完整');
    assert.equal(evidence.spreadCoverageFact.actualCardCount, result.cards.length);
    assert.deepEqual(evidence.spreadCoverageFact.positionOrderMismatches, []);
    assert.equal(evidence.drawFact.status, '可核验');
    assert.equal(evidence.drawFact.key, `draw:lenormand:${spreadType}`);
    assert.deepEqual(evidence.drawFact.mismatchIndexes, []);
    assert.equal(evidence.drawOrderFacts.length, result.cards.length);
    assert.ok(evidence.drawOrderFacts.every((fact) => fact.status === '一致'));
    assert.equal(evidence.sequenceFacts.length, Math.max(0, result.cards.length - 1));
    assert.equal(evidence.sequence.length, evidence.sequenceFacts.length);
    assert.equal(evidence.counterEvidenceFacts.length, 2);
    assert.ok(['有证据缺口', '未见证据缺口'].includes(evidence.counterSummaryFact.status));
    assert.equal(evidence.limitationFacts.length, 6);
    assert.equal(evidence.limitations.length, evidence.limitationFacts.length);
    assert.equal(evidence.summaryFact.status, '证据链完整');
    assert.equal(evidence.summaryFact.cardFactCount, evidence.cards.length);
    assert.equal(evidence.summaryFact.drawOrderFactCount, evidence.drawOrderFacts.length);
    assert.equal(evidence.summaryFact.sequenceFactCount, evidence.sequenceFacts.length);
    assert.equal(evidence.summaryFact.fixedCombinationCount, evidence.fixedCombinations.length);
    assert.equal(evidence.summaryFact.adjacentReadingCount, evidence.adjacentReadings.length);
    assert.equal(
      evidence.summaryFact.structuredLayoutFactCount,
      evidence.structuredLayoutFacts.length,
    );
    assert.equal(evidence.summaryFact.counterEvidenceCount, evidence.counterEvidenceFacts.length);
    assert.equal(evidence.summaryFact.traditionalFactCount, evidence.traditionalFacts.length);
    const factKeys = new Set([evidence.summaryFact.key, ...evidence.summaryFact.factKeys]);
    assert.ok(
      evidence.limitationFacts.every(
        (item) =>
          item.ownerFactKeys.length > 0 && item.ownerFactKeys.every((key) => factKeys.has(key)),
      ),
    );

    const cardKeys = new Set(evidence.cards.map((card) => card.key));
    const traditionalFactKeys = new Set(evidence.traditionalFacts.map((fact) => fact.key));
    assert.deepEqual(evidence.spreadCoverageFact.cardFactKeys, [...cardKeys]);
    assert.deepEqual(
      evidence.drawFact.orderFactKeys,
      evidence.drawOrderFacts.map((fact) => fact.key),
    );
    assert.ok(
      evidence.cards.every(
        (card) =>
          card.status === '已映射' &&
          traditionalFactKeys.has(card.traditionalFactKey) &&
          card.promptText &&
          card.sources.length >= 2,
      ),
    );
    assert.ok(
      evidence.sequenceFacts.every(
        (fact) => cardKeys.has(fact.fromCardKey) && cardKeys.has(fact.toCardKey),
      ),
    );
    assert.ok(
      evidence.traditionalFacts.every((fact) =>
        fact.cardFactKeys.every((cardKey) => cardKeys.has(cardKey)),
      ),
    );
    assert.ok(
      evidence.structuredLayoutFacts.every(
        (fact) =>
          fact.status === '已计算' &&
          fact.cardFactKeys.every((cardKey) => cardKeys.has(cardKey)) &&
          fact.sources.length > 0,
      ),
    );
    assert.equal(
      evidence.layoutCoverageFact.status,
      spreadType === 'nine' || spreadType === 'grandTableau' ? '结构化覆盖' : '不适用',
    );
    assert.match(evidence.drawFacts[1], /^第1张对应/);
    assert.match(evidence.promptText, /计算链：[\s\S]*证据汇总：[\s\S]*解释限制：/);
    assert.doesNotMatch(evidence.promptText, /成功率|吉凶总分|score/i);
    assertPromptIsPortableTaskText(evidence.promptText);
  });
});

test('雷诺曼单牌不应伪造相邻关系，多牌应逐对引用相邻牌面', () => {
  const single = drawLenormandSpread('single', { seed: '雷诺曼单牌序列' }).evidenceAnalysis;
  const nine = drawLenormandSpread('nine', { seed: '雷诺曼九牌序列' }).evidenceAnalysis;

  assert.ok(single);
  assert.ok(nine);
  assert.deepEqual(single.sequenceFacts, []);
  assert.deepEqual(single.sequence, []);
  assert.equal(nine.sequenceFacts.length, 8);
  assert.deepEqual(
    nine.sequenceFacts.map((fact) => fact.fromCardKey),
    nine.cards.slice(0, -1).map((card) => card.key),
  );
  assert.deepEqual(
    nine.sequenceFacts.map((fact) => fact.toCardKey),
    nine.cards.slice(1).map((card) => card.key),
  );
});

test('雷诺曼抽牌序号、牌面或布局落点不一致时应明确标记', () => {
  const result = drawLenormandSpread('nine', { seed: '雷诺曼来源一致性' });
  const tampered: LenormandData = structuredClone(result);
  tampered.draw!.order[1].index = 1;
  tampered.draw!.order[1].cardName = `${tampered.draw!.order[1].cardName}（篡改）`;
  tampered.draw!.order[1].row = 3;
  tampered.evidenceAnalysis = undefined;
  const evidence = analyzeLenormandEvidence(tampered);

  assert.equal(evidence.drawFact.status, '来源链不一致');
  assert.deepEqual(evidence.drawFact.mismatchIndexes, [2]);
  assert.equal(evidence.drawOrderFacts[1].status, '不一致');
  assert.deepEqual(evidence.drawOrderFacts[1].mismatches, [
    '记录序号应为2',
    `牌名应为${result.cards[1].name}`,
    '行号应为1',
  ]);
  assert.ok(
    evidence.evidence.items.some(
      (item) => item.level === '反证' && item.title === '抽牌来源链不一致',
    ),
  );
});

test('雷诺曼抽牌记录中的牌组规模不符时不得标记为可核验', () => {
  const data = drawLenormandSpread('three', { seed: '雷诺曼牌组规模核验' });
  const tampered: LenormandData = structuredClone(data);
  tampered.draw!.deckSize = 35;
  tampered.evidenceAnalysis = undefined;
  const evidence = analyzeLenormandEvidence(tampered);

  assert.equal(evidence.randomFact.status, '可重放');
  assert.equal(evidence.drawFact.status, '来源链不一致');
  assert.deepEqual(evidence.drawFact.mismatchIndexes, []);
  assert.deepEqual(evidence.drawFact.metadataMismatches, ['牌组规模应为36张，记录为35张']);
  assert.equal(evidence.summaryFact.status, '证据链有缺口');
  assert.match(evidence.drawFact.promptText, /牌组规模：35张.*应为36张，记录为35张/);
});

test('雷诺曼牌位、顺序和牌号异常时应给出可定位的覆盖事实', () => {
  const result = drawLenormandSpread('three', { manualCardIds: [1, 2, 3] });
  const tampered: LenormandData = structuredClone(result);
  tampered.cards[1].position = tampered.cards[0].position;
  tampered.cards[1].id = tampered.cards[0].id;
  tampered.evidenceAnalysis = undefined;
  const evidence = analyzeLenormandEvidence(tampered);

  assert.equal(evidence.spreadCoverageFact.status, '牌位异常');
  assert.equal(evidence.summaryFact.status, '证据链有缺口');
  assert.equal(evidence.calculationSteps[2]?.status, '资料不足');
  assert.equal(evidence.calculationSteps[7]?.status, '资料不足');
  assert.deepEqual(evidence.spreadCoverageFact.missingPositions, ['现状']);
  assert.deepEqual(evidence.spreadCoverageFact.duplicatePositions, ['起因']);
  assert.deepEqual(evidence.spreadCoverageFact.positionOrderMismatches, [2]);
  assert.deepEqual(evidence.spreadCoverageFact.duplicateCardIds, [tampered.cards[0].id]);

  const missingCard = analyzeLenormandEvidence({
    ...result,
    cards: result.cards.slice(0, 2),
    evidenceAnalysis: undefined,
  });
  assert.equal(missingCard.spreadCoverageFact.status, '牌数不符');
  assert.equal(missingCard.spreadCoverageFact.actualCardCount, 2);

  const unknownSpread = analyzeLenormandEvidence({
    ...result,
    spreadType: 'unknown' as LenormandSpreadType,
    spreadName: '未声明牌阵',
    evidenceAnalysis: undefined,
  });
  assert.equal(unknownSpread.spreadCoverageFact.status, '未知牌阵');
  assert.equal(unknownSpread.spreadCoverageFact.expectedCardCount, null);
});

test('雷诺曼旧布局文字只能兼容展示，不得反推结构化布局', () => {
  const result = drawLenormandSpread('nine', { manualCardIds: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
  const legacy = analyzeLenormandEvidence({
    ...result,
    cards: result.cards.slice(0, 8),
    draw: undefined,
    evidenceAnalysis: undefined,
  });

  assert.equal(legacy.layoutCoverageFact.status, '旧版字符串兼容');
  assert.equal(legacy.layoutCoverageFact.structuredFactCount, 0);
  assert.ok(legacy.layoutCoverageFact.legacyFactCount > 0);
  assert.match(legacy.layoutCoverageFact.promptText, /不得反推缺失的行列、宫位或距离事实/);

  const missing = analyzeLenormandEvidence({
    ...result,
    cards: result.cards.slice(0, 8),
    draw: undefined,
    layoutEvidence: undefined,
    evidenceAnalysis: undefined,
  });
  assert.equal(missing.layoutCoverageFact.status, '结构缺失');
  assert.equal(missing.summaryFact.status, '证据链有缺口');
  assert.equal(missing.calculationSteps[5]?.status, '资料不足');
  assert.equal(missing.calculationSteps[7]?.status, '资料不足');
  assert.equal(
    missing.counterEvidenceFacts.find((fact) => fact.type === '布局覆盖')?.status,
    '存在缺口',
  );
});

test('雷诺曼固定组合事实应引用两张所属牌并进入反证汇总', () => {
  const heart = LENORMAND_CARDS.find((card) => card.name === '心');
  const ring = LENORMAND_CARDS.find((card) => card.name === '戒指');
  assert.ok(heart && ring);
  const evidence = analyzeLenormandEvidence(
    drawLenormandSpread('three', { manualCardIds: [heart.id, ring.id, 1] }),
  );
  const fixed = evidence.traditionalFacts.find((fact) => fact.kind === '固定组合');

  assert.ok(fixed);
  assert.deepEqual(fixed.cardFactKeys, [evidence.cards[0].key, evidence.cards[1].key]);
  assert.equal(
    evidence.counterEvidenceFacts.find((fact) => fact.type === '固定组合覆盖')?.status,
    '有可用证据',
  );
  assert.deepEqual(
    evidence.counterEvidenceFacts.find((fact) => fact.type === '固定组合覆盖')?.ownerFactKeys,
    [fixed.key],
  );
});
