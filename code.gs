/**
 * Level Tagger - Apps Script
 * - Titles in TITLE_COL (default A)
 * - Writes Level tags to OUTPUT_COL (default B)
 * - Exception rules first, then priority tiers CXO > VP > Head > Director > Manager > Lead > Others
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Level Tagger')
    .addItem('Tag Levels','tagLevels')
    .addToUi();
}

function tagLevels() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet(); // change to a named sheet if needed

  // CONFIG - change if your sheet layout is different
  const TITLE_COL = 1;      // A = 1
  const OUTPUT_COL = 2;     // B = 2
  const START_ROW = 2;

  const lastRow = Math.max(sheet.getLastRow(), START_ROW);
  const numRows = lastRow - START_ROW + 1;
  if (numRows <= 0) {
    SpreadsheetApp.getActive().toast('No data rows found.');
    return;
  }

  const titlesRange = sheet.getRange(START_ROW, TITLE_COL, numRows, 1);
  const titles = titlesRange.getValues().map(r => r[0] ? String(r[0]) : "");

  const results = titles.map(t => [classifyTitle(t)]);
  sheet.getRange(START_ROW, OUTPUT_COL, results.length, 1).setValues(results);
  SpreadsheetApp.getActive().toast('Level tagging complete — ' + results.length + ' rows processed.');
}


/** MAIN classification function */
function classifyTitle(rawTitle) {
  if (!rawTitle || String(rawTitle).trim() === "") return "";

  const s = normalize(String(rawTitle));

  // Exceptions first (explicit mappings overriding default priority)
  const exceptions = [
    {re: /\bchief of staff\b/, level: "Director"},
    {re: /\bchief general manager\b/, level: "Manager"},
    {re: /\bchief manager\b/, level: "Manager"},
    {re: /\bdeputy general manager\b/, level: "Manager"},
    {re: /\bdgm\b/, level: "Manager"},
    {re: /\bagm\b/, level: "Manager"},
    // Add more exceptions here as needed
  ];

  for (let ex of exceptions) {
    if (ex.re.test(s)) return ex.level;
  }

  // Priority-ordered level patterns (higher index => lower priority)
  const levelPatterns = [
    {level: "CXO", re: /\b(ceo|cfo|cto|cio|cmo|coo|cso|chro|cpo|clo|cdo|ciso|cno|cco|chief\s+[a-z]+|group chief|chief|chair(man|woman)?|c-suite|c level|c-level)\b/},
    {level: "VP",  re: /\b(executive vice president|senior vice president|associate vice president|assistant vice president|vice president|president|vice-?president|vp|v\.p\.|evp|svp|avp)\b/},
    {level: "Head",re: /\b(global head|regional head|branch head|country head|business head|circle head|head of|head)\b/},
    {level: "Director", re: /\b(executive director|managing director|senior director|associate director|assistant director|director|managing partner|partner|^md$|\bmd\b)\b/},
    {level: "Manager", re: /\b(assistant general manager|general manager|assistant gm|agm|dgm|gm\b|\bmanager\b|senior manager|branch manager|country manager|national manager)\b/},
    {level: "Lead", re: /\b(team lead|lead engineer|lead|tech lead|technical lead)\b/},
    {level: "Others", re: /\b(analyst|specialist|engineer|associate|coordinator|officer|consultant|representative|advisor|staff|intern|trainee|junior|entry-?level)\b/}
  ];

  // Find first (highest-priority) level that matches
  for (let lp of levelPatterns) {
    if (lp.re.test(s)) {
      return lp.level;
    }
  }

  // fallback
  return "Others";
}

/** Normalize / clean the input string for safer regex matching */
function normalize(s) {
  s = s.toLowerCase();

  // Replace punctuation with spaces so tokens are cleanly separated
  s = s.replace(/[\/\|\-\_\.,\(\)\[\]\:;]+/g, " ");

  // Ampersands -> and
  s = s.replace(/&/g, " and ");

  // Collapse multiple spaces
  s = s.replace(/\s+/g, " ").trim();

  // abbreviations normalization (basic)
  s = s.replace(/\bsr\b|\bsr\.\b/g, "senior");
  s = s.replace(/\bjr\b|\bjr\.\b/g, "junior");
  s = s.replace(/\bassist\b|\bassist\.\b/g, "assistant");
  s = s.replace(/\bassoc\b|\bassoc\.\b/g, "associate");
  s = s.replace(/\bvp\b|\bv\.p\.\b/g, "vp");
  s = s.replace(/\begv\b/g, "evp"); // typo-handling
  s = s.replace(/\bmd\b/g, "md"); // keep md token
  s = s.replace(/\bgm\b/g, "gm");
  s = s.replace(/\bdgm\b/g, "dgm");
  s = s.replace(/\bagm\b/g, "agm");

  return s;
}
