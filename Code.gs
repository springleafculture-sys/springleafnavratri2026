/**
 * Spring Leaf Navratri 2026 – Registration backend
 * Google Apps Script Web App (bound to a Google Sheet)
 *
 * Creates/uses sheets: Registrations, Volunteers, Dashboard
 * Receives JSON (sent as text/plain to avoid CORS preflight) via POST.
 */

var EVENT_PREFIX = 'SLN26';

var REG_HEADERS = [
  'Timestamp', 'Registration ID', 'Name', 'Flat / Wing', 'Mobile Number', 'Email',
  'Age Group', 'Gender', 'Interested Activities', 'Selected Day', 'Participation Type',
  'Performance Category', 'Performance Name', 'Number of Participants',
  'Additional Participants', 'Special Requirements', 'Consent', 'Submission Key'
];

var VOL_HEADERS = [
  'Timestamp', 'Volunteer ID', 'Name', 'Flat / Wing', 'Mobile Number', 'Email',
  'Age Group', 'Volunteer Areas', 'Availability', 'Skills / Experience', 'Comments',
  'Submission Key'
];

var DAY_LABELS = [
  'Day 1 – Kids Got Talent',
  'Day 2 – Teens & Adults Got Talent',
  'Day 3 – Youth Fusion Night',
  'Day 4 – Traditional Costume Day',
  'Day 5 – Learn Garba & Dandiya',
  'Day 6 – Shakti Women’s Night',
  'Day 7 – Bollywood Garba Night',
  'Day 8 – Traditional Garba & Dandiya Night',
  'Day 9 – Grand Finale'
];

var PART_TYPES = ['Individual', 'Couple', 'Group', 'Fashion Walk', 'Stall',
                  'Garba', 'Dandiya', 'Both'];

var VOL_AREAS = ['Event Management', 'Stage Management', 'Sound / Music', 'Decoration',
  'Photography / Video', 'Registration Desk', 'Crowd Management', 'Kids Activities',
  'Garba / Dandiya Coordination', 'Women Entrepreneur Night', 'Sponsorship',
  'Food / Stall Coordination', 'Social Media', 'Design / Creative', 'General Volunteer', 'Other'];

/* ------------------------------------------------------------------ */
/* Web app entry points                                                */
/* ------------------------------------------------------------------ */

