"""
watcher.py — Auto-detect Strong CSV exports from Google Drive and process them.

Flow:
  1. You export from Strong app on your phone
  2. Share/save the CSV to a Google Drive folder
  3. This script detects it, downloads, parses, classifies, and uploads to Sheets

The script polls a Google Drive folder every 30 seconds for new CSV files.
Once processed, files are moved to a "processed" subfolder in Drive.

Usage:
    python watcher.py                    # watch Google Drive continuously
    python watcher.py --once             # scan once and exit
    python watcher.py --setup            # create the Drive folder & print sharing instructions
"""

from __future__ import annotations

import argparse
import io
import sys
import time
from pathlib import Path

# Ensure UTF-8 output on Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from csv_parser import parse_csv
from classifier import classify_all
from sheets_client import upload
from config import CREDENTIALS_PATH

SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets",
]
DRIVE_FOLDER_NAME = "Workout Tracker Inbox"
POLL_INTERVAL_SEC = 30
TEMP_CSV = Path("_temp_strong_export.csv")


def _get_drive_service():
    """Build and return a Google Drive API service."""
    creds = Credentials.from_service_account_file(CREDENTIALS_PATH, scopes=SCOPES)
    return build("drive", "v3", credentials=creds)


def _find_or_create_folder(service, name: str) -> str:
    """Find a Drive folder by name, or create it. Returns folder ID."""
    query = f"name='{name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = service.files().list(q=query, spaces="drive", fields="files(id, name)").execute()
    files = results.get("files", [])

    if files:
        return files[0]["id"]

    # Create it
    metadata = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
    folder = service.files().create(body=metadata, fields="id").execute()
    return folder["id"]


def _find_or_create_subfolder(service, parent_id: str, name: str) -> str:
    """Find or create a subfolder inside a parent folder."""
    query = (f"name='{name}' and mimeType='application/vnd.google-apps.folder' "
             f"and '{parent_id}' in parents and trashed=false")
    results = service.files().list(q=query, spaces="drive", fields="files(id)").execute()
    files = results.get("files", [])
    if files:
        return files[0]["id"]

    metadata = {"name": name, "mimeType": "application/vnd.google-apps.folder", "parents": [parent_id]}
    folder = service.files().create(body=metadata, fields="id").execute()
    return folder["id"]


def _list_csvs_in_folder(service, folder_id: str) -> list[dict]:
    """List all CSV files in a Drive folder."""
    query = (f"'{folder_id}' in parents and trashed=false "
             f"and (mimeType='text/csv' or name contains '.csv')")
    results = service.files().list(
        q=query, spaces="drive",
        fields="files(id, name, createdTime, modifiedTime)",
        orderBy="modifiedTime desc",
    ).execute()
    return results.get("files", [])


