# Dashboard Config Design

## Goal

Turn the current hardcoded dashboard into a config-driven system.

The app should be able to:

- read workout data
- read a dashboard config file
- render a mobile dashboard from that config
- keep a default dashboard like the current one
- support more advanced dashboards later without rewriting the app

This design keeps the current dashboard style possible, but does not limit future dashboards to only that layout.

## Recommended Model

Use three layers:

1. Normalized workout data
2. Derived metrics
3. Dashboard sections/widgets

That separation lets the same data power multiple dashboards.

## Data Files

For the future app, keep data in a normalized form.

Suggested files:

- `routines.csv`
- `workouts.csv`
- `sets.csv`
- `dashboard_config.json`
- `progression_config.json`

Optional:

- `exercise_catalog.csv`
- `notes.csv`

## Suggested Data Shape

### `routines.csv`

One row per exercise in a routine:

```csv
routine_name,exercise_order,exercise_name,mode,target_sets,target_reps,target_duration_sec,target_weight_kg,rest_sec,notes
Stage 1 Rehab,1,Surya Namaskar,reps+time,3,12,300,0,30,Warmup
Stage 1 Rehab,2,Bird Dog,reps+time,3,10,60,0,30,Per side
```

### `workouts.csv`

One row per workout session:

```csv
workout_id,workout_date,routine_name,started_at,ended_at,workout_duration_sec,classification,pushup_volume,total_volume,total_sets,pain_level,notes
w_2026_05_05_01,2026-05-05,Stage 1 Rehab,2026-05-05T06:30:00,2026-05-05T06:55:00,1500,Full,20,240,12,Better,Morning session
```

Recommended summary fields in `workouts.csv`:

- `pushup_volume`
- `total_volume`
- `total_sets`
- `pain_level`

Those fields make dashboard queries much simpler while `sets.csv` still keeps the detailed raw log.

### `sets.csv`

One row per performed set:

```csv
workout_id,workout_date,routine_name,exercise_order,exercise_name,exercise_mode,set_number,target_reps,target_duration_sec,target_weight_kg,actual_reps,actual_weight_kg,set_started_at,set_ended_at,set_duration_sec,exercise_started_at,exercise_ended_at,exercise_total_sec,rest_sec,notes
w_2026_05_05_01,2026-05-05,Stage 1 Rehab,2,Bird Dog,reps+time,1,10,60,0,10,0,2026-05-05T06:35:10,2026-05-05T06:36:05,55,2026-05-05T06:35:10,2026-05-05T06:38:30,200,30,Left and right
```

This gives the dashboard enough data for:

- reps
- weight
- per-set time
- per-exercise total time
- per-workout total time
- routine membership
- progression logic

## Dashboard Config Files

Use two config files:

- `dashboard_config.json`
- `progression_config.json`

Reason:

- `dashboard_config.json` controls layout, widgets, labels, and metrics
- `progression_config.json` controls stages, gates, and roadmap content

This mirrors your current split between `dashboard_preview.html` and `config.py`.

## `dashboard_config.json` Schema

Top-level shape:

```json
{
  "version": 1,
  "title": "Workout Tracker",
  "theme": {},
  "datasets": {},
  "metrics": {},
  "sections": []
}
```

### Top-level fields

- `version`: config version for future compatibility
- `title`: dashboard title
- `theme`: colors, fonts, spacing, card styles
- `datasets`: named data sources the dashboard can query
- `metrics`: reusable derived values
- `sections`: ordered dashboard blocks

## Datasets

Example:

```json
{
  "workouts": {
    "type": "csv",
    "path": "workouts.csv",
    "date_field": "workout_date"
  },
  "sets": {
    "type": "csv",
    "path": "sets.csv",
    "date_field": "workout_date"
  },
  "routines": {
    "type": "csv",
    "path": "routines.csv"
  }
}
```

Supported dataset source types for V1:

- `csv`
- `json`
- `google_sheet_csv`
- `local_db` (future)

## Metrics

Metrics should be reusable by cards, charts, tables, and roadmap widgets.

Two metric styles are enough for V1:

1. Aggregate metrics
2. Formula metrics

### Aggregate metric

```json
{
  "total_workouts": {
    "aggregate": "count",
    "dataset": "workouts"
  }
}
```

Supported aggregate types:

- `count`
- `sum`
- `avg`
- `min`
- `max`

Supported aggregate fields:

- `dataset`
- `field`
- `filters`
- `round`
- `default`

Example:

```json
{
  "avg_duration_min": {
    "aggregate": "avg",
    "dataset": "workouts",
    "field": "workout_duration_sec",
    "transform": "seconds_to_minutes",
    "round": 1,
    "default": 0
  }
}
```

### Formula metric

Formula metrics can reference other metric ids.

Example:

```json
{
  "consistency_pct": {
    "formula": "round(((full_workouts + half_workouts) / max(total_workouts, 1)) * 100, 0)",
    "default": 0
  }
}
```

Recommended allowed formula functions for V1:

- `round`
- `min`
- `max`
- `abs`

Keep formulas small and safe. Do not allow arbitrary code execution in the first version.

