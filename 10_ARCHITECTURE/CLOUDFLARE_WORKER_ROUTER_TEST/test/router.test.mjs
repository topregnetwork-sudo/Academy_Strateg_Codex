import assert from "node:assert/strict";
import test from "node:test";
import { routeRequest } from "../src/index.mjs";

const env = {
  ENVIRONMENT: "synthetic-test",
  SITE_BASE_URL: "https://example.com",
};

function assertRedirect(response, expectedBtmId) {
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const target = new URL(response.headers.get("location"));
  assert.equal(target.origin, "https://example.com");
  assert.equal(target.pathname, "/index.html");
  assert.equal(target.searchParams.get("ref"), expectedBtmId);
  assert.equal(target.searchParams.get("source_id"), "hr_invite");
  assert.equal(target.searchParams.get("link_type"), "hr_invite");
  assert.match(target.searchParams.get("click_id"), /^clk_\d{13}_[a-f0-9]{32}$/);
  return target;
}

test("path format returns a real 302 target", () => {
  const response = routeRequest(new Request("https://router.test/hr/btm_001001"), env);
  assertRedirect(response, "btm_001001");
});

test("root query format returns a real 302 target", () => {
  const response = routeRequest(
    new Request("https://router.test/?link_id=btm_001001_hr_invite"),
    env,
  );
  assertRedirect(response, "btm_001001");
});

test("legacy /r query alias remains compatible", () => {
  const response = routeRequest(
    new Request("https://router.test/r?link_id=btm_001001_hr_invite"),
    env,
  );
  assertRedirect(response, "btm_001001");
});

test("each redirect receives a different click_id", () => {
  const first = assertRedirect(
    routeRequest(new Request("https://router.test/hr/btm_001001"), env),
    "btm_001001",
  );
  const second = assertRedirect(
    routeRequest(new Request("https://router.test/hr/btm_001001"), env),
    "btm_001001",
  );
  assert.notEqual(first.searchParams.get("click_id"), second.searchParams.get("click_id"));
});

test("invalid inputs fail closed", async () => {
  const invalidLink = routeRequest(
    new Request("https://router.test/?link_id=btm_1001_hr_invite"),
    env,
  );
  assert.equal(invalidLink.status, 400);
  assert.equal((await invalidLink.json()).error, "invalid_link_id");

  const unknownRoute = routeRequest(new Request("https://router.test/other"), env);
  assert.equal(unknownRoute.status, 404);

  const post = routeRequest(
    new Request("https://router.test/hr/btm_001001", { method: "POST" }),
    env,
  );
  assert.equal(post.status, 405);
});

test("missing or unsafe target configuration never redirects", () => {
  const missing = routeRequest(new Request("https://router.test/hr/btm_001001"), {});
  assert.equal(missing.status, 503);

  const unsafe = routeRequest(new Request("https://router.test/hr/btm_001001"), {
    SITE_BASE_URL: "http://example.com?secret=no",
  });
  assert.equal(unsafe.status, 503);
});
