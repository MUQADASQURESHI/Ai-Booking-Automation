/*****************************************************************
 * ViralFood / Chinaglia S.R.L. — Lead Capture Backend
 * Google Apps Script Web App
 *
 * Does TWO things on every form submission:
 *   1) Appends a structured row to a Google Sheet (lead/CRM database)
 *   2) Emails the full submission to info@chinagliafederico.com
 *
 * SETUP (one time):
 *   1. Create a Google Sheet. Open Extensions → Apps Script.
 *   2. Delete any sample code, paste THIS whole file, Save.
 *   3. Deploy → New deployment → type "Web app".
 *        - Description: ViralFood leads
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      Click Deploy, authorize when prompted, copy the Web app URL
 *      (ends in /exec) and paste it into config.js → window.LEAD_ENDPOINT.
 *   4. Done. Re-deploy (Manage deployments → edit → new version) whenever
 *      you change this code.
 *
 * TIP: If info@chinagliafederico.com is a Google Workspace mailbox, create
 * the Sheet + script while signed in as that account so the notification
 * email is sent from your own domain.
 *****************************************************************/

var NOTIFY_EMAIL = 'info@chinagliafederico.com';
var SHEET_NAME   = 'Leads';

// Column order for the Sheet. Add/remove keys here if your forms change.
var COLUMNS = [
  { header: 'Timestamp',     key: '_timestamp' },
  { header: 'Form type',     key: 'formType'   },
  { header: 'Name',          key: 'name'       },
  { header: 'Email',         key: 'email'      },
  { header: 'Property type', key: 'property'   },
  { header: 'Rooms / units', key: 'rooms'      },
  { header: 'Message',       key: 'message'    },
  { header: 'Page URL',      key: 'pageUrl'    },
  { header: 'Raw data',      key: '_raw'       }
];

function doPost(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var now = new Date();

    // ---------- 1) Append to Google Sheet ----------
    var sheet = getOrCreateSheet_();
    var row = COLUMNS.map(function (c) {
      if (c.key === '_timestamp') return now;
      if (c.key === '_raw')       return JSON.stringify(params);
      return params[c.key] || '';
    });
    sheet.appendRow(row);

    // ---------- 2) Email notification ----------
    sendNotification_(params, now);

    return json_({ ok: true });
  } catch (err) {
    // Best-effort: still try to alert by email if the sheet step failed.
    try { MailApp.sendEmail(NOTIFY_EMAIL, 'Lead capture ERROR', String(err)); } catch (_) {}
    return json_({ ok: false, error: String(err) });
  }
}

// Health check — visiting the URL in a browser shows this text.
function doGet() {
  return ContentService.createTextOutput('ViralFood lead endpoint is live.');
}

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS.map(function (c) { return c.header; }));
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sendNotification_(params, now) {
  var formType = params.formType || 'form';
  var name     = params.name || 'Unknown';

  // Human-readable list of every submitted field.
  var skip = { submittedAt: true };
  var rows = '';
  Object.keys(params).forEach(function (k) {
    if (skip[k]) return;
    rows += '<tr><td style="padding:6px 14px 6px 0;color:#667;white-space:nowrap;vertical-align:top">'
          + escape_(label_(k)) + '</td><td style="padding:6px 0;color:#111">'
          + escape_(String(params[k])).replace(/\n/g, '<br>') + '</td></tr>';
  });

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">' +
      '<h2 style="margin:0 0 4px;color:#0a6ba0">New lead — ' + escape_(formType) + '</h2>' +
      '<p style="margin:0 0 16px;color:#667;font-size:13px">Received ' + now.toLocaleString() + '</p>' +
      '<table style="border-collapse:collapse;font-size:14px">' + rows + '</table>' +
      '<p style="margin:18px 0 0;color:#99a;font-size:12px">Hotel Booking Automation — viralfood.it</p>' +
    '</div>';

  var plain = Object.keys(params).map(function (k) {
    return label_(k) + ': ' + params[k];
  }).join('\n');

  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: 'New lead — ' + formType + ' — ' + name,
    replyTo: params.email || NOTIFY_EMAIL,
    body: plain,
    htmlBody: html
  });
}

function label_(k) {
  var map = {
    name: 'Name', email: 'Email', property: 'Property type',
    rooms: 'Rooms / units', message: 'Message', formType: 'Form type',
    pageUrl: 'Page URL', submittedAt: 'Submitted at'
  };
  return map[k] || k;
}

function escape_(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
