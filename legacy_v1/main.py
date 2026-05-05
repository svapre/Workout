"""
main.py — Entry point for the Gamified Fitness & Rehab Tracker.

Usage:
    python main.py --csv path/to/strong_export.csv
    python main.py --csv path/to/strong_export.csv --dry-run
    python main.py --csv path/to/strong_export.csv --creds my_creds.json
    python main.py --csv path/to/strong_export.csv --sheet "My Sheet Name"
"""

from __future__ import annotations

import argparse
import sys

# Ensure UTF-8 output on Windows consoles
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from csv_parser import parse_csv
from classifier import classify_all
from sheets_client import upload
from config import CREDENTIALS_PATH, SPREADSHEET_NAME


# ── Pretty-print helpers ────────────────────────────────────────────────────

def _print_banner():
    print()
    print("+==================================================+")
    print("|   Gamified Fitness & Rehab Tracker                |")
    print("|   Stage 1 - Corrective Exercise Phase             |")
    print("+==================================================+")
    print()


def _print_summary(classified, inserted):
    print()
    print("--- Processing Summary -----------------------------")
    print(f"  Days parsed from CSV  : {len(classified)}")
    print(f"  Rows inserted to Sheet: {len(inserted)}")
    print(f"  Rows skipped (dupe)   : {len(classified) - len(inserted)}")
    print()

    if classified:
        print("  Day-by-Day Breakdown:")
        print(f"  {'Date':<14} {'Type':<8} {'Dur(min)':<10} {'Pushups':<8}")
        print(f"  {'-'*14} {'-'*8} {'-'*10} {'-'*8}")
        for c in classified:
            marker = ">" if c in inserted else "."
            print(f"  {marker} {c.date:<12} {c.workout_type:<8} {c.duration_min:<10} {c.pushup_volume:<8}")

    print()
    print("  > = inserted   . = already existed (skipped)")
    print("----------------------------------------------------")
    print()


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Process Strong app CSV and sync to Google Sheets.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python main.py --csv strong_export.csv\n"
            "  python main.py --csv strong_export.csv --dry-run\n"
        ),
    )
    parser.add_argument(
        "--csv", required=True,
        help="Path to the Strong app CSV export file.",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Parse and classify only — don't write to Google Sheets.",
    )
    parser.add_argument(
        "--creds", default=CREDENTIALS_PATH,
        help=f"Path to GCP service-account JSON key (default: {CREDENTIALS_PATH}).",
    )
    parser.add_argument(
        "--sheet", default=SPREADSHEET_NAME,
        help=f"Google Sheet name to write to (default: {SPREADSHEET_NAME}).",
    )
    args = parser.parse_args()

    _print_banner()

    # 1. Parse CSV
    print(f"[*] Reading CSV: {args.csv}")
    try:
        daily_workouts = parse_csv(args.csv)
    except (FileNotFoundError, ValueError) as e:
        print(f"[ERROR] {e}")
        sys.exit(1)
    print(f"   Found {len(daily_workouts)} day(s) of workout data.\n")

    # 2. Classify
    print("[*] Classifying workouts...")
    classified = classify_all(daily_workouts)
    for c in classified:
        print(f"   {c.date}  ->  {c.workout_type:5}  |  {c.duration_min} min  |  {c.pushup_volume} pushup reps")
    print()

    # 3. Upload to Google Sheets
    if args.dry_run:
        print("[DRY RUN] Skipping Google Sheets upload.\n")
        inserted = classified  # treat all as "would insert" for summary
    else:
        print("[*] Uploading to Google Sheets...")
        try:
            inserted = upload(
                classified,
                creds_path=args.creds,
                spreadsheet_name=args.sheet,
                dry_run=False,
            )
        except FileNotFoundError as e:
            print(f"[ERROR] {e}")
            sys.exit(1)
        except Exception as e:
            print(f"[ERROR] Google Sheets error: {e}")
            sys.exit(1)

    # 4. Summary
    _print_summary(classified, inserted)


if __name__ == "__main__":
    main()
