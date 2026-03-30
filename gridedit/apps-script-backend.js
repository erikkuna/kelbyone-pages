/**
 * The Grid: How Would I Edit Your Photo — Google Apps Script Backend
 *
 * SETUP:
 * 1. Create a new Google Apps Script project at https://script.google.com
 * 2. Paste this entire file as the Code.gs content
 * 3. Click Run > testSetup to verify the folder and sheet IDs work
 * 4. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 5. Copy the deployment URL into the gridedit/index.html ENDPOINT variable
 */

var FOLDER_ID = '1U3IQiyo2tPk6wMErxtftDqBfOqfyFdD3';
var SHEET_ID  = '1xDj7EF9LNhj0tQWBGY3FIkpXI-bSx--c2SKBPCBLod0';

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    var name      = payload.name || '';
    var email     = payload.email || '';
    var phone     = payload.phone || '';
    var editNotes = payload.editNotes || '';
    var imageData = payload.images || [];
    var timestamp = new Date();

    var folder = DriveApp.getFolderById(FOLDER_ID);
    var sheet  = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();

    // Ensure headers exist
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp', 'Name', 'Email', 'Phone',
        'File URL', 'Filename', 'Description', 'Edit Notes',
        'Status'
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    }

    // Create subfolder for this submission
    var safeEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '_');
    var submissionFolder = folder.createFolder(
      formatTimestamp(timestamp) + ' — ' + name + ' (' + safeEmail + ')'
    );

    // Process the image/file
    var fileUrl = '';
    var filename = '';
    var description = '';

    if (imageData.length > 0) {
      var img = imageData[0];
      var result = saveFile(submissionFolder, img.data, img.filename || 'photo.jpg');
      fileUrl = result.url;
      filename = img.filename || '';
      description = img.description || '';
    }

    // Log to sheet
    sheet.appendRow([
      timestamp,
      name,
      email,
      phone,
      fileUrl,
      filename,
      description,
      editNotes,
      'New'
    ]);

    // Send confirmation email
    try {
      sendConfirmationEmail(email, name);
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

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      service: 'The Grid: How Would I Edit Your Photo',
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

function formatTimestamp(date) {
  var y = date.getFullYear();
  var m = String(date.getMonth() + 1).padStart(2, '0');
  var d = String(date.getDate()).padStart(2, '0');
  var h = String(date.getHours()).padStart(2, '0');
  var min = String(date.getMinutes()).padStart(2, '0');
  return y + '-' + m + '-' + d + ' ' + h + ':' + min;
}

function sendConfirmationEmail(email, name) {
  var subject = 'The Grid — Edit Submission Received';
  var body = 'Hi ' + name + ',\n\n'
    + 'Thanks for submitting your photo to "How Would I Edit Your Photo" on The Grid!\n\n'
    + 'Your file has been received and is in the queue. Tune in Thursdays at 1 PM ET '
    + 'to see if yours gets picked for a live edit.\n\n'
    + 'Good luck!\n'
    + '— The Grid Team';

  MailApp.sendEmail(email, subject, body);
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
