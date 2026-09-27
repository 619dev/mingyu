import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { generateMeihua } from 'mingyu-core/divination/meihua';
import { MEIHUA_RELATION_JUDGEMENTS } from 'mingyu-core/classics';
import { TraditionalDivinationBoard } from '../src/components/DivinationPanel/TraditionalDivinationBoard';
import { buildDivinationPrompt, type DivinationSession } from '../src/lib/divination/engine';

test('梅花五种主卦体用关系仅展示命中原文，并附本盘月令、互变条件', () => {
  for (const [number, hour, relation] of [
    [1, '10:30', '用生体'],
    [3, '10:30', '体克用'],
    [7, '10:30', '用克体'],
    [10, '10:30', '体生用'],
    [2, '12:30', '体用比和'],
  ] as const) {
    const data = generateMeihua(new Date(`2025-06-18T${hour}:00+08:00`), {
      method: 'number',
      number,
    });
    assert.equal(data.analysis.tiYongRelation, relation);
    assert.equal(data.evidenceAnalysis?.stages[0]?.relation, data.analysis.tiYongRaw);
    const session: DivinationSession = {
      method: 'meihua',
      requestedMethod: 'meihua',
      question: '后续进展如何？',
      prompt: '',
      data,
    };
    const html = renderToStaticMarkup(createElement(TraditionalDivinationBoard, { session }));
    const referenceStart = html.indexOf(`${relation} · 体用总诀参考`);
    const referenceEnd = html.indexOf('八卦万物类象', referenceStart);
    assert.ok(referenceStart >= 0 && referenceEnd > referenceStart, relation);
    const reference = html.slice(referenceStart, referenceEnd);
    assert.ok(reference.includes(MEIHUA_RELATION_JUDGEMENTS[relation].classicSummary), relation);
    assert.ok(reference.includes(data.analysis.tiYongSeasonEvaluation!), relation);
    assert.ok(
      reference.includes(`变卦${data.changedName}：${data.analysis.changedTiYongRelation}`),
      relation,
    );
    assert.match(reference, /原文为主卦体用关系的传统参考/u);
    for (const [otherRelation, other] of Object.entries(MEIHUA_RELATION_JUDGEMENTS)) {
      if (otherRelation !== relation)
        assert.ok(!reference.includes(other.classicSummary), relation);
    }

    const prompt = buildDivinationPrompt('meihua', '后续进展如何？', data);
    assert.ok(prompt.includes(data.analysis.tiYongSeasonEvaluation!), relation);
    assert.ok(prompt.includes(data.evidenceAnalysis!.stages[0]!.promptText), relation);
    for (const judgement of Object.values(MEIHUA_RELATION_JUDGEMENTS)) {
      assert.ok(!prompt.includes(judgement.classicSummary), relation);
    }
  }
});

test('梅花主卦生体而变卦克体时，参考卡保留结果阶段的反向条件', () => {
  const data = generateMeihua(new Date('2025-06-18T10:30:00+08:00'), {
    method: 'number',
    number: 1,
  });
  assert.equal(data.analysis.tiYongRelation, '用生体');
  assert.equal(data.analysis.changedTiYongRelation, '用克体');
  const session: DivinationSession = {
    method: 'meihua',
    requestedMethod: 'meihua',
    question: '后续进展如何？',
    prompt: '',
    data,
  };
  const html = renderToStaticMarkup(createElement(TraditionalDivinationBoard, { session }));
  assert.match(html, /变卦天火同人：用克体/u);
  assert.match(html, /原文为主卦体用关系的传统参考/u);
});
