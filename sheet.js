// sheets.js (CommonJS)
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

/**
 * Create an authenticated Sheets client using credentials in env:
 * GOOGLE_CREDENTIALS = the raw JSON of the service account (as a string)
 * SHEET_ID = your spreadsheet ID
 */
function getSheetsClient() {
  const raw = process.env.GOOGLE_CREDENTIALS;
  if (!raw) throw new Error("Missing GOOGLE_CREDENTIALS env var.");

  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch (e) {
    throw new Error("GOOGLE_CREDENTIALS is not valid JSON.");
  }

  const jwt = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    SCOPES
  );

  const sheets = google.sheets({ version: "v4", auth: jwt });
  return { sheets, spreadsheetId: process.env.SHEET_ID };
}

async function readSheet(sheetName, limit = 200) {
  const { sheets, spreadsheetId } = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`, // read all columns in that tab
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = res.data.values || [];
  if (rows.length === 0) return [];

  // Assume first row is header
  const header = rows[0];
  const data = rows.slice(1).map((r) => {
    const obj = {};
    header.forEach((h, i) => (obj[h] = r[i]));
    return obj;
  });

  return data.slice(0, limit);
}

async function appendRow(sheetName, rowObj) {
  const { sheets, spreadsheetId } = getSheetsClient();

  // Fetch header to keep columns consistent
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:Z1`,
  });

  const header = (headerRes.data.values && headerRes.data.values[0]) || [];

  // If no header yet, create a default one
  const columns =
    header.length > 0
      ? header
      : ["id", "category", "title", "content", "date"];

  // Build the row in header order
  const values = columns.map((c) => {
    if (c === "id") return Date.now();
    if (c === "date") return new Date().toISOString();
    return rowObj[c] ?? "";
  });

  // If header didn’t exist, set it first
  if (header.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [columns] },
    });
  }

  // Append the new row
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });

  return { ok: true };
}

module.exports = { readSheet, appendRow };
