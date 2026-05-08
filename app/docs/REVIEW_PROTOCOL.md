# Review Protocol

This project uses a two-AI review system:
- GPT-5.4 (via opencode): implementation
- Claude (claude.ai): architecture review and philosophy guard

## When To Stop And Get Human + Claude Review

### ALWAYS review before implementing:
- Any change to data schemas in SPEC.md
- Any new repository or localStorage key
- Any new feature not previously discussed
- Any change to progression engine logic
- Any change to how sessions are written or read
- Any UI that introduces user choices during execution mode
- Any feature that makes the app interpret data and act on it
- Any external dependency or library addition
- Any deviation from the architecture rules in ARCHITECTURE.md

### ALWAYS review after implementing:
- Any new screen (paste screenshots to Claude)
- Any major UI change (paste screenshots to Claude)
- End of every feature before marking complete

### Never needs review:
- Bug fixes with a known, isolated cause
- Grammar or copy fixes
- CSS tweaks within existing patterns
- Playwright test writing
- Renaming variables to match existing spec

## The Review Process

BEFORE BUILDING A NEW FEATURE:
1. Stop. Do not write code yet.
2. Human describes the feature to Claude.
3. Claude confirms it fits architecture and philosophy.
4. Claude writes the implementation prompt.
5. GPT implements using that prompt.

AFTER BUILDING:
1. Run Playwright tests.
2. Take screenshots of affected screens.
3. Human pastes screenshots + GPT summary to Claude.
4. Claude reviews against SPEC.md, VISION.md, ARCHITECTURE.md.
5. Claude either approves or gives a fix list.
6. GPT fixes any issues found.
7. Repeat until approved.

WHEN GPT SUGGESTS SOMETHING UNPLANNED:
1. Stop. Do not implement it.
2. Paste the suggestion to Claude.
3. Claude evaluates against product philosophy.
4. Human decides yes or no.
5. If yes: Claude writes the prompt. GPT implements.
6. If no: document the rejection in DECISIONS.md.

## Red Flags — Stop Immediately If GPT Suggests:
- Adding a recommendation or suggestion engine
- Interpreting reflection/session data to change app behaviour
- Adding analytics charts to the main UI
- Adding social or sharing features
- Using activeState nested object
- Storing exercise names instead of exerciseId
- Writing session data to the active plan object
- Adding any external library or framework
- Modifying schema field names without updating SPEC.md

## After Any Approved Change
1. Update CHANGELOG.md with what changed and which files
2. Update SPEC.md if any schema changed
3. Update DECISIONS.md if a significant decision was made
4. Update ONBOARDING.md current state section
Rule: docs update in the same commit as the code change.