## Filters

Each aggregate metric or section query can use simple filters.

Example:

```json
[
  {
    "field": "exercise_name",
    "op": "contains_ci",
    "value": "push"
  }
]
```

Recommended V1 operators:

- `eq`
- `ne`
- `gt`
- `gte`
- `lt`
- `lte`
- `contains`
- `contains_ci`
- `in`

## Sections

Each section becomes a visible dashboard block.

Recommended V1 widget types:

- `hero`
- `stat_cards`
- `bar_chart`
- `line_chart`
- `table`
- `roadmap`
- `text`

### `hero`

Use for the top header.

Example:

```json
{
  "type": "hero",
  "title": "Workout Tracker",
  "subtitle": "Stage progress and rehab metrics"
}
```

### `stat_cards`

Use for compact metrics like total workouts and average duration.

Example:

```json
{
  "type": "stat_cards",
  "columns": 3,
  "cards": [
    { "label": "Total", "metric": "total_workouts", "color": "green" },
    { "label": "Full", "metric": "full_workouts", "color": "blue" },
    { "label": "Consistency", "metric": "consistency_pct", "suffix": "%", "color": "pink" }
  ]
}
```

### `bar_chart`

Use for per-day or per-workout history.

Example:

```json
{
  "type": "bar_chart",
  "title": "Pushup History",
  "dataset": "sets",
  "group_by": "workout_date",
  "series": [
    {
      "label": "Pushup Reps",
      "aggregate": "sum",
      "field": "actual_reps",
      "filters": [
        { "field": "exercise_name", "op": "contains_ci", "value": "push" }
      ],
      "color": "green"
    }
  ]
}
```

### `line_chart`

Use for duration trends, bodyweight trends, or pain trends.

Example:

```json
{
  "type": "line_chart",
  "title": "Workout Duration",
  "dataset": "workouts",
  "group_by": "workout_date",
  "series": [
    {
      "label": "Minutes",
      "aggregate": "avg",
      "field": "workout_duration_sec",
      "transform": "seconds_to_minutes",
      "color": "blue"
    }
  ]
}
```

### `table`

Use for recent workouts, routines, or personal records.

Example:

```json
{
  "type": "table",
  "title": "Recent Workouts",
  "dataset": "workouts",
  "columns": [
    { "field": "workout_date", "label": "Date" },
    { "field": "routine_name", "label": "Routine" },
    { "field": "classification", "label": "Type" },
    { "field": "workout_duration_sec", "label": "Duration" }
  ],
  "sort": { "field": "workout_date", "direction": "desc" },
  "limit": 10
}
```

### `roadmap`

Use for stage progression like the current rehab roadmap.

Example:

```json
{
  "type": "roadmap",
  "title": "Progression Roadmap",
  "progression_source": "progression_config.json",
  "metric_bindings": {
    "full_workouts_min": "full_workouts",
    "consistency_pct_min": "consistency_pct",
    "pain_better_count_min": "pain_better_count",
    "pushup_session_max_min": "best_pushup_session",
    "avg_duration_min": "avg_duration_min",
    "total_volume_min": "total_volume"
  }
}
```

## Theme

Keep the first version simple.

Example theme keys:

```json
{
  "palette": {
    "base": "#181825",
    "mantle": "#1e1e2e",
    "surface0": "#313244",
    "surface1": "#45475a",
    "text": "#cdd6f4",
    "subtext": "#a6adc8",
    "green": "#a6e3a1",
    "blue": "#89b4fa",
    "pink": "#f5c2e7",
    "yellow": "#f9e2af",
    "teal": "#94e2d5",
    "red": "#f38ba8"
  },
  "radius": {
    "card": 12,
    "section": 10
  },
  "font": {
    "family": "Inter, system-ui, sans-serif"
  }
}
```

## Progression Config

`progression_config.json` should carry roadmap stages instead of keeping them hardcoded in app code.

Each stage should contain:

- `name`
- `subtitle`
- `goal`
- `focus`
- `gate`
- `color`

This makes stage logic editable without changing the app.

## Future Extension Path

Start with pure JSON config.

Later, if needed, allow optional named hooks for:

- custom metrics
- custom chart series
- custom roadmap scoring

Recommended shape:

```json
{
  "custom_hooks": {
    "rehab_risk_score": "rehabRiskScore"
  }
}
```

Then the app can load a trusted hook file and call only known function names. That is safer than executing arbitrary script text from the config.

## Why This Fits The Current Project

Your current project already has the pieces:

- `config.py` defines stage logic and thresholds
- `dashboard_preview.html` defines widgets and layout
- `setup_roadmap.py` defines progression rendering and gate evaluation

This config-driven approach simply moves those ideas into portable data files so the app can generate dashboards from configuration instead of hardcoded page logic.

## Practical Recommendation

For V1 of the app:

1. Build the logger and routine templates first
2. Store normalized `workouts.csv` and `sets.csv`
3. Add one default `dashboard_config.json`
4. Add one default `progression_config.json`
5. Render a mobile dashboard from those files

That gives you a strong default dashboard, while leaving room for custom dashboards later.
