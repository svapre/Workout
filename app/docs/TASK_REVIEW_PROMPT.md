# Task Review Prompt

Purpose: test whether a user can complete realistic goals from the visible UI before validating against internal contracts.

Use this prompt after the blind review pass.
Provide screenshots plus a short task list.
Do not provide contracts yet.

## Why This Exists
- A screen can look clear in isolation and still fail real user goals.
- This pass tests task flow, orientation, likely taps, and whether the UI reveals the next useful move.
- This pass keeps the review grounded in use, not only description.

## Inputs
- Screenshots
- A short task list

## Good Task Types
- Start today's workout
- Find what unlocks the next stage
- Understand what Stage 3 is trying to achieve
- Compare two blueprints
- Find the milestone test
- Open the routine behind a stage step
- Review a past session

## Rules For The Reviewer
- Use the screenshots and task list only.
- Do not use contracts or design docs yet.
- Infer the most likely path through the UI.
- If multiple paths seem possible, say which one appears primary.
- If a task cannot be completed confidently from what is visible, call that out directly.

## Questions To Answer
1. Can the user discover the right starting point for each task?
2. Does each screen make the next action obvious?
3. Are likely taps and destinations legible enough?
4. Where would a user hesitate, guess, or backtrack?
5. Which tasks are easy, mixed, or fragile?
6. Which screens make the user read too much before acting?
7. Which compact surfaces fail the item / state / action test?

## Required Output Shape
- Task Walkthroughs
- Where The Flow Is Obvious
- Where The Flow Breaks
- Highest-Risk Task Failures
- Suggested Fixes By Leverage

## Prompt Template
Use files directly from:
`[FOLDER_PATH]`

Review the screenshots using only the tasks below.
Do not use any other docs or context yet.

Tasks:
- [TASK_1]
- [TASK_2]
- [TASK_3]
- [TASK_4]
- [TASK_5]

Instructions:
- Treat this as a task-based UI review.
- Infer the path a first-time user would most likely take.
- If a task is ambiguous, explain where the ambiguity starts.
- If a task appears impossible from the visible UI, say so clearly.
- Focus on mobile-first clarity when phone screenshots are provided.

Please answer:
1. For each task, where would the user start?
2. What would they likely tap next?
3. Where would they hesitate or misinterpret the screen?
4. Which tasks are easy, mixed, or high-risk?
5. What are the top fixes that would improve task success most?

Please structure your answer as:
- Task Walkthroughs
- Where The Flow Is Obvious
- Where The Flow Breaks
- Highest-Risk Task Failures
- Suggested Fixes By Leverage
