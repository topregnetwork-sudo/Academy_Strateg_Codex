/**
 * Smart Link Router MVP — standalone Google Apps Script Web App.
 *
 * This project is intentionally separate from the production generator.
 * Required Script Properties are documented in README.md. No real values or
 * credentials belong in this source file.
 */

const ROUTER_CONFIG = Object.freeze({
  LINK_PATTERN: /^btm_(\d{6})_hr_invite$/,
  CLICK_PATTERN: /^clk_\d{13}_[a-f0-9]{32}$/,
  LINK_TYPE: 'hr_invite',
  SOURCE_ID: 'hr_invite',
  EVENT_HEADERS: [
    'timestamp',
    'click_id',
    'link_id',
    'btm_id',
    'link_type',
    'source_id',
    'target_url',
    'status',
    'user_agent',
    'error'
  ]
});

function doGet(e) {
  const linkId = String(e && e.parameter && e.parameter.link_id || '').trim();
  const clickId = createClickId_();
  const route = prepareRoute_(linkId, clickId);
  const template = HtmlService.createTemplateFromFile('Router');

  template.linkId = linkId;
  template.clickId = clickId;
  template.targetUrl = route.target_url;
  template.canRedirect = route.status === 'redirect_ready';
  template.publicMessage = publicMessageForStatus_(route.status);

  return template.evaluate()
    .setTitle('Переход по ссылке')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Called asynchronously from Router.html. All routing fields are recomputed on
 * the server; only link_id, click_id and the untrusted user-agent are accepted.
 */
function recordClick(payload) {
  const input = payload || {};
  const linkId = String(input.link_id || '').trim();
  const clickId = String(input.click_id || '').trim();

  if (!ROUTER_CONFIG.CLICK_PATTERN.test(clickId)) {
    throw new Error('INVALID_CLICK_ID');
  }

  const route = prepareRoute_(linkId, clickId);
  const event = {
    timestamp: new Date().toISOString(),
    click_id: clickId,
    link_id: linkId,
    btm_id: route.btm_id,
    link_type: route.link_type,
    source_id: route.source_id,
    target_url: route.target_url,
    status: route.status,
    user_agent: sanitizeUserAgent_(input.user_agent),
    error: route.error
  };

  const logResult = appendEventIfConfigured_(event);
  return {
    status: route.status,
    logged: logResult.logged,
    log_skipped: logResult.skipped,
    log_error: logResult.error
  };
}

function prepareRoute_(linkId, clickId) {
  const match = ROUTER_CONFIG.LINK_PATTERN.exec(linkId);
  if (!match) {
    return routeResult_('', '', '', 'invalid_link', 'INVALID_LINK_ID');
  }

  const btmId = 'btm_' + match[1];
  let siteBaseUrl;
  try {
    siteBaseUrl = getSiteBaseUrl_();
  } catch (error) {
    return routeResult_(btmId, ROUTER_CONFIG.LINK_TYPE, ROUTER_CONFIG.SOURCE_ID,
      'config_error', safeErrorCode_(error));
  }

  const targetUrl = siteBaseUrl + '/index.html'
    + '?ref=' + encodeURIComponent(btmId)
    + '&source_id=' + encodeURIComponent(ROUTER_CONFIG.SOURCE_ID)
    + '&link_type=' + encodeURIComponent(ROUTER_CONFIG.LINK_TYPE)
    + '&click_id=' + encodeURIComponent(clickId);

  return {
    btm_id: btmId,
    link_type: ROUTER_CONFIG.LINK_TYPE,
    source_id: ROUTER_CONFIG.SOURCE_ID,
    target_url: targetUrl,
    status: 'redirect_ready',
    error: ''
  };
}

function routeResult_(btmId, linkType, sourceId, status, error) {
  return {
    btm_id: btmId,
    link_type: linkType,
    source_id: sourceId,
    target_url: '',
    status: status,
    error: error
  };
}

function getSiteBaseUrl_() {
  const raw = String(PropertiesService.getScriptProperties()
    .getProperty('SITE_BASE_URL') || '').trim();
  const normalized = raw.replace(/\/+$/, '');
  const safeHttpsUrl = /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[A-Za-z0-9._~!$&()*+,;=:@%/-]*)?$/;

  if (!normalized) {
    throw new Error('SITE_BASE_URL_MISSING');
  }
  if (!safeHttpsUrl.test(normalized)) {
    throw new Error('SITE_BASE_URL_INVALID');
  }
  return normalized;
}

function createClickId_() {
  return 'clk_' + Date.now() + '_'
    + Utilities.getUuid().replace(/-/g, '').toLowerCase();
}

function appendEventIfConfigured_(event) {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('EVENT_LOG_ENABLED') !== 'true') {
    return { logged: false, skipped: true, error: '' };
  }

  const spreadsheetId = String(properties.getProperty('EVENT_LOG_SPREADSHEET_ID') || '').trim();
  const sheetName = String(properties.getProperty('EVENT_LOG_SHEET_NAME') || '').trim();
  if (!spreadsheetId || !sheetName) {
    return { logged: false, skipped: false, error: 'EVENT_LOG_CONFIG_MISSING' };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error('EVENT_LOG_SHEET_NOT_FOUND');
    }

    const actualHeaders = sheet.getRange(1, 1, 1, ROUTER_CONFIG.EVENT_HEADERS.length)
      .getDisplayValues()[0];
    if (actualHeaders.join('|') !== ROUTER_CONFIG.EVENT_HEADERS.join('|')) {
      throw new Error('EVENT_LOG_HEADER_MISMATCH');
    }

    sheet.appendRow(ROUTER_CONFIG.EVENT_HEADERS.map(function(header) {
      return safeSheetCell_(event[header]);
    }));
    return { logged: true, skipped: false, error: '' };
  } catch (error) {
    console.error('Smart Link Router event-log error: ' + safeErrorCode_(error));
    return { logged: false, skipped: false, error: safeErrorCode_(error) };
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function sanitizeUserAgent_(value) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, 500);
}

function safeSheetCell_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function safeErrorCode_(error) {
  const message = String(error && error.message || error || 'UNKNOWN_ERROR');
  return /^[A-Z0-9_]{1,80}$/.test(message) ? message : 'INTERNAL_ERROR';
}

function publicMessageForStatus_(status) {
  if (status === 'redirect_ready') {
    return 'Перенаправляем…';
  }
  if (status === 'invalid_link') {
    return 'Ссылка имеет неверный формат.';
  }
  return 'Переход временно недоступен.';
}
