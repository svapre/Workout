# 🛠️ Setup Guide — Gamified Fitness & Rehab Tracker

This guide walks you through setting up the Google Cloud service account, Google Sheet, and Python environment.

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Click **Select a project** → **New Project**.
3. Name it something like `Workout Tracker` and click **Create**.
4. Make sure your new project is selected in the top-left dropdown.

---

## Step 2: Enable APIs

1. In the Cloud Console, go to **APIs & Services → Library**.
2. Search for and **Enable** both of these:
   - **Google Sheets API**
   - **Google Drive API**

---

## Step 3: Create a Service Account

1. Go to **APIs & Services → Credentials**.
2. Click **+ Create Credentials → Service account**.
3. Fill in:
   - **Name**: `workout-bot`
   - **ID**: (auto-filled)
4. Click **Create and Continue** → skip optional roles → click **Done**.
5. Click on the new service account email (e.g., `workout-bot@workout-tracker-XXXXX.iam.gserviceaccount.com`).
6. Go to the **Keys** tab → **Add Key → Create new key → JSON**.
7. A `.json` file will download. **Save it as `credentials.json`** in the project root:
   ```
   /your/project/path/credentials.json
   ```

> ⚠️ **Keep this file secret!** It's already in `.gitignore`.

---

## Step 4: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/) and create a new spreadsheet.
2. **Rename it** to `Workout Tracker` (or whatever you set in `config.py`).
3. **Rename the first tab** (bottom) to `Daily_Log`.
4. **Add a second tab** and name it `Dashboard`.

---

## Step 5: Share the Sheet with the Service Account

1. Open your downloaded `credentials.json` and find the `"client_email"` value.
   It looks like: `workout-bot@workout-tracker-XXXXX.iam.gserviceaccount.com`
2. In your Google Sheet, click **Share**.
3. Paste the service account email and give it **Editor** access.
4. Uncheck "Notify people" and click **Share**.

---

## Step 6: Set Up the Sheet Headers

The Python script will auto-create headers on first run:
`Date | Workout_Type | Duration (min) | Pushup_Volume | Total_Volume | Total_Sets | Exercises | Pain_Level | Energy | Sitting (min) | Notes`

Just run the script once to initialize the `Daily_Log` tab, then run `setup_dashboard.py` to create the visual dashboard.

---

## Step 7: Install Python Dependencies

Open a terminal in the project directory and run:

```bash
pip install -r requirements.txt
```

Or with a virtual environment (recommended):

```bash
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
```

---

## Step 8: Export CSV from Strong App

1. Open the **Strong** app on your phone.
2. Go to **Settings → Export Data → Export as CSV**.
3. Transfer the CSV file to your computer (email, cloud drive, USB, etc.).
4. Place it somewhere accessible, e.g., the project folder.

---

## Step 9: Run the Script

### Dry run (no Sheets write — test parsing only):
```bash
python main.py --csv strong_export.csv --dry-run
```

### Full run:
```bash
python main.py --csv strong_export.csv
```

### With custom paths:
```bash
python main.py --csv "/path/to/strong.csv" --creds "credentials.json" --sheet "Workout Tracker"
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `FileNotFoundError: credentials.json` | Make sure you saved the GCP JSON key as `credentials.json` in the project root. |
| `gspread.exceptions.SpreadsheetNotFound` | Check that the spreadsheet name in `config.py` matches exactly. Also verify you shared the sheet with the service account email. |
| `gspread.exceptions.APIError: 403` | Make sure both Google Sheets API and Google Drive API are enabled in your GCP project. |
| `CSV is missing required columns` | Check that your Strong CSV has `Date` and `Exercise Name` columns. The parser is case-insensitive but needs those fields. |
| Duplicate rows appearing | This shouldn't happen — the script checks for existing dates. If it does, verify the date format in your sheet matches `YYYY-MM-DD`. |

---

## Daily Workflow

Your daily routine is simple:

1. ✅ Do your workout → log it in Strong app.
2. 📱 Export CSV from Strong (Settings → Export).
3. 💻 Run: `python main.py --csv strong.csv`
4. ✍️ Open Google Sheet → fill in Pain_Level, Energy, Sitting, Notes for the day.
5. 📈 Check your Dashboard to see your rehab progress update automatically!
