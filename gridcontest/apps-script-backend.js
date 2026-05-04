// Grid Contest Backend
// Receives contest entries, logs to sheet, picks random winners

const SHEET_ID  = '13eLKTfstCzXpgDzWKOHq7xk04D-XcMCgRrLOLUfuSXs';
const ENTRIES_TAB = 'Entries';
const WINNERS_TAB = 'Winners';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    const name    = (data.name || '').trim();
    const email   = (data.email || '').trim();
    const phone   = (data.phone || '').trim();
    const address = (data.address || '').trim();
    const city    = (data.city || '').trim();
    const state   = (data.state || '').trim();
    const zip     = (data.zip || '').trim();
    const country = (data.country || 'US').trim();
    const prize   = (data.prize || '').trim();
    
    if (!name || !email) {
      return jsonResponse(400, {error: 'Please fill in your name and email.'});
    }
    
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(ENTRIES_TAB);
    const lastRow = sheet.getLastRow();
    const entryNum = lastRow <= 1 ? 1 : lastRow; // row 1 is header
    
    const timestamp = Utilities.formatDate(new Date(), 'America/New_York', 'MM/dd/yyyy hh:mm:ss a');
    
    // Check for duplicate email
    if (lastRow > 1) {
      const emails = sheet.getRange(2, 4, lastRow - 1, 1).getValues().flat();
      if (emails.some(e => e.toString().toLowerCase() === email.toLowerCase())) {
        lock.releaseLock();
        return jsonResponse(400, {error: 'This email has already been entered. One entry per person!'});
      }
    }
    
    sheet.appendRow([
      entryNum,
      timestamp,
      name,
      email,
      phone,
      address,
      city,
      state,
      zip,
      country,
      prize,
      ''
    ]);
    
    lock.releaseLock();

    try {
      sendConfirmationEmail(email, name, entryNum, prize);
    } catch (emailErr) {
      Logger.log('Confirmation email failed: ' + emailErr.message);
    }
    
    return jsonResponse(200, {
      success: true,
      entry: entryNum,
      message: "You're in! Good luck, and don't forget to watch the show to see if you win!"
    });
    
  } catch (err) {
    Logger.log('POST Error: ' + err.toString() + '\nStack: ' + err.stack);
    return jsonResponse(500, {error: 'Server error: ' + err.message});
  }
}

function doGet(e) {
  // Check for action parameter (for winner picking)
  const action = e && e.parameter ? e.parameter.action : null;
  
  if (action === 'pickWinner') {
    return pickRandomWinner();
  }
  
  if (action === 'stats') {
    return getStats();
  }
  
  return jsonResponse(200, {status: 'Grid Contest Backend is running.'});
}

function pickRandomWinner() {
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const entriesSheet = ss.getSheetByName(ENTRIES_TAB);
    const winnersSheet = ss.getSheetByName(WINNERS_TAB);
    
    const lastRow = entriesSheet.getLastRow();
    if (lastRow <= 1) {
      lock.releaseLock();
      return jsonResponse(200, {error: 'No entries yet!'});
    }
    
    // Get all entries, find ones not already winners
    const allData = entriesSheet.getRange(2, 1, lastRow - 1, 12).getValues();
    const eligible = allData.filter(row => row[11] !== 'WINNER');
    
    if (eligible.length === 0) {
      lock.releaseLock();
      return jsonResponse(200, {error: 'All entries have already won! No eligible entries remaining.'});
    }
    
    // Pick random
    const winnerIdx = Math.floor(Math.random() * eligible.length);
    const winner = eligible[winnerIdx];
    
    // Mark as winner in entries sheet
    const entryNum = winner[0];
    for (let r = 2; r <= lastRow; r++) {
      if (entriesSheet.getRange(r, 1).getValue() == entryNum) {
        entriesSheet.getRange(r, 12).setValue('WINNER');
        break;
      }
    }
    
    // Log to winners sheet
    const drawNum = winnersSheet.getLastRow();
    const timestamp = Utilities.formatDate(new Date(), 'America/New_York', 'MM/dd/yyyy hh:mm:ss a');
    const fullAddress = [winner[5], winner[6], winner[7], winner[8], winner[9]].filter(Boolean).join(', ');
    
    winnersSheet.appendRow([
      drawNum,
      timestamp,
      entryNum,
      winner[2], // name
      winner[3], // email
      winner[4], // phone
      fullAddress,
      winner[10] // prize requested
    ]);
    
    lock.releaseLock();

    try {
      sendConfirmationEmail(email, name, entryNum, prize);
    } catch (emailErr) {
      Logger.log('Confirmation email failed: ' + emailErr.message);
    }
    
    return jsonResponse(200, {
      success: true,
      winner: {
        entryNumber: entryNum,
        name: winner[2],
        email: winner[3],
        phone: winner[4],
        prize: winner[10]
      },
      totalEntries: allData.length,
      remainingEligible: eligible.length - 1
    });
    
  } catch (err) {
    Logger.log('Pick Winner Error: ' + err.toString());
    return jsonResponse(500, {error: 'Error picking winner: ' + err.message});
  }
}

function getStats() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const entriesSheet = ss.getSheetByName(ENTRIES_TAB);
    const winnersSheet = ss.getSheetByName(WINNERS_TAB);
    
    const totalEntries = Math.max(0, entriesSheet.getLastRow() - 1);
    const totalWinners = Math.max(0, winnersSheet.getLastRow() - 1);
    
    return jsonResponse(200, {
      totalEntries: totalEntries,
      totalWinners: totalWinners,
      remainingEligible: totalEntries - totalWinners
    });
  } catch (err) {
    return jsonResponse(500, {error: err.message});
  }
}

function jsonResponse(code, obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function testSetup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const entries = ss.getSheetByName(ENTRIES_TAB);
  const winners = ss.getSheetByName(WINNERS_TAB);
  Logger.log('Entries sheet OK: ' + entries.getLastRow() + ' rows');
  Logger.log('Winners sheet OK: ' + winners.getLastRow() + ' rows');
  Logger.log('Setup verified!');
}

function sendConfirmationEmail(email, name, entryNumber, prize) {
  const subject = 'The Grid — Contest Entry Received';
  const body = 'Hi ' + name + ',\n\n'
    + 'Thanks for entering The Grid contest. Your entry number is ' + entryNumber + '.\n\n'
    + 'You\'re in! Good luck, and don\'t forget to watch the show to see if you win.\n\n'
    + (prize ? 'Prize selected: ' + prize + '\n\n' : '')
    + 'If you have any questions, just reply to this email and Erik will get it at ekuna@kelbyone.com.\n\n'
    + 'Good luck!\n'
    + '— The Grid Team';

  const htmlBody = buildKelbyOneEmailHtml(
    'The Grid',
    'Contest entry received',
    'Hi ' + escapeHtml(name) + ',',
    [
      'Thanks for entering <strong>The Grid contest</strong>. Your entry number is <strong>' + entryNumber + '</strong>.',
      'You\'re in! Good luck, and don\'t forget to watch the show to see if you win.' + (prize ? '<br><br><strong>Prize selected:</strong> ' + escapeHtml(prize) : ''),
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
