/**
 * KelbyOne Summit Photo Share — Google Apps Script Backend
 *
 * SETUP:
 * 1. Create a Google Drive folder for Summit submissions
 * 2. Create a Google Sheet for submission logging
 * 3. Paste this file into a new Google Apps Script project as Code.gs
 * 4. Replace FOLDER_ID and SHEET_ID below
 * 5. Run testSetup()
 * 6. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 7. Paste the deployment URL into summit/index.html ENDPOINT
 */

var FOLDER_ID = '1FGbXbidrqCbzXycPd1lFpC60nbx_weR1';
var SHEET_ID  = '1QkDO-DdQhVjg9ajTBL6GOPZdhNapfj-P-StQWj7MBkg';
var MAX_FILES = 10;

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    var name = payload.name || '';
    var email = payload.email || '';
    var phone = payload.phone || '';
    var notes = payload.notes || '';
    var instagram = payload.instagram || '';
    var twitter = payload.twitter || '';
    var facebook = payload.facebook || '';
    var permission = !!payload.permission;
    var images = payload.images || [];
    var timestamp = new Date();

    if (!name || !email) throw new Error('Name and email are required.');
    if (!permission) throw new Error('Permission checkbox is required.');
    if (!images.length) throw new Error('At least one image is required.');
    if (images.length > MAX_FILES) throw new Error('Too many files uploaded.');

    var folder = DriveApp.getFolderById(FOLDER_ID);
    var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp', 'Name', 'Email', 'Phone', 'Instagram', 'X / Twitter', 'Facebook', 'Permission Granted', 'Notes',
        'Submission Folder URL', 'File Count', 'File #', 'Filename', 'Image Title', 'Description', 'File URL'
      ]);
      sheet.getRange(1, 1, 1, 16).setFontWeight('bold');
    }

    var safeEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '_');
    var submissionFolder = folder.createFolder(
      formatTimestamp(timestamp) + ' — ' + name + ' (' + safeEmail + ')'
    );

    var folderUrl = submissionFolder.getUrl();

    images.forEach(function(img, index) {
      var result = saveFile(submissionFolder, img.data, img.filename || ('image-' + (index + 1) + '.jpg'));
      sheet.appendRow([
        timestamp,
        name,
        email,
        phone,
        instagram,
        twitter,
        facebook,
        permission ? 'Yes' : 'No',
        notes,
        folderUrl,
        images.length,
        index + 1,
        img.filename || '',
        img.title || '',
        img.description || '',
        result.url
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
      service: 'KelbyOne Summit Photo Share',
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
  var subject = 'KelbyOne Summit — Photos Received';
  var body = 'Hi ' + name + ',\n\n'
    + 'Thanks for sharing your Summit photos with us. We received ' + count + ' image' + (count === 1 ? '' : 's') + '.\n\n'
    + 'We appreciate you giving us permission to share them with the group, models, and locations, to consider them for a member gallery of the best work, and to use them to promote the event and your work with proper credit.\n\n'
    + 'Thanks again,\n'
    + 'KelbyOne';

  MailApp.sendEmail(email, subject, body);
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
