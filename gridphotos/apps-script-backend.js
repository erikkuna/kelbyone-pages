// Grid BPC Backend v3
// Receives photo submissions, creates blind numbered folders, logs to sheet

const FOLDER_ID = '1N8E07SQphGcE-8xtbPzTgDTFbRpYwtyv';
const SHEET_ID  = '1W4DSgWfaoMPcp_BITLmvC1e93moTfGXzCTpCtcVzsNY';
const SHEET_TAB = 'Submissions';

function doPost(e) {
  let subFolder = null;
  try {
    const data = JSON.parse(e.postData.contents);
    
    const name   = (data.name || '').trim();
    const email  = (data.email || '').trim();
    const phone  = (data.phone || '').trim();
    const images = data.images || [];
    
    if (!name || !email || images.length < 3) {
      return jsonResponse(400, {error: 'Name, email, and 3 photos are required.'});
    }
    
    // Get next submission number using lock to prevent race conditions
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_TAB);
    const lastRow = sheet.getLastRow();
    let subNum = 1;
    if (lastRow > 1) {
      const lastVal = sheet.getRange(lastRow, 1).getValue();
      const parsed = parseInt(lastVal, 10);
      subNum = isNaN(parsed) ? lastRow : parsed + 1;
    }
    const folderName = padNumber(subNum, 3);
    
    // Create blind numbered folder
    const parentFolder = DriveApp.getFolderById(FOLDER_ID);
    subFolder = parentFolder.createFolder(folderName);
    
    // Save images one at a time to manage memory
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      // Strip data URL prefix if present
      let b64 = img.data;
      if (b64.indexOf(',') > -1) {
        b64 = b64.split(',')[1];
      }
      
      const mimeType = img.mimeType || 'image/jpeg';
      const ext = getExtension(mimeType);
      const decoded = Utilities.base64Decode(b64);
      const blob = Utilities.newBlob(decoded, mimeType, (i + 1) + ext);
      subFolder.createFile(blob);
    }
    
    // Make folder viewable via link
    subFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const folderUrl = subFolder.getUrl();
    
    // Log to sheet
    const timestamp = Utilities.formatDate(new Date(), 'America/New_York', 'MM/dd/yyyy hh:mm:ss a');
    
    sheet.appendRow([
      subNum,
      timestamp,
      name,
      email,
      phone,
      folderUrl,
      images[0] ? (images[0].description || '') : '',
      images[1] ? (images[1].description || '') : '',
      images[2] ? (images[2].description || '') : ''
    ]);
    
    lock.releaseLock();

    try {
      sendConfirmationEmail(email, name, folderName);
    } catch (emailErr) {
      Logger.log('Confirmation email failed: ' + emailErr.message);
    }
    
    return jsonResponse(200, {
      success: true,
      submission: folderName,
      message: 'Submission received! Good luck on the show.'
    });
    
  } catch (err) {
    Logger.log('POST Error: ' + err.toString() + '\nStack: ' + err.stack);
    // Clean up empty folder if created but errored
    if (subFolder) {
      try { subFolder.setTrashed(true); } catch(e2) {}
    }
    return jsonResponse(500, {error: 'Upload error: ' + err.message});
  }
}

function doGet(e) {
  return jsonResponse(200, {status: 'Grid BPC Backend is running.', version: 3});
}

function padNumber(num, len) {
  let s = String(num);
  while (s.length < len) s = '0' + s;
  return s;
}

function getExtension(mimeType) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif'
  };
  return map[mimeType] || '.jpg';
}

function jsonResponse(code, obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function testSetup() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  Logger.log('Folder OK: ' + folder.getName());
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_TAB);
  Logger.log('Sheet OK: ' + sheet.getName() + ' (' + sheet.getLastRow() + ' rows)');
  Logger.log('Setup verified!');
}

// Cleanup function: remove empty test folders
function cleanupEmptyFolders() {
  const parent = DriveApp.getFolderById(FOLDER_ID);
  const folders = parent.getFolders();
  let removed = 0;
  while (folders.hasNext()) {
    const f = folders.next();
    if (f.getFiles().hasNext() === false) {
      f.setTrashed(true);
      removed++;
      Logger.log('Trashed empty folder: ' + f.getName());
    }
  }
  Logger.log('Cleaned up ' + removed + ' empty folders.');
}

function sendConfirmationEmail(email, name, submissionNumber) {
  const subject = 'The Grid — Blind Photo Critique Submission Received';
  const body = 'Hi ' + name + ',\n\n'
    + 'Thanks for submitting your photos for Blind Photo Critiques on The Grid. Your submission number is ' + submissionNumber + '.\n\n'
    + 'Your images have been received and are in the queue for consideration on an upcoming show.\n\n'
    + 'If you have any questions, just reply to this email and Erik will get it at ekuna@kelbyone.com.\n\n'
    + 'Good luck!\n'
    + '— The Grid Team';

  const htmlBody = buildKelbyOneEmailHtml(
    'The Grid',
    'Blind Photo Critique submission received',
    'Hi ' + escapeHtml(name) + ',',
    [
      'Thanks for submitting your photos for <strong>Blind Photo Critiques</strong> on The Grid. Your submission number is <strong>' + submissionNumber + '</strong>.',
      'Your images have been received and are in the queue for consideration on an upcoming show.',
      'If you have any questions, just reply to this email and Erik will get it at <a href="mailto:ekuna@kelbyone.com" style="color:#d6a34a;font-weight:700;">ekuna@kelbyone.com</a>.'
    ],
    'Good luck,<br><strong>The Grid Team</strong>'
  );

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    name: 'KelbyOne',
    replyTo: 'ekuna@kelbyone.com'
  });
}

function buildKelbyOneEmailHtml(kicker, title, greeting, paragraphs, signoff) {
  const body = paragraphs.map(function(p) {
    return '<p style="margin:0 0 16px;font-size:16px;line-height:1.55;">' + p + '</p>';
  }).join('');

  return '<div style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#222;">'
    + '<div style="max-width:620px;margin:0 auto;padding:28px 18px;">'
    + '<div style="background:#111;border-radius:16px 16px 0 0;padding:26px 28px;color:#fff;">'
    + '<div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#d6a34a;font-weight:700;">KelbyOne · ' + kicker + '</div>'
    + '<h1 style="margin:8px 0 0;font-size:26px;line-height:1.2;color:#fff;">' + title + '</h1>'
    + '</div>'
    + '<div style="background:#fff;border:1px solid #e7e7e7;border-top:0;border-radius:0 0 16px 16px;padding:28px;">'
    + '<p style="margin:0 0 16px;font-size:16px;line-height:1.55;">' + greeting + '</p>'
    + body
    + '<p style="margin:0;font-size:16px;line-height:1.55;">' + signoff + '</p>'
    + '</div>'
    + '</div>'
    + '</div>';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
