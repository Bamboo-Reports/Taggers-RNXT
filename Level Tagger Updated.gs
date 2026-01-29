/**
 * Level Tagger - Apps Script (updated)
 * - Reads Titles from TITLE_COL (default C = 3)
 * - Writes Level to OUTPUT_COL (default F = 6)
 * - Writes Confidence Score to CONF_COL (default G = 7)
 * - Writes Exhaustive list of detected matches to EXHAUSTIVE_COL (default H = 8)
 * - Uses sheet named "Sample Input 3"
 * - Priority: CXO > VP > Head > Director > GM > Senior Manager > Manager > Lead > Others
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Level Tagger')
    .addItem('Tag Levels','tagLevels')
    .addToUi();
}

function tagLevels() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Sample Input 3');
  if (!sheet) {
    SpreadsheetApp.getActive().toast('Sheet "Sample Input 3" not found.');
    return;
  }

  // CONFIG - change if your sheet layout is different
  const TITLE_COL = 3;      // C = 3 (where Titles live)
  const OUTPUT_COL = 6;     // F = 6 (Level)
  const CONF_COL = 7;       // G = 7 (Confidence)
  const EXHAUSTIVE_COL = 8; // H = 8 (Exhaustive matches)
  const START_ROW = 2;

  const lastRow = sheet.getLastRow();
  if (lastRow < START_ROW) {
    SpreadsheetApp.getActive().toast('No data rows found.');
    return;
  }
  const numRows = lastRow - START_ROW + 1;

  const titlesRange = sheet.getRange(START_ROW, TITLE_COL, numRows, 1);
  const titles = titlesRange.getValues().map(r => r[0] ? String(r[0]) : "");

  const results = titles.map(t => {
    const res = classifyTitle(t);
    // ensure confidence appears as numeric with two decimals
    return [res.level, Number(res.confidence).toFixed(2), res.exhaustive];
  });

  // write Level, Confidence, Exhaustive list to F, G, H respectively
  sheet.getRange(START_ROW, OUTPUT_COL, results.length, 3).setValues(results);
  SpreadsheetApp.getActive().toast('Level tagging complete — ' + results.length + ' rows processed.');
}


/** MAIN classification function - returns {level, confidence, exhaustive} */
function classifyTitle(rawTitle) {
  if (!rawTitle || String(rawTitle).trim() === "") return {level: "", confidence: 0.00, exhaustive: ""};

  const s = normalize(String(rawTitle));

  // Exceptions (high-confidence overrides)
  const exceptions = [
    {re: /\bchief of staff\b/, level: "Director", weight: 0.95},
    {re: /\bchief general manager\b/, level: "GM", weight: 0.90},
    {re: /\bchief manager\b/, level: "Manager", weight: 0.85},
    {re: /\bdeputy general manager\b/, level: "GM", weight: 0.88},
    {re: /\bdgm\b/, level: "GM", weight: 0.88},
    {re: /\bagm\b/, level: "GM", weight: 0.88},
    // add other explicit exceptions here
  ];
  for (let ex of exceptions) {
    if (ex.re.test(s)) {
      return {
        level: ex.level,
        confidence: ex.weight,
        exhaustive: `${ex.level}: ${ (s.match(new RegExp(ex.re.source, 'g')) || []).join(', ') }`
      };
    }
  }

  // Level definitions in priority order (top -> highest priority)
  // Each has a 'pattern' (string) and a base weight for confidence
  const levelDefs = [
    // CXO: include founder / co-founder
    {level: "CXO", pattern: "\\b(ceo|cfo|cto|CIDO|CRO|coes|ceo|cio|cmo|coo|cso|chro|cbo|cpo|clo|cdo|ciso|cno|cco|founder|co[- ]?founder|group chief|chief\\s+[a-z]+|chair(man|woman)?|c-suite|c level|c-level)\\b", weight: 0.99},
    {level: "VP",  pattern: "\\b(executive vice president|senior vice president|associate vice president|assistant vice president|vice president|vice-?president|vp|president|v\\.p\\.|evp|svp|avp)\\b", weight: 0.92},
    {level: "Head",pattern: "\\b(global head|regional head|HOD|head|branch head|country head|business head|circle head|head of|\\bhead\\b)\\b", weight: 0.88},
    {level: "Director", pattern: "\\b(executive director|managing director|member board of directors|directors|senior director|director|associate director|assistant director|director|managing partner|partner|\\bmd\\b)\\b", weight: 0.82},
    // GM category (user requested breakdown of all GM-like tokens -> "GM")
    {level: "GM", pattern: "\\b(assistant general manager|assistant gm|chief general manager|general manager|agm|dgm|deputy general manager|gm\\b)\\b", weight: 0.86},
    // Senior Manager explicit: allow intervening words like "senior marketing manager"
    {level: "Senior Manager", pattern: "\\b(senior(?:\\s+\\w+)*\\s+manager|sr\\.?(?:\\s+\\w+)*\\s+manager)\\b", weight: 0.80},
    // Generic Manager (only if no GM or Senior Manager matched)
    {level: "Manager", pattern: "\\b(manager|mgr|mngr|branch manager|country manager|national manager|sales manager|\\bmanage\\b)\\b", weight: 0.70},
    {level: "Lead", pattern: "\\b(team lead|lead|lead engineer|\\blead\\b|tech lead|technical lead)\\b", weight: 0.60},
    {level: "Others", pattern: "\\b(analyst|specialist|engineer|associate|coordinator|officer|consultant|representative|advisor|staff|intern|trainee|executive assistant|assistant|junior|entry-?level)\\b", weight: 0.45}
  ];

  // Detect all matches (collect detectedLevels array)
  const detected = [];
  for (let def of levelDefs) {
    const re = new RegExp(def.pattern, 'g'); // global so we can extract matches
    const matches = s.match(re);
    if (matches && matches.length) {
      // normalize unique matched tokens
      const uniqueMatches = Array.from(new Set(matches.map(m => m.trim())));
      detected.push({level: def.level, matches: uniqueMatches, weight: def.weight});
    }
  }

  // Build exhaustive string: "Level1: match1,match2 | Level2: match3"
  const exhaustiveParts = detected.map(d => `${d.level}: ${d.matches.join(', ')}`);
  const exhaustive = exhaustiveParts.join(" | ");

  // Choose highest-priority detected level based on order in levelDefs
  let chosenLevel = null;
  let chosenWeight = 0;
  for (let def of levelDefs) {
    const found = detected.find(d => d.level === def.level);
    if (found) {
      chosenLevel = def.level;
      chosenWeight = def.weight;
      break; // first in priority order
    }
  }

  // Fallback if nothing matched
  if (!chosenLevel) {
    return {level: "Others", confidence: 0.40, exhaustive: exhaustive || ""};
  }

  // Compute confidence:
  // base = chosenWeight
  // penalize if there are multiple different levels detected (possible ambiguity)
  const otherLevelsCount = detected.length - 1; // number of other detected levels besides chosen
  let confidence = chosenWeight - (otherLevelsCount * 0.05);

  // If chosen level had multiple matched tokens (e.g., "vp" and "vice president"), small boost
  const chosenDetected = detected.find(d => d.level === chosenLevel);
  if (chosenDetected && chosenDetected.matches.length > 1) {
    confidence += 0.03;
  }

  // Clamp to [0.0, 0.999]
  if (confidence > 0.999) confidence = 0.999;
  if (confidence < 0.0) confidence = 0.0;

  return {
    level: chosenLevel,
    confidence: Number(confidence.toFixed(2)),
    exhaustive: exhaustive
  };
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

  // Merge spaced acronyms like "c t o" -> "cto", "a v p" -> "avp", "a g m" -> "agm"
  // match sequences of single letters separated by spaces up to length 4
  s = s.replace(/\b(?:[a-z]\s+){1,3}[a-z]\b/g, function(m){
    return m.replace(/\s+/g, "");
  });

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
  // handle common truncated 'manage' -> 'manager' tolerance
  s = s.replace(/\bmanage\b/g, "manager");

  return s;
}
