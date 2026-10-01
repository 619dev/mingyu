import assert from 'node:assert/strict';
import test from 'node:test';
import type { BaziChartResult } from '../../packages/core/src/bazi/baziTypes';
import { handlePublicApiRequest } from '../../src/lib/public-api/handler';

async function post(path: string, input: object) {
  const response = await handlePublicApiRequest(
    new Request(`https://example.test/api/v1/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  );
  return { status: response.status, body: await response.json() };
}

test('公开八字排盘与完整提示词沿用己申、戊巳本盘调候顺序', async () => {
  const samples = [
    {
      year: 2024,
      month: 8,
      day: 13,
      dayStem: '己',
      monthPillar: '壬申',
      dayPillar: '己酉',
      ruleId: 'shen-month-ji-bing-jia-first',
      order: ['水', '火', '金'],
    },
    {
      year: 2024,
      month: 5,
      day: 14,
      dayStem: '戊',
      monthPillar: '己巳',
      dayPillar: '戊寅',
      ruleId: 'si-month-wu-gui-bing-first',
      order: ['木', '火', '水'],
    },
  ] as const;

  for (const sample of samples) {
    const person = {
      dateType: 'solar',
      gender: 'male',
      year: sample.year,
      month: sample.month,
      day: sample.day,
      timeIndex: 6,
      useTrueSolarTime: false,
      detailMode: 'full',
    };
    const calculated = await post('bazi/calculate', person);
    assert.equal(calculated.status, 200, JSON.stringify(calculated.body));
    const chart = (calculated.body as { data: BaziChartResult }).data;

    assert.equal(chart.dayMaster.gan, sample.dayStem);
    assert.equal(chart.pillars.month.ganZhi, sample.monthPillar);
    assert.equal(chart.pillars.day.ganZhi, sample.dayPillar);

    const candidate = chart.analysis.usefulGod.decisionEvidence?.climateCandidates.find(
      (item) => item.ruleId === sample.ruleId,
    );
    assert.ok(candidate, sample.ruleId);
    assert.equal(candidate.mode, 'reference');
    assert.equal(candidate.status, '满足');
    assert.equal(candidate.adopted, false);
    assert.deepEqual(candidate.requestedOrder, sample.order);
    assert.deepEqual(
      chart.analysis.usefulGod.decisionEvidence?.climateReferenceOrder,
      sample.order,
    );

    const prompted = await post('bazi/prompt', {
      ...person,
      question: '核对本命调候取用顺序。',
      baziFortuneScope: 'natal',
      responseMode: 'full',
    });
    assert.equal(prompted.status, 200, JSON.stringify(prompted.body));
    const promptData = (prompted.body as { data: { result: BaziChartResult; prompt: string } })
      .data;
    assert.deepEqual(promptData.result.pillars, chart.pillars);
    assert.deepEqual(
      promptData.result.analysis.usefulGod.decisionEvidence?.climateReferenceOrder,
      sample.order,
    );
    assert.ok(promptData.prompt.includes(`日元本命: ${sample.dayStem}土`));
    assert.ok(promptData.prompt.includes(`月柱: ${sample.monthPillar}`));
    assert.ok(promptData.prompt.includes(`日柱: ${sample.dayPillar}`));
    assert.match(promptData.prompt, /【任务】[\s\S]*旺衰、格局、调候各明依据/u);
    assert.match(promptData.prompt, /【问题】[\s\S]*核对本命调候取用顺序。/u);
  }
});
