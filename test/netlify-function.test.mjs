import assert from "node:assert/strict";
import test from "node:test";

import { handler } from "../netlify/functions/vworld-boundary.mjs";

test("VWorld 경계 함수는 POST 이외의 요청을 거부한다", async () => {
  const response = await handler({ httpMethod: "GET", headers: {} });

  assert.equal(response.statusCode, 405);
  assert.deepEqual(JSON.parse(response.body), { error: "POST 요청만 허용됩니다." });
  assert.equal(response.headers["cache-control"], "no-store");
});

test("VWorld 경계 함수는 인증되지 않은 POST 요청을 거부한다", async () => {
  const response = await handler({ httpMethod: "POST", headers: {} });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(JSON.parse(response.body), { error: "로그인이 필요합니다." });
});
