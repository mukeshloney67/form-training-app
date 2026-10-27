# Phase 0 · Usability test plan

## Purpose

Find out whether a new lifter and an experienced lifter can move through the essential training loop without being coached through the interface:

**Find today's workout → start → log a set → understand the next target → handle an unavailable exercise → review progress.**

The prototype is a concept, not a working workout tracker. It contains fictional sample data and does not save sessions after a page refresh.

## Questions to answer

1. Is the next workout obvious from the first screen?
2. Can people understand the target and log weight, reps, and effort while looking at a phone-sized screen?
3. Can they explain why the app recommended a target?
4. Can they replace an exercise without losing confidence about what happens to progression?
5. Does the progress view answer “am I getting stronger?” without implying that one estimate is a perfect measurement?

## Participants

Recruit 5–8 people who strength train, including both:

- Beginners: less than one year of regular lifting.
- Experienced lifters: two or more years of regular lifting.

Ask participants to use their own preferred units where possible. Avoid selecting only people who already use workout-tracking apps.

## Session setup

- Device: phone-sized browser view; use a real phone if available.
- Length: 20–25 minutes per participant.
- Ask permission to take notes. Do not record video unless the participant separately agrees.
- Start by saying: “This is an early prototype. We are testing the design, not you. Please think aloud, and tell me what you expect before you tap.”
- Do not explain where controls are. If someone is stuck, wait, then ask: “What would you try next?”

## Tasks (read verbatim)

1. **Find and prepare:** “You’re at the gym today. Show me what you would do to see today’s workout and get ready to start.”
2. **Review the plan:** “You want to know what lower-body workout is coming up next. Find it and tell me what exercises are planned.”
3. **Log and understand:** “Start today’s workout. Log the first bench set as 60 kg for 8 reps, with about 2 reps left. Tell me what you think the app wants you to do next and why.”
4. **Adapt to the gym:** “The bench station is occupied. Replace the exercise with an option you’d be comfortable doing here. What do you expect to happen to your history and next target?”
5. **Review progress:** “You’ve been training for a month. Use this screen to decide whether your bench press is trending up. What information supports your answer, and what would you still want to know?”

## Observe and record

For each task, note:

- Completed without help / completed with a hint / not completed.
- Time to first correct action and total task time.
- Wrong turns, backtracking, and controls the participant overlooks.
- Their explanation of the target, swap behavior, and progress chart.
- Confidence after the task, rated 1–5.
- Exact phrases they use for confusing or reassuring parts of the interface.

Do not count a task as understood just because the participant reached the right screen. Ask them to explain what they think will happen next.

## Decision thresholds for the next design pass

These are prototype targets, not product guarantees:

- At least 6 of 8 participants find and start the intended workout without help.
- At least 6 of 8 log a set and correctly identify the saved state.
- At least 6 of 8 can describe the reason for the suggested target in their own words.
- At least 6 of 8 can swap an exercise and correctly explain how its future progression will work.
- No repeated critical issue causes data loss, an unintended workout finish, or an unclear destructive change.

If a threshold is missed, revise that flow and retest it before expanding scope. Group recurring issues by task and severity; do not average away a serious failure.

## Known prototype shortcuts

- “FORM” is a temporary name; no brand decision has been made.
- The dates and lifting data are illustrative.
- Set completion, rest countdown, screen navigation, exercise swap, and time-range selection are simulated in the browser.
- The alternative-exercise starting target is intentionally presented as new movement history; no cross-exercise load conversion is asserted.
- Program editing, sign-in, syncing, offline persistence, import, health integrations, and a real recommendation engine are not implemented.
- The chart’s 12-week control changes its label and summary; it does not redraw a real dataset.
