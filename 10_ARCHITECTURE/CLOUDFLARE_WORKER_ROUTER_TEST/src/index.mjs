const BTM_PATTERN = /^btm_\d{6}$/;
const LINK_ID_PATTERN = /^(btm_\d{6})_hr_invite$/;
const PATH_PATTERN = /^\/hr\/(btm_\d{6})$/;

function jsonError(status, error) {
  return new Response(JSON.stringify({ status: "error", error }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function parseInput(url) {
  const pathMatch = url.pathname.match(PATH_PATTERN);
  if (pathMatch) {
    if (url.search) {
      return { error: "query_not_allowed_for_path_format" };
    }
    return { btmId: pathMatch[1], linkId: `${pathMatch[1]}_hr_invite` };
  }

  if (url.pathname !== "/" && url.pathname !== "/r") {
    return { error: "route_not_found", status: 404 };
  }

  const entries = [...url.searchParams.entries()];
  if (entries.length !== 1 || entries[0][0] !== "link_id") {
    return { error: "exactly_one_link_id_is_required" };
  }

  const linkId = entries[0][1];
  const linkMatch = linkId.match(LINK_ID_PATTERN);
  if (!linkMatch) {
    return { error: "invalid_link_id" };
  }

  return { btmId: linkMatch[1], linkId };
}

function makeClickId(now = Date.now(), uuid = crypto.randomUUID()) {
  return `clk_${now}_${uuid.replaceAll("-", "")}`;
}

function buildTargetUrl(siteBaseUrl, btmId, clickId) {
  let base;
  try {
    base = new URL(siteBaseUrl);
  } catch {
    throw new Error("SITE_BASE_URL is not a valid URL");
  }

  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error("SITE_BASE_URL must be a clean HTTPS origin or path");
  }

  const target = new URL("index.html", `${base.toString().replace(/\/$/, "")}/`);
  target.searchParams.set("ref", btmId);
  target.searchParams.set("source_id", "hr_invite");
  target.searchParams.set("link_type", "hr_invite");
  target.searchParams.set("click_id", clickId);
  return target.toString();
}

export function routeRequest(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonError(405, "method_not_allowed");
  }

  const parsed = parseInput(new URL(request.url));
  if (parsed.error) {
    return jsonError(parsed.status || 400, parsed.error);
  }
  if (!BTM_PATTERN.test(parsed.btmId)) {
    return jsonError(400, "invalid_btm_id");
  }

  const clickId = makeClickId();
  let targetUrl;
  try {
    targetUrl = buildTargetUrl(env?.SITE_BASE_URL, parsed.btmId, clickId);
  } catch {
    return jsonError(503, "router_configuration_error");
  }

  console.log(JSON.stringify({
    event: "smart_link_redirect",
    environment: env?.ENVIRONMENT || "unknown",
    timestamp: new Date().toISOString(),
    click_id: clickId,
    link_id: parsed.linkId,
    btm_id: parsed.btmId,
    link_type: "hr_invite",
    source_id: "hr_invite",
    target_url: targetUrl,
    status: "redirected",
  }));

  return new Response(null, {
    status: 302,
    headers: {
      Location: targetUrl,
      "Cache-Control": "no-store",
      "X-Router-Environment": env?.ENVIRONMENT || "unknown",
    },
  });
}

export default {
  fetch(request, env) {
    return routeRequest(request, env);
  },
};
