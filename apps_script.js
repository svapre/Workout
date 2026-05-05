// ============================================================
// Workout Tracker — Google Apps Script (Auto-Processor)
//
// This script runs INSIDE your Google Sheet automatically.
// It checks the "Workout Tracker Inbox" Drive folder every
// 15 minutes for new CSVs and processes them.
//
// SETUP (one-time, 2 minutes):
//   1. Open your "Workout Tracker" Google Sheet
//   2. Go to Extensions → Apps Script
//   3. Delete any existing code, paste this entire file
//   4. Click Save
//   5. Run the function "setupTrigger" once (it will ask for permissions)
//   6. Done! It runs automatically forever.
// ============================================================

// ── Configuration ───────────────────────────────────────────
const INBOX_FOLDER_NAME = "Workout Tracker Inbox";
const DAILY_LOG_SHEET = "Daily_Log";
const STAGE1_KEYWORDS = ["surya namaskar", "bird dog", "glute bridge", "band pull-apart", "row"];
const PUSHUP_KEYWORDS = ["push-up", "pushup", "push up"];
const FULL_THRESHOLD = 3;

// ── Trigger Setup (run once) ────────────────────────────────
function setupTrigger() {
  // Remove any existing triggers
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  
  // Create a time-based trigger that runs every 15 minutes
  ScriptApp.newTrigger("processNewExports")
    .timeBased()
    .everyMinutes(15)
    .create();
  
  Logger.log("Trigger created! The script will check for new CSVs every 15 minutes.");
  
  // Also ensure the inbox folder exists
  ensureFolder();
}

// ── Ensure folder exists ────────────────────────────────────
function ensureFolder() {
  const folders = DriveApp.getFoldersByName(INBOX_FOLDER_NAME);
  let folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(INBOX_FOLDER_NAME);
  }
  
  // Ensure processed subfolder
  const subfolders = folder.getFoldersByName("processed");
  if (!subfolders.hasNext()) {
    folder.createFolder("processed");
  }
  
  Logger.log("Folder ready: " + folder.getUrl());
  return folder;
}

// ── Main function (runs automatically) ──────────────────────
function processNewExports() {
  const folders = DriveApp.getFoldersByName(INBOX_FOLDER_NAME);
  if (!folders.hasNext()) {
    Logger.log("No inbox folder found.");
    return;
  }
  
  const inbox = folders.next();
  const files = inbox.getFilesByType(MimeType.CSV);
  
  // Also check for files without proper MIME type
  const allFiles = inbox.getFiles();
  const csvFiles = [];
  
  while (allFiles.hasNext()) {
    const file = allFiles.next();
    const name = file.getName().toLowerCase();
    if (name.endsWith(".csv")) {
      csvFiles.push(file);
    }
  }
  
  if (csvFiles.length === 0) {
    Logger.log("No new CSVs found.");
    return;
  }
  
  // Get processed folder
  const procFolders = inbox.getFoldersByName("processed");
  const processedFolder = procFolders.hasNext() ? procFolders.next() : inbox.createFolder("processed");
  
  // Get the spreadsheet and sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DAILY_LOG_SHEET);
  if (!sheet) {
    Logger.log("Daily_Log sheet not found!");
    return;
  }
  
  // Get existing dates for dedup
  const existingData = sheet.getRange("A:A").getValues();
  const existingDates = new Set();
  existingData.forEach(row => {
    if (row[0]) existingDates.add(String(row[0]).trim());
  });
  
  let totalInserted = 0;
  
  csvFiles.forEach(file => {
    Logger.log("Processing: " + file.getName());
    
    try {
      const content = file.getBlob().getDataAsString("UTF-8");
      const rows = parseCSV(content);
      const classified = classifyAll(rows);
      
      // Filter new dates
      const newDays = classified.filter(d => !existingDates.has(d.date));
      
      if (newDays.length > 0) {
        // Find next empty row
        const lastRow = sheet.getLastRow();
        const startRow = lastRow + 1;
        
        // Build data array
        const data = newDays.map(d => [
          d.date, d.workoutType, d.durationMin, d.pushupVolume,
          d.totalVolume, d.totalSets, d.exercises
        ]);
        
        // Write to sheet
        sheet.getRange(startRow, 1, data.length, 7).setValues(data);
        
        newDays.forEach(d => existingDates.add(d.date));
        totalInserted += newDays.length;
        
        Logger.log("Inserted " + newDays.length + " new row(s).");
      } else {
        Logger.log("No new dates to insert.");
      }
      
      // Move file to processed
      file.moveTo(processedFolder);
      Logger.log("Moved to processed folder.");
      
    } catch (e) {
      Logger.log("ERROR processing " + file.getName() + ": " + e.message);
    }
  });
  
  Logger.log("Done! Total inserted: " + totalInserted);
}