def _download_file(service, file_id: str, dest: Path):
    """Download a file from Drive to local path."""
    request = service.files().get_media(fileId=file_id)
    with open(dest, "wb") as f:
        downloader = MediaIoBaseDownload(f, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()


def _move_file(service, file_id: str, old_parent: str, new_parent: str):
    """Move a file from one folder to another in Drive."""
    service.files().update(
        fileId=file_id,
        addParents=new_parent,
        removeParents=old_parent,
        fields="id, parents",
    ).execute()


def process_file(service, file_info: dict, folder_id: str, processed_folder_id: str) -> bool:
    """Download a CSV from Drive, process it, and move to processed folder."""
    name = file_info["name"]
    file_id = file_info["id"]

    print(f"\n{'='*50}")
    print(f"  New CSV detected: {name}")
    print(f"{'='*50}\n")

    try:
        # 1. Download
        print(f"  Downloading from Google Drive...")
        _download_file(service, file_id, TEMP_CSV)

        # 2. Parse
        daily_workouts = parse_csv(TEMP_CSV)
        print(f"  Found {len(daily_workouts)} day(s) of workout data.")

        # 3. Classify
        classified = classify_all(daily_workouts)
        for c in classified:
            print(f"    {c.date}  ->  {c.workout_type:5}  |  {c.duration_min} min  |  {c.pushup_volume} pushup reps")

        # 4. Upload to Sheets
        print(f"\n  Uploading to Google Sheets...")
        inserted = upload(classified, dry_run=False)
        print(f"  Inserted {len(inserted)} new row(s), skipped {len(classified) - len(inserted)} duplicate(s).")

        # 5. Move CSV to processed folder
        _move_file(service, file_id, folder_id, processed_folder_id)
        print(f"  Moved '{name}' to 'processed' folder in Drive.")

        # 6. Cleanup temp
        TEMP_CSV.unlink(missing_ok=True)

        print(f"\n  Done!")
        return True

    except Exception as e:
        print(f"\n  [ERROR] Failed to process {name}: {e}")
        TEMP_CSV.unlink(missing_ok=True)
        return False


def setup_drive(service):
    """Create the Drive folder and print instructions."""
    folder_id = _find_or_create_folder(service, DRIVE_FOLDER_NAME)
    _find_or_create_subfolder(service, folder_id, "processed")

    # Get service account email
    import json
    with open(CREDENTIALS_PATH) as f:
        sa_email = json.load(f)["client_email"]

    print()
    print("+==================================================+")
    print("|  Google Drive Folder Setup                        |")
    print("+==================================================+")
    print()
    print(f"  Folder '{DRIVE_FOLDER_NAME}' is ready in the service")
    print(f"  account's Drive.")
    print()
    print("  TO SHARE WITH YOUR PHONE:")
    print()
    print(f"  1. Open Google Drive on your phone")
    print(f"  2. Look for the folder '{DRIVE_FOLDER_NAME}'")
    print(f"     shared with you by the service account.")
    print()
    print(f"  OR share any folder with this service account:")
    print(f"    {sa_email}")
    print()
    print("  EASIEST METHOD:")
    print()
    print(f"  1. Create a folder called '{DRIVE_FOLDER_NAME}'")
    print(f"     in YOUR Google Drive")
    print(f"  2. Share it with: {sa_email}")
    print(f"     (give Editor access)")
    print(f"  3. When you export from Strong, save the CSV")
    print(f"     to this folder")
    print()
    print("  The watcher will auto-detect and process it!")
    print()


def watch(service, folder_id: str, processed_folder_id: str):
    """Continuously poll Drive for new CSVs."""
    print()
    print("+==================================================+")
    print("|  Workout Tracker -- Auto Watcher (Google Drive)   |")
    print("+==================================================+")
    print()
    print(f"  Watching Drive folder: '{DRIVE_FOLDER_NAME}'")
    print(f"  Poll interval: {POLL_INTERVAL_SEC}s")
    print()
    print("  Export from Strong -> Save to Google Drive folder.")
    print("  It will be auto-processed and synced to Sheets.")
    print()
    print("  Press Ctrl+C to stop.")
    print()

    try:
        while True:
            csvs = _list_csvs_in_folder(service, folder_id)
            for csv_file in csvs:
                process_file(service, csv_file, folder_id, processed_folder_id)
            time.sleep(POLL_INTERVAL_SEC)
    except KeyboardInterrupt:
        print("\n\n  Watcher stopped. Goodbye!")


def main():
    parser = argparse.ArgumentParser(
        description="Auto-detect Strong CSV exports from Google Drive.",
    )
    parser.add_argument("--once", action="store_true", help="Scan once and exit.")
    parser.add_argument("--setup", action="store_true", help="Set up Drive folder and show instructions.")
    args = parser.parse_args()

    service = _get_drive_service()

    if args.setup:
        setup_drive(service)
        return

    # Find or create the inbox folder
    folder_id = _find_or_create_folder(service, DRIVE_FOLDER_NAME)
    processed_id = _find_or_create_subfolder(service, folder_id, "processed")

    if args.once:
        csvs = _list_csvs_in_folder(service, folder_id)
        if csvs:
            for csv_file in csvs:
                process_file(service, csv_file, folder_id, processed_id)
        else:
            print(f"No CSVs found in '{DRIVE_FOLDER_NAME}' folder.")
    else:
        watch(service, folder_id, processed_id)


if __name__ == "__main__":
    main()
