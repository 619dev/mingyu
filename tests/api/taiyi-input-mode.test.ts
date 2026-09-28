import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePublicApiRequest } from '../../src/lib/public-api/handler';

async function callTaiyi(path: 'calculate' | 'prompt', input: Record<string, unknown>) {
  const response = await handlePublicApiRequest(
    new Request(`https://aov.cc/api/v1/metaphysics/taiyi/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }),
  );
  return { status: response.status, body: await response.json() };
}

test('太乙公开接口年计不静默忽略月日时字段', async () => {
  for (const path of ['calculate', 'prompt'] as const) {
    const valid = await callTaiyi(path, { scope: 'year', year: 2026 });
    assert.equal(valid.status, 200);

    for (const field of ['month', 'day', 'hour', 'minute', 'second']) {
      const invalid = await callTaiyi(path, { scope: 'year', year: 2026, [field]: 1 });
      assert.equal(invalid.status, 400, `${path} 的 ${field} 应被拒绝`);
      assert.match(String(invalid.body.error?.message), /年计只接受 year/);
    }
  }
});