// ── CSV Parser ──────────────────────────────────────────────
function parseCSV(content) {
  // Auto-detect delimiter
  const sample = content.substring(0, 2000);
  const delimiter = (sample.split(";").length > sample.split(",").length) ? ";" : ",";
  
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];
  
  // Parse headers
  const headers = parseCSVLine(lines[0], delimiter).map(h => h.trim().toLowerCase());
  
  // Find column indices by keyword matching
  const colIdx = {};
  headers.forEach((h, i) => {
    if (h.includes("date") && !colIdx.date) colIdx.date = i;
    else if (h.includes("exercise") && h.includes("name")) colIdx.exercise = i;
    else if (h === "reps" || h.includes("reps")) colIdx.reps = i;
    else if (h.includes("weight") && !colIdx.weight) colIdx.weight = i;
    else if (h.includes("duration") && !colIdx.duration) colIdx.duration = i;
  });
  
  if (colIdx.date === undefined || colIdx.exercise === undefined) {
    Logger.log("Could not find Date or Exercise columns. Headers: " + headers.join(", "));
    return [];
  }
  
  // Parse data rows and group by date
  const days = {};
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const vals = parseCSVLine(lines[i], delimiter);
    
    const rawDate = (vals[colIdx.date] || "").trim();
    if (!rawDate) continue;
    
    // Normalize date to YYYY-MM-DD
    let dateStr;
    try {
      // Try parsing — Strong uses "YYYY-MM-DD HH:MM:SS" format
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) continue;
      dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } catch(e) { continue; }
    
    if (!days[dateStr]) {
      days[dateStr] = { exercises: [], duration: 0 };
    }
    
    const exerciseName = (vals[colIdx.exercise] || "").trim();
    const reps = parseInt(vals[colIdx.reps] || "0") || 0;
    const weight = parseFloat(vals[colIdx.weight] || "0") || 0;
    
    days[dateStr].exercises.push({ name: exerciseName, reps: reps, weight: weight });
    
    // Duration
    if (colIdx.duration !== undefined) {
      const durVal = (vals[colIdx.duration] || "").trim();
      let durMin = 0;
      if (/^\d+$/.test(durVal)) {
        durMin = Math.max(Math.floor(parseInt(durVal) / 60), 1);
      } else {
        durMin = parseDurationStr(durVal);
      }
      if (durMin > days[dateStr].duration) {
        days[dateStr].duration = durMin;
      }
    }
  }
  
  return Object.keys(days).sort().map(date => ({
    date: date,
    exercises: days[date].exercises,
    durationMin: days[date].duration
  }));
}


function parseCSVLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}


function parseDurationStr(s) {
  if (!s) return 0;
  const hMatch = s.match(/(\d+)\s*h/i);
  const mMatch = s.match(/(\d+)\s*m/i);
  const sMatch = s.match(/(\d+)\s*s/i);
  const total = (hMatch ? parseInt(hMatch[1]) * 60 : 0) +
                (mMatch ? parseInt(mMatch[1]) : 0) +
                (sMatch ? Math.round(parseInt(sMatch[1]) / 60) : 0);
  return total > 0 ? total : 0;
}


// ── Classifier ──────────────────────────────────────────────
function classifyAll(workouts) {
  return workouts.map(w => {
    const names = w.exercises.map(e => e.name.toLowerCase());
    
    // Count Stage 1 keywords
    const matched = new Set();
    STAGE1_KEYWORDS.forEach(kw => {
      if (names.some(n => n.includes(kw))) matched.add(kw);
    });
    
    // Classify
    let workoutType = "Skip";
    if (matched.size >= FULL_THRESHOLD) workoutType = "Full";
    else if (matched.size >= 1) workoutType = "Half";
    
    // Pushup volume
    const pushupVol = w.exercises
      .filter(e => PUSHUP_KEYWORDS.some(k => e.name.toLowerCase().includes(k)))
      .reduce((sum, e) => sum + e.reps, 0);
    
    // Total volume
    const totalVol = Math.floor(w.exercises.reduce((sum, e) => sum + (e.reps * e.weight), 0));
    
    // Unique exercises
    const uniqueExercises = [...new Set(w.exercises.map(e => e.name).filter(Boolean))].join(", ");
    
    return {
      date: w.date,
      workoutType: workoutType,
      durationMin: w.durationMin,
      pushupVolume: pushupVol,
      totalVolume: totalVol,
      totalSets: w.exercises.length,
      exercises: uniqueExercises
    };
  });
}


// ── Manual run (for testing) ────────────────────────────────
function manualRun() {
  processNewExports();
}
