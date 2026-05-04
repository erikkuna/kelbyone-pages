/**
 * KelbyOne Magazine Submissions — Google Apps Script Backend
 *
 * SETUP:
 * 1. Drive folder + Sheet are already created (IDs below)
 * 2. Paste this file into a new Google Apps Script project as Code.gs
 * 3. Run testSetup() once to verify access (you'll be asked to authorize)
 * 4. Deploy → New deployment → Type: Web app
 *      Execute as: Me
 *      Who has access: Anyone
 * 5. Copy the deployment URL into magazine/index.html ENDPOINT
 */

var FOLDER_ID = '1e7fo36D9E28O01IZEKHvRYFswTprQTcH';
var SHEET_ID  = '1ndbTYrTJ_DxaipsglNZEOKufuvSf5ddSKNJlU-A_Odo';
var MAX_FILES = 5;

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    var name = payload.name || '';
    var email = payload.email || '';
    var location = payload.location || '';
    var social = payload.social || '';
    var permission = !!payload.permission;
    var images = payload.images || [];
    var headshot = payload.headshot || null;
    var timestamp = new Date();

    if (!name || !email) throw new Error('Name and email are required.');
    if (!location) throw new Error('Location is required.');
    if (!permission) throw new Error('Permission checkbox is required.');
    if (!images.length) throw new Error('At least one image is required.');
    if (images.length > MAX_FILES) throw new Error('Too many files uploaded. Max is ' + MAX_FILES + '.');
    if (!headshot || !headshot.data) throw new Error('Headshot is required.');

    var folder = DriveApp.getFolderById(FOLDER_ID);
    var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp', 'Name', 'Email', 'Location', 'Social / Website',
        'Permission Granted', 'Submission Folder URL', 'File Count',
        'File #', 'Filename', 'Image Title', 'Description', 'File URL',
        'Headshot Filename', 'Headshot URL'
      ]);
      sheet.getRange(1, 1, 1, 15).setFontWeight('bold');
    }

    var safeEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '_');
    var submissionFolder = folder.createFolder(
      formatTimestamp(timestamp) + ' — ' + name + ' (' + safeEmail + ')'
    );

    var folderUrl = submissionFolder.getUrl();

    var headshotFilename = buildHeadshotFilename(headshot.filename || 'headshot.jpg', name, location);
    var headshotResult = saveFile(submissionFolder, headshot.data, headshotFilename);

    images.forEach(function(img, index) {
      var result = saveFile(submissionFolder, img.data, img.filename || ('image-' + (index + 1) + '.jpg'));
      sheet.appendRow([
        timestamp,
        name,
        email,
        location,
        social,
        permission ? 'Yes' : 'No',
        folderUrl,
        images.length,
        index + 1,
        img.filename || '',
        img.title || '',
        img.description || '',
        result.url,
        headshotFilename,
        headshotResult.url
      ]);
    });

    try {
      sendConfirmationEmail(email, name, images.length);
    } catch (emailErr) {
      Logger.log('Confirmation email failed: ' + emailErr.message);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Submission received' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error processing submission: ' + error.message);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      service: 'KelbyOne Magazine Submissions',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function saveFile(folder, dataUrl, filename) {
  var parts = dataUrl.split(',');
  var mimeMatch = parts[0].match(/data:(.*?);/);
  var mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  var base64Data = parts[1];

  var blob = Utilities.newBlob(
    Utilities.base64Decode(base64Data),
    mimeType,
    filename
  );

  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    url: file.getUrl(),
    fileId: file.getId()
  };
}

function sendConfirmationEmail(email, name, count) {
  var subject = 'KelbyOne Magazine — Submission Received';
  var imageWord = 'image' + (count === 1 ? '' : 's');
  var body = 'Hi ' + name + ',\n\n'
    + 'Thanks for submitting your work to KelbyOne Magazine. We received ' + count + ' ' + imageWord + '.\n\n'
    + 'Our team will review submissions for upcoming issues. If your work is selected, we\'ll reach out directly. Either way, thanks for sharing your photography with us — credit will always be given to the photographer.\n\n'
    + 'If you have any questions, just reply to this email and Erik will get it at ekuna@kelbyone.com.\n\n'
    + 'Thanks again,\n'
    + 'KelbyOne';

  var htmlBody = buildKelbyOneEmailHtml(
    'Magazine',
    'Submission received',
    'Hi ' + escapeHtml(name) + ',',
    [
      'Thanks for submitting your work to <strong>KelbyOne Magazine</strong>. We received <strong>' + count + ' ' + imageWord + '</strong>.',
      'Our team will review submissions for upcoming issues. If your work is selected, we\'ll reach out directly. Either way, thanks for sharing your photography with us — credit will always be given to the photographer.',
      'If you have any questions, just reply to this email and Erik will get it at <a href="mailto:ekuna@kelbyone.com" style="color:#d6a34a;font-weight:700;">ekuna@kelbyone.com</a>.'
    ],
    'Thanks again,<br><strong>KelbyOne</strong>'
  );

  MailApp.sendEmail({
    to: email,
    subject: subject,
    body: body,
    htmlBody: htmlBody,
    name: 'KelbyOne Magazine',
    replyTo: 'ekuna@kelbyone.com'
  });
}

function buildKelbyOneEmailHtml(kicker, title, greeting, paragraphs, signoff) {
  var body = paragraphs.map(function(p) {
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

function buildHeadshotFilename(originalName, name, location) {
  var dotIndex = originalName.lastIndexOf('.');
  var base = dotIndex > 0 ? originalName.substring(0, dotIndex) : originalName;
  var ext  = dotIndex > 0 ? originalName.substring(dotIndex) : '';
  var safeName = sanitizeForFilename(name);
  var safeLocation = sanitizeForFilename(location);
  return base + '_' + safeName + '_' + safeLocation + ext;
}

function sanitizeForFilename(value) {
  return String(value || '')
    .replace(/[\/\\:*?"<>|]/g, '')
    .replace(/[,]+/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function formatTimestamp(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  var h = String(date.getHours()).padStart(2, '0');
  var min = String(date.getMinutes()).padStart(2, '0');
  return y + '-' + m + '-' + d + ' ' + h + ':' + min;
}

function testSetup() {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log('✓ Drive folder found: ' + folder.getName());
  } catch (err) {
    Logger.log('✗ Drive folder error: ' + err.message);
  }

  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID);
    Logger.log('✓ Sheet found: ' + sheet.getName());
  } catch (err) {
    Logger.log('✗ Sheet error: ' + err.message);
  }
}
