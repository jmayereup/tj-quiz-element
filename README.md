# TJ Quiz Element Authoring Guide

Design interactive listening/reading quizzes with a single custom element. This guide explains how to structure quiz content inside `<tj-quiz-element>` so you can compose passages, instructions, vocabulary, cloze, and question sets without touching JavaScript.

---
## 1. Quick Start

1. **Install files**
   ```bash
   git clone https://github.com/jmayereup/tj-quiz-element.git
   cd tj-quiz-element
   cp config.template.js config.js   # edit submissionUrl if you submit scores
   ```
2. **Reference the component** in your page (fonts optional but recommended):
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
   <script type="module" src="/path/to/tj-quiz-element.js"></script>
   ```
3. **Author a quiz** by placing Markdown-like content between opening/closing tags:
   ```html
   <tj-quiz-element>
   My Quiz Title
   ---text
   First passage...
   ---questions
   Q: Sample question?
   A: Wrong
   A: Correct [correct]
   </tj-quiz-element>
   ```

---
## 2. Anatomy of a Quiz Document

Content inside `<tj-quiz-element>` is parsed sequentially. Each block begins with a delimiter line: `---section-name` or `---section-name-N`. Capitalization does not matter.

| Section token        | Purpose                                                                 | Notes |
|----------------------|-------------------------------------------------------------------------|-------|
| _(title line)_       | First non-empty line becomes the quiz title                             | optional subtitle lines appear in description |
| `---instructions`    | Heading + guidance card for upcoming tasks                              | can repeat anywhere |
| `---text`            | Visible passage card with optional per-passage TTS button               | supports multiple passages |
| `---text-listening`  | Hidden text used only for audio/TTS (listening comp.)                   | renders as blank card with play button |
| `---vocab` / `-N`    | Vocabulary matching table                                               | `N` limits randomly chosen words |
| `---cloze` / `-N`    | Fill-in-the-blank activity with word bank                               | enclose removable words in `*asterisks*` |
| `---questions` / `-N`| Multiple-choice questions (MCQ)                                         | `N` limits random subset per attempt |
| `---audio`           | Provides `audio-src = URL` for a global audio file                      | falls back to TTS when omitted |

Every section renders inside its own “card”, so stacking `text`, `instructions`, `vocab`, etc. gives you a full lesson plan in a single element.

---
## 3. Section Recipes

### 3.1 Instructions
```
---instructions
Reading Strategies
Preview the questions before reading. Focus on discourse markers.
```
- First non-empty line → card heading.
- Remaining lines → body text (line breaks preserved).
- The following interactive section (often `---questions`) appears inside the same card.

### 3.2 Text / Text-Listening
```
---text
Paragraph 1...

Paragraph 2...
---text-listening
Hidden transcript for listening-only prompts.
```
- Each card shows a heading (Passage 1, Passage 2 …) and its own play/pause button.
- `text-listening` keeps the transcript in the DOM (for screen readers / TTS) but hides the paragraphs visually.

### 3.3 Vocabulary
```
---vocab-4
protein: nutrient that builds muscle
metabolism: how the body uses energy
hydration: keeping enough water
endurance: ability to keep going
```
- Preferred format: one `word: definition` pair per line.
- Legacy comma-separated format still works but isn’t recommended.
- `-4` randomly selects four words each attempt; omit the number to show every entry.

### 3.4 Cloze
```
---cloze-3
Staying *hydrated* helps your *body* regulate *temperature*.
```
- Wrap removable words in `*asterisks*`.
- `-N` randomly chooses how many blanks to keep. Remaining starred words render normally.
- Line breaks are preserved, so keep your original formatting.

### 3.5 Audio
```
---audio
audio-src = https://cdn.example.com/lesson.mp3
```
- Optional. When omitted or unreachable, built-in Text-to-Speech reads the passage text.

### 3.6 Questions
```
---questions-5
Q: What is the best note-taking strategy?
A: Ignore key words.
A: Capture headings and signal words. [correct]
A: Write every sentence.
E: Look for discourse markers (however, therefore, because...).
```
- Start each prompt with `Q:` (or `Q.`). Answers begin with `A:`.
- Append `[correct]` to the right answer.
- Optional explanation lines start with `E:` and appear after students check their score.
- `-5` limits each attempt to five randomly chosen questions from that block.

---
## 4. Putting Sections Together

Sections render in the order authored. A typical flow:

1. Title line
2. `---instructions` (pre-reading directions)
3. `---text`
4. `---questions` (linked to latest text/instruction card)
5. Optional `---vocab` / `---cloze` / additional `---instructions` cards

Whenever a `---questions` block appears after a `---text` or `---instructions` block, the MCQs attach to that card so headings stay meaningful.

Use multiple cards to mix skills:
```html
<tj-quiz-element>
Digital Literacy Quiz
---instructions
Preview Questions
Read the prompts below before the passage.
---text
Paragraph about online privacy...
---questions-3
...
---vocab-4
firewall: ...
encrypt: ...
---cloze-2
Protect *personal* data with *strong* passwords.
</tj-quiz-element>
```

---
## 5. Randomization & Attempts

- Sections with `-N` redraw selections every time students click **Try Again**.
- Answer order is automatically shuffled.
- Feedback for MCQs/vocab/cloze is hidden until **Check My Score**.
- After checking, scores submit automatically (if `submissionUrl` is configured) and students can retry for a new set.

---
## 6. Score Submission (Optional)

`config.js` exposes `submissionUrl`. When present:
- Student info is collected before the quiz unlocks.
- Clicking **Check My Score** grades the attempt and auto-posts JSON `{ nickname, homeroom, studentId, score, total, timestamp }` to your endpoint.
- The “Resend Score” button appears only if a submission fails or if you want to allow manual resubmission.

---
## 7. Building & Distributing

Use the provided build script to copy `tj-quiz-element.js`, `template.html`, and `styles.css` into `dist/` for deployment:
```bash
npm install   # only needed the first time
npm run build
```
Host the files (or bundle in your own build pipeline) and reference them with a `<script type="module">` tag.

---
## 8. Sample Blueprints

### 8.1 Reading + Cloze + MCQ
```html
<tj-quiz-element>
B1 English Practice
---instructions
Before You Read
Skim the questions so you know what to look for.
---text
User-generated content (UGC)...
---questions-4
Q: Why do companies encourage UGC?
A: It is expensive.
A: It builds trust with other customers. [correct]
A: It replaces all marketing teams.
---cloze-2
Creating *content* online lets you build *community*.
</tj-quiz-element>
```

### 8.2 Listening-Only Scenario
```html
<tj-quiz-element>
Morning Routine Listening Task
---instructions
Directions
Listen carefully. The transcript is hidden, so rely on the audio.
---text-listening
I make tea, read the news, and stretch before work.
---questions-2
Q: What drink does the speaker make?
A: Coffee
A: Tea [correct]
A: Juice
</tj-quiz-element>
```

### 8.3 Vocabulary Workshop
```html
<tj-quiz-element>
Academic Vocabulary Sprint
---instructions
How to earn points
Match each word with its definition before the timer ends.
---vocab-6
synthesize: combine ideas
infer: use clues to reach a decision
cite: reference a source
paraphrase: restate in your own words
justify: explain with evidence
critique: evaluate strengths and weaknesses
</tj-quiz-element>
```

With these patterns you can build rich literacy activities by editing a single HTML snippet. Happy authoring!# TJ Quiz Element

MIT License - feel free to use and modify as needed.