function doGet() {
  return json_({ success: true, message: 'Spring Leaf Navratri 2026 API is running.' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (err) {
    return json_({ success: false, message: 'Server is busy. Please try again in a moment.' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ success: false, message: 'Empty request.' });
    }
    var data = JSON.parse(e.postData.contents);

    // Spam protection: honeypot field filled by bots -> pretend success, store nothing.
    if (data.website) {
      return json_({ success: true, registrationId: EVENT_PREFIX + '-00000', message: 'Registration successful' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheets_(ss);

    if (data.type === 'registration') return json_(handleRegistration_(ss, data));
    if (data.type === 'volunteer')    return json_(handleVolunteer_(ss, data));
    return json_({ success: false, message: 'Unknown submission type.' });

  } catch (err) {
    console.error(err);
    return json_({ success: false, message: 'Something went wrong on the server. Please try again.' });
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

function handleRegistration_(ss, d) {
  var err = validateCommon_(d);
  if (err) return { success: false, message: err };
  if (!d.entries || !d.entries.length) return { success: false, message: 'No activity selected.' };
  if (!d.consent) return { success: false, message: 'Consent is required.' };

  var sheet = ss.getSheetByName('Registrations');
  var key = clean_(d.submissionId, 60);

  // Idempotency: if this exact submission was already saved, return the same ID.
  var existing = findByKey_(sheet, key, REG_HEADERS.length, 2);
  if (existing) return { success: true, registrationId: existing, message: 'Registration successful' };

  var id = nextId_('REG', EVENT_PREFIX + '-', 5);
  var now = new Date();
  var activities = (d.activities || []).map(function (a) { return clean_(a, 80); }).join(', ');

  var rows = d.entries.map(function (en) {
    return [
      now, id, clean_(d.name, 80), clean_(d.flat, 30), clean_(d.mobile, 20), clean_(d.email, 100),
      clean_(d.ageGroup, 30), clean_(d.gender, 30), activities,
      clean_(en.day, 80), clean_(en.participationType, 40), clean_(en.category, 80),
      clean_(en.performanceName, 100), en.count ? Number(en.count) : '',
      clean_(en.additional, 400), clean_(en.special, 600), 'Yes', key
    ];
  });

  // Volunteer-only choice inside the participate form is handled client-side (opens volunteer form).
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, REG_HEADERS.length).setValues(rows);
  return { success: true, registrationId: id, message: 'Registration successful' };
}

function handleVolunteer_(ss, d) {
  var err = validateCommon_(d, true);
  if (err) return { success: false, message: err };
  if (!d.areas || !d.areas.length) return { success: false, message: 'Please select at least one area.' };

  var sheet = ss.getSheetByName('Volunteers');
  var key = clean_(d.submissionId, 60);

  var existing = findByKey_(sheet, key, VOL_HEADERS.length, 2);
  if (existing) return { success: true, registrationId: existing, message: 'Registration successful' };

  var id = nextId_('VOL', EVENT_PREFIX + '-V', 4);
  var row = [
    new Date(), id, clean_(d.name, 80), clean_(d.flat, 30), clean_(d.mobile, 20), clean_(d.email, 100),
    clean_(d.ageGroup, 30),
    d.areas.map(function (a) { return clean_(a, 60); }).join(', '),
    clean_(d.availability, 120), clean_(d.skills, 500), clean_(d.comments, 500), key
  ];
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, VOL_HEADERS.length).setValues([row]);
  return { success: true, registrationId: id, message: 'Registration successful' };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function validateCommon_(d) {
  if (!d.name || !String(d.name).trim()) return 'Name is required.';
  if (!d.flat || !String(d.flat).trim()) return 'Flat / Wing is required.';
  if (!/^\+91[6-9]\d{9}$/.test(String(d.mobile || ''))) return 'Please enter a valid Indian mobile number.';
  return '';
}

/** Trim, cap length, and neutralise spreadsheet formula injection. */
function clean_(v, max) {
  if (v === null || v === undefined) return '';
  var s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  if (max && s.length > max) s = s.substring(0, max);
  if (/^[=+\-@]/.test(s) && !/^\+91\d{10}$/.test(s)) s = "'" + s;
  return s;
}

/** Sequential IDs, safe under the script lock. */
function nextId_(counterName, prefix, pad) {
  var props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty('counter_' + counterName) || 0) + 1;
  props.setProperty('counter_' + counterName, String(n));
  var s = String(n);
  while (s.length < pad) s = '0' + s;
  return prefix + s;
}

/** Looks in the last column (Submission Key) for a previous submission; returns its ID or ''. */
function findByKey_(sheet, key, lastCol, idCol) {
  if (!key) return '';
  var last = sheet.getLastRow();
  if (last < 2) return '';
  var keys = sheet.getRange(2, lastCol, last - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (keys[i][0] === key) return String(sheet.getRange(i + 2, idCol).getValue());
  }
  return '';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Sheet setup                                                         */
/* ------------------------------------------------------------------ */

function ensureSheets_(ss) {
  var reg = ss.getSheetByName('Registrations');
  if (!reg) {
    reg = ss.insertSheet('Registrations');
    reg.getRange(1, 1, 1, REG_HEADERS.length).setValues([REG_HEADERS]);
    styleHeader_(reg, REG_HEADERS.length);
    reg.getRange('E:E').setNumberFormat('@');           // mobile as plain text
    reg.getRange('A:A').setNumberFormat('dd-mmm-yyyy hh:mm');
    reg.setColumnWidth(REG_HEADERS.length, 60);
  }
  var vol = ss.getSheetByName('Volunteers');
  if (!vol) {
    vol = ss.insertSheet('Volunteers');
    vol.getRange(1, 1, 1, VOL_HEADERS.length).setValues([VOL_HEADERS]);
    styleHeader_(vol, VOL_HEADERS.length);
    vol.getRange('E:E').setNumberFormat('@');
    vol.getRange('A:A').setNumberFormat('dd-mmm-yyyy hh:mm');
  }
  if (!ss.getSheetByName('Dashboard')) buildDashboard_(ss);
}

function styleHeader_(sheet, cols) {
  sheet.getRange(1, 1, 1, cols).setFontWeight('bold').setBackground('#7a1f2b').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

function buildDashboard_(ss) {
  var sh = ss.insertSheet('Dashboard');
  var r = 1;
  sh.getRange(r, 1).setValue('Spring Leaf Navratri 2026 – Dashboard').setFontSize(16).setFontWeight('bold');
  r += 2;

  sh.getRange(r, 1, 1, 2).setValues([['Total registrations (unique people)', '=IFERROR(COUNTA(UNIQUE(FILTER(Registrations!B2:B,Registrations!B2:B<>""))),0)']]);
  r++;
  sh.getRange(r, 1, 1, 2).setValues([['Total volunteers', '=COUNTA(Volunteers!B2:B)']]);
  r += 2;

  sh.getRange(r, 1, 1, 2).setValues([['Registrations by day / activity', 'Count']]).setFontWeight('bold').setBackground('#f3e2b3');
  r++;
  DAY_LABELS.forEach(function (label) {
    sh.getRange(r, 1, 1, 2).setValues([[label, '=COUNTIF(Registrations!J2:J,A' + r + ')']]);
    r++;
  });
  r++;

  sh.getRange(r, 1, 1, 2).setValues([['Participation categories', 'Count']]).setFontWeight('bold').setBackground('#f3e2b3');
  r++;
  PART_TYPES.forEach(function (t) {
    sh.getRange(r, 1, 1, 2).setValues([[t, '=COUNTIF(Registrations!K2:K,A' + r + ')']]);
    r++;
  });
  r++;

  sh.getRange(r, 1, 1, 2).setValues([['Volunteers by area', 'Count']]).setFontWeight('bold').setBackground('#f3e2b3');
  r++;
  VOL_AREAS.forEach(function (a) {
    sh.getRange(r, 1, 1, 2).setValues([[a, '=COUNTIF(Volunteers!H2:H,"*"&A' + r + '&"*")']]);
    r++;
  });

  sh.setColumnWidth(1, 330);
  sh.setColumnWidth(2, 110);
}

/** Optional: run once from the editor to create all sheets and authorise the script. */
function setup() {
  ensureSheets_(SpreadsheetApp.getActiveSpreadsheet());
}
