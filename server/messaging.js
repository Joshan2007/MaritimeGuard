require('dotenv').config();
const { db } = require('./db');
let twilioClient = null;

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (accountSid && authToken && !accountSid.includes('your_') && !authToken.includes('your_')) {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(accountSid, authToken);
    } catch (err) {
      console.error('Failed to initialize Twilio client:', err.message);
      twilioClient = null;
    }
  } else {
    twilioClient = null;
  }
  return twilioClient;
}

// In-memory rate limiting map: key = `${boatId}_${recipientType}`, value = timestamp
const lastSentTimestamps = new Map();

function clearRateLimits() {
  lastSentTimestamps.clear();
}

/**
 * Validates and normalizes phone number to E.164 international format (+91...)
 */
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return null;
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  // Validate basic format: + followed by 10 to 15 digits
  if (/^\+[1-9]\d{9,14}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

/**
 * Checks system config if Real SMS is active
 */
function isRealSmsEnabled() {
  try {
    const row = db.prepare(`SELECT value FROM system_config WHERE key = 'real_sms_enabled'`).get();
    return row && row.value === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Returns setup status for Admin Panel
 */
function getMessagingStatus() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const keysConfigured = !!(accountSid && authToken && fromNumber && !accountSid.includes('your_'));
  const realSmsOn = isRealSmsEnabled();

  let lastResult = 'No messages sent yet.';
  try {
    const row = db.prepare(`SELECT value FROM system_config WHERE key = 'last_sms_sent_result'`).get();
    if (row && row.value) {
      lastResult = row.value;
    }
  } catch (e) {}

  return {
    keysConfigured,
    realSmsOn,
    lastResult
  };
}

/**
 * Sends emergency message according to specs
 * Inputs: boatId, boatName, recipientType ('family' | 'union'), recipientName, phoneNumber, messageText
 */
async function sendEmergencyMessage({ boatId, boatName, recipientType, recipientName, phoneNumber, messageText }) {
  const rateLimitKey = `${boatId}_${recipientType}`;
  const now = Date.now();
  const lastSent = lastSentTimestamps.get(rateLimitKey) || 0;

  // Rate limit: at most one real SMS per recipient per boat per 2 minutes (120,000 ms)
  const isRateLimited = (now - lastSent < 120000);

  const realEnabled = isRealSmsEnabled();
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const normalizedPhone = normalizePhoneNumber(phoneNumber) || phoneNumber;

  let status = 'Sent (mock)';
  let providerMessageId = null;
  let errorText = null;

  if (realEnabled && client && fromNumber) {
    if (isRateLimited) {
      // Don't send duplicate SMS during 2-minute safety window
      status = 'Skipped (Rate Limit)';
      errorText = 'Rate limit: 1 SMS per recipient per 2 minutes';
    } else {
      try {
        const twilioMsg = await client.messages.create({
          body: messageText,
          from: fromNumber,
          to: normalizedPhone
        });

        status = 'Sent (real)';
        providerMessageId = twilioMsg.sid;
        lastSentTimestamps.set(rateLimitKey, now);

        db.prepare(`UPDATE system_config SET value = ? WHERE key = 'last_sms_sent_result'`).run(
          `Twilio SID: ${twilioMsg.sid} (${status}) to ${normalizedPhone} at ${new Date().toLocaleTimeString()}`
        );

        // Async status check after 4 seconds
        setTimeout(async () => {
          try {
            const updated = await client.messages(twilioMsg.sid).fetch();
            let newStatus = 'Sent (real)';
            if (updated.status === 'delivered') newStatus = 'Delivered';
            else if (updated.status === 'undelivered') newStatus = 'Undelivered';
            else if (updated.status === 'failed') newStatus = 'Failed';

            db.prepare(`
              UPDATE messages 
              SET status = ?, error_text = ? 
              WHERE provider_message_id = ?
            `).run(newStatus, updated.errorMessage || null, twilioMsg.sid);
          } catch (fetchErr) {
            console.error('Twilio message status poll error:', fetchErr.message);
          }
        }, 4000);

      } catch (err) {
        status = 'Failed';
        errorText = err.message || 'Twilio send error';
        if (errorText.includes('Trial accounts can only use predefined SMS templates')) {
          errorText = 'Twilio Trial Account: Custom text requires upgraded Twilio or phone fallback button.';
        }
        db.prepare(`UPDATE system_config SET value = ? WHERE key = 'last_sms_sent_result'`).run(
          `Failed: ${errorText} to ${normalizedPhone}`
        );
      }
    }
  } else {
    // Mock Mode
    status = 'Sent (mock)';
    providerMessageId = 'MOCK_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    db.prepare(`UPDATE system_config SET value = ? WHERE key = 'last_sms_sent_result'`).run(
      `Mock SMS logged to ${recipientName} (${normalizedPhone})`
    );
  }

  // Always save in Messages table
  const info = db.prepare(`
    INSERT INTO messages (boat_id, boat_name, recipient_type, recipient_name, phone, message_text, channel, status, provider_message_id, error_text)
    VALUES (?, ?, ?, ?, ?, ?, 'SMS', ?, ?, ?)
  `).run(boatId, boatName, recipientType, recipientName, normalizedPhone, messageText, status, providerMessageId, errorText);

  return {
    id: info.lastInsertRowid,
    boatId,
    boatName,
    recipientType,
    recipientName,
    phone: normalizedPhone,
    status,
    providerMessageId,
    errorText,
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  sendEmergencyMessage,
  getMessagingStatus,
  normalizePhoneNumber,
  clearRateLimits,
  isRealSmsEnabled
};
