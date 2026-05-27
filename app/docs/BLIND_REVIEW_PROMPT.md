# Blind Review Prompt

Purpose: test whether the UI can explain itself before any architecture or interaction docs are shown.

Use this prompt with screenshots only, or with a live app if the reviewer truly has only UI access.
Do not provide contracts, specs, changelogs, implementation summaries, or code.

## Why This Exists
- A strong UI should communicate object type, state, and likely action on its own.
- This pass tests readability, hierarchy, naming, scanability, and visible affordance.
- This pass should reveal what the UI actually says, not what the team intended it to say.

## Inputs
- Screenshots only
- Optional: a short task list
- Prefer neutral filenames like `screen-01-mobile.png` instead of semantic filenames when possible

## Rules For The Reviewer
- Treat the review as independent.
- Assume nothing beyond what is visible.
- Do not assume labels are correct.
- Do not assume a tappable-looking element is actually tappable.
- Do not infer implementation details, hidden logic, or backend behavior.
- If filenames or surrounding text leak product meaning, ignore that context as much as possible and review the visible UI.
- If uncertain, say so explicitly.
- Infer the object model only from the screenshots.
- Label findings as `Observed`, `Unclear`, or `Inferred`.
- Treat only `Observed` issues as confirmed UX problems.

## Questions To Answer
1. What is this screen trying to help the user do?
2. What are the main objects on the screen?
3. What does each major card, row, chip, badge, and section appear to represent?
4. Which elements appear interactive?
5. What do you think happens when each interactive element is tapped?
6. Which labels feel internal, vague, duplicated, or misleading?
7. Which objects are easy to identify and which are ambiguous?
8. Does the screen feel mobile-first, or like compressed desktop?
9. What parts would confuse a first-time user?
10. What hierarchy do you infer from the screen alone?

## Required Output Shape
- Screenshot-Based Description
- Inferred Object Model
- What Looks Interactive
- What Is Clear
- What Is Ambiguous Or Misleading
- Highest-Risk Readability Problems

## Quality Bar
A good blind review should describe:
- what the screen is
- what each important object is
- what state it is in
- what action appears available
- confidence level when interpretation is uncertain

## Prompt Template
Use files directly from:
`[FOLDER_PATH]`

Review the screenshots only.
Do not use any additional docs or context yet.

Treat this as a blind readability and interaction-inference review.
Your job is to describe what the UI communicates on its own.

Instructions:
- Be critical.
- Do not assume the product model is correct.
- Infer the hierarchy only from what is visible.
- If you are uncertain, say so and explain why.
- Focus on what a first-time user would understand.
- Do not use code, contracts, or implementation assumptions.
- Label findings as `Observed`, `Unclear`, or `Inferred` where relevant.

Please answer:
1. What is each screen for?
2. What is each major object or card?
3. Which elements appear interactive?
4. What do you think each tap would do?
5. Which labels feel internal, vague, or duplicated?
6. Which screens or objects are strongest?
7. Which screens or objects are most confusing?
8. What hierarchy do you infer from the screenshots alone?

Please structure your answer as:
- Screenshot-Based Description
- Inferred Object Model
- What Looks Interactive
- What Is Clear
- What Is Ambiguous Or Misleading
- Highest-Risk Readability Problems
