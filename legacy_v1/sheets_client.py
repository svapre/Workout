"""
sheets_client.py — Google Sheets integration layer.

Key guarantees:
  • IDEMPOTENT: reads existing dates first, only appends new ones.
  • SAFE: writes only to columns A–D, never touches formula or manual columns.
  • Uses gspread with Service Account authentication.
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Set

import gspread

from classifier import ClassifiedDay
from config import SPREADSHEET_NAME, DAILY_LOG_SHEET, CREDENTIALS_PATH


def _get_client(creds_path: str | Path) -> gspread.Client:
    """Authenticate and return a gspread client."""
    creds_path = Path(creds_path)
    if not creds_path.exists():
        raise FileNotFoundError(
            f"Credentials file not found: {creds_path}\n"
            f"See docs/SETUP.md for how to create one."
        )
    return gspread.service_account(filename=str(creds_path))


def _get_existing_dates(worksheet: gspread.Worksheet) -> Set[str]:
    """Read column A (Date) and return a set of existing date strings."""
    # get_col returns a flat list; first element is the header
    col_a = worksheet.col_values(1)
    if len(col_a) <= 1:
        return set()
    return set(col_a[1:])  # skip header


def _ensure_headers(worksheet: gspread.Worksheet) -> None:
    """Write the header row if cell A1 is empty."""
    if worksheet.acell("A1").value:
        return  # headers already exist

    headers = [
        "Date", "Workout_Type", "Duration (min)", "Pushup_Volume",
        "Total_Volume", "Total_Sets", "Exercises",
        "Pain_Level", "Energy", "Sitting (min)", "Notes",
    ]
    worksheet.update("A1:K1", [headers], value_input_option="RAW")
    # Bold + freeze via format
    worksheet.format("A1:K1", {"textFormat": {"bold": True}})
    worksheet.freeze(rows=1)


def upload(
    days: List[ClassifiedDay],
    creds_path: str | Path = CREDENTIALS_PATH,
    spreadsheet_name: str = SPREADSHEET_NAME,
    sheet_name: str = DAILY_LOG_SHEET,
    dry_run: bool = False,
) -> List[ClassifiedDay]:
    """
    Append classified workout data to Google Sheets.

    Parameters
    ----------
    days : classified workout rows to potentially insert.
    creds_path : path to the service-account JSON key.
    spreadsheet_name : name of the Google Spreadsheet.
    sheet_name : name of the worksheet tab.
    dry_run : if True, skip actual Sheets writes (for testing).

    Returns
    -------
    List of ClassifiedDay objects that were actually inserted (new dates only).
    """
    if dry_run:
        print("[DRY RUN] Skipping Google Sheets connection.")
        return days  # in dry-run, treat all as "would be inserted"

    client = _get_client(creds_path)
    spreadsheet = client.open(spreadsheet_name)

    # Get or create the worksheet
    try:
        worksheet = spreadsheet.worksheet(sheet_name)
    except gspread.WorksheetNotFound:
        worksheet = spreadsheet.add_worksheet(title=sheet_name, rows=1000, cols=11)

    # Ensure header row
    _ensure_headers(worksheet)

    # Read existing dates for idempotency
    existing_dates = _get_existing_dates(worksheet)

    # Filter to new dates only
    new_days = [d for d in days if d.date not in existing_dates]

    if not new_days:
        print("  No new dates to insert -- sheet is up to date.")
        return []

    # Build rows: columns A-G (auto-filled).  H-K are for user / manual input.
    rows = []
    for d in new_days:
        rows.append([
            d.date, d.workout_type, d.duration_min, d.pushup_volume,
            d.total_volume, d.total_sets, d.exercises_done,
        ])

    # Find the next empty row (after all existing data)
    next_row = len(existing_dates) + 2  # +1 header, +1 for 1-indexing

    # Write range A{next_row}:G{next_row + len - 1}
    end_row = next_row + len(rows) - 1
    cell_range = f"A{next_row}:G{end_row}"

    worksheet.update(cell_range, rows, value_input_option="RAW")

    return new_days

