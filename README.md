# TJ Quiz Element

A reusable custom HTML element for creating interactive reading comprehension activities with audio support, vocabulary, and quiz functionality.

## Features

- **Simple Markdown-like Format**: Easy to create content with a clean, readable format
- **Multiple Section Support**: Create multiple vocabulary sets and cloze exercises in a single quiz
- **Audio Integration**: Supports both audio files and text-to-speech fallback
- **Vocabulary Support**: Optional vocabulary definitions (useful for language learning)
- **Fill-in-the-Blank Exercises**: Cloze tests with word banks for each section
- **Randomized Questions**: Automatically shuffles questions and answer options
- **Real-time Feedback**: Shows correct/incorrect answers immediately
- **Score Submission**: Optional score submission to external endpoints
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Toggle between themes
- **Shadow DOM**: Encapsulated styles that won't interfere with your page

## Installation

1. Clone or download this repository
2. Copy `config.template.js` to `config.js` and update it with your configuration:
```bash
cp config.template.js config.js
```
3. Edit `config.js` to include your actual submission URL (if using score submission)
4. Include the JavaScript file in your HTML:
```html
<script type="module" src="tj-quiz-element.js"></script>
```

5. Include the Inter font (recommended):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## Usage

Use the `<tj-quiz-element>` element with content divided by `---` sections:

```html
<tj-quiz-element>
Title Here
---text
Your reading passage goes here. This can be multiple paragraphs of text that students will read and then answer questions about. The passage can include complex vocabulary and concepts that will be tested in the comprehension questions.
---vocab-5
vocabulary: definition, another word: another definition, complex: complicated or difficult to understand
---cloze-3
This fundamental *change* in Little *Red* Riding Hood's character has a ripple effect that alters the entire *story*, most notably by *making* the traditional *rescuer* obsolete.
---audio
audio-src = https://example.com/audio.mp3
---questions-5
Q: What is the main theme of the passage?
A: Wrong answer option
A: Correct answer option [correct]
A: Another wrong option
Q: According to the passage, what does "complex" mean?
A: Simple and easy
A: Complicated or difficult to understand [correct]
A: Very large in size
</tj-quiz-element>
```

## Content Format

The content is divided into labeled sections separated by `---`:

## Question Types

The element supports several built-in section/question types. Use `---type` or `---type-N` (to limit N items) as the section header.

- `text` — The reading passage. Use `---text` and put your passage below the header. This section is optional.
- `vocab` / `vocab-N` — Vocabulary matching. Provide comma-separated `word: definition` pairs. The element generates a matching grid where students choose the correct definition for each word. Adding `-N` (for example `---vocab-4`) randomly limits how many words are shown from that section.
- `cloze` / `cloze-N` — Fill-in-the-blank (cloze) exercises. Surround words to be blanked with asterisks in the text (for example `The *quick* fox`). The element turns selected asterisk-marked words into input blanks and shows a word bank. Use `-N` to limit how many blanks are chosen.
- `audio` — Audio support. Use `---audio` and include `audio-src = URL` to play an audio file; if omitted or invalid, the element falls back to browser text-to-speech (TTS). You may also include `submission-url = ...` here to provide a submission endpoint.
- `questions` / `questions-N` — Multiple-choice questions. Use `Q:` to start a question, `A:` lines for answer options, mark the correct answer with `[correct]`, and optionally include `E:` for an explanation. The section accepts `Q:` or `Q.` prefixes. Use `-N` to limit how many questions are randomly selected.

Notes:
- Multiple sections of the same type are supported (for example several `---vocab` or `---cloze` sections).
- When multiple interactive section types are present (vocab, cloze, questions) the final score is a combined total across those sections.

### Title Section
- **First line**: The title of the reading activity

### Text Section (---text)
- **Format**: `---text`
- **Content**: The reading passage text
- This section can be omitted if no reading passage is needed

### Vocabulary Section (---vocab or ---vocab-N)
- **Format**: `---vocab` or `---vocab-5` (limit to 5 words)
- **Content**: `word: definition, another_word: definition`
- Each vocabulary item is separated by commas
- Word and definition are separated by a colon
- Optional number after vocab limits how many words are randomly selected
- **Multiple sections**: You can have multiple vocabulary sections with different word sets
- This section can be omitted if no vocabulary is needed

### Cloze Section (---cloze or ---cloze-N)
- **Format**: `---cloze` or `---cloze-3` (limit to 3 blanks)
- **Content**: Text with words marked by asterisks: `*word*`
- Words marked with asterisks become fill-in-the-blank exercises
- Optional number after cloze limits how many words are randomly selected for blanks
- **Multiple sections**: You can have multiple cloze exercises, each with its own word bank
- This section can be omitted if no cloze exercise is needed

### Audio Section (---audio)
- **Format**: `---audio`
- **Content**: `audio-src = URL`
- Provides a URL to an audio file
- If omitted or empty, text-to-speech will be used instead
- This section can be omitted if no audio is needed

### Questions Section (---questions or ---questions-N)
- **Format**: `---questions` or `---questions-5` (limit to 5 questions)
- **Content**:
```
Q: Question text here?
A: Wrong answer option
A: Correct answer option [correct]  
A: Another wrong option
Q: Next question?
A: Option 1
A: Option 2 [correct]
A: Option 3
```
- Questions start with `Q:`
- Answer options start with `A:`
- Mark the correct answer with `[correct]` at the end
- Optional number after questions limits how many questions are randomly selected
- This section can be omitted if no questions are needed

## Examples

### Basic Reading Comprehension
```html
<tj-quiz-element>
The Water Cycle
---text
Water moves through our environment in a continuous cycle. First, heat from the sun causes water in oceans, lakes, and rivers to evaporate into water vapor. This vapor rises into the atmosphere where it cools and condenses into tiny droplets that form clouds. When these droplets become heavy enough, they fall back to Earth as precipitation in the form of rain, snow, or hail.
---vocab-3
evaporate: to change from liquid to gas, condense: to change from gas to liquid, precipitation: water falling from clouds as rain or snow
---questions-2
Q: What causes water to evaporate?
A: Cold temperatures
A: Heat from the sun [correct]
A: Strong winds
Q: What happens when water vapor cools in the atmosphere?
A: It falls immediately as rain
A: It condenses into droplets that form clouds [correct]
A: It disappears completely
</tj-quiz-element>
```

### Cloze (Fill-in-the-Blank) Exercise
```html
<tj-quiz-element>
Reading Comprehension Practice
---text
The quick brown fox jumps over the lazy dog. This sentence contains many different letters of the alphabet.
---cloze-2
The *quick* brown fox jumps over the *lazy* dog.
</tj-quiz-element>
```

### Vocabulary-Only Exercise
```html
<tj-quiz-element>
Vocabulary Practice
---vocab-4
transport: to carry or move from one place to another, magical: having special powers, village: small town, discover: to find
</tj-quiz-element>
```

### Multiple Vocabulary Sets
```html
<tj-quiz-element>
Advanced Vocabulary Practice
---vocab-2
analyze: to examine in detail, synthesize: to combine elements into a whole
---vocab-3
hypothesis: an educated guess, variable: a factor that can change, control: to keep constant
</tj-quiz-element>
```

### Multiple Cloze Exercises
```html
<tj-quiz-element>
Reading Practice
---cloze-1
The *scientist* conducted an experiment to test her hypothesis.
---cloze-2
The *results* showed that the *hypothesis* was correct.
</tj-quiz-element>
```

### Mixed Multiple Sections
```html
<tj-quiz-element>
Comprehensive Practice
---text
Science involves careful observation and experimentation. Scientists form hypotheses and test them systematically.
---vocab-2
hypothesis: an educated guess, systematically: in an organized way
---cloze-1
Scientists form *hypotheses* and test them carefully.
---vocab-3
observation: watching carefully, experimentation: testing ideas, conclusion: final result
---questions-2
Q: What do scientists do with hypotheses?
A: Ignore them
A: Test them systematically [correct]
A: Forget about them
Q: What is a hypothesis?
A: A proven fact
A: An educated guess [correct]
A: A random idea
</tj-quiz-element>
```

### With Audio Support
```html
<tj-quiz-element>
A Short Story
---text
Once upon a time, in a small village, there lived a young girl who discovered a magical book that could transport her to different worlds.
---vocab-2
transport: to carry or move from one place to another, magical: having special powers
---audio
audio-src = https://example.com/story-audio.mp3
---questions-1
Q: Where does the story take place?
A: In a big city
A: In a small village [correct]
A: In a forest
</tj-quiz-element>
```

## Customization

### Number of Questions/Vocabulary/Cloze Items
Control how many items are displayed by adding a number after the section type:
```html
---vocab-3     <!-- Show only 3 vocabulary words -->
---cloze-2     <!-- Create only 2 fill-in-the-blank items -->  
---questions-5 <!-- Show only 5 questions -->
```
Without numbers, all items in that section will be used.

### Styling
Override CSS custom properties:
```css
tj-quiz-element {
    --primary-color: #your-color;
    --green-color: #your-green;
    --red-color: #your-red;
}
```

### Submission URL
To enable score submission, add a submission URL in the audio section:
```
---audio
audio-src = https://example.com/audio.mp3
submission-url = https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

## Browser Support

- Modern browsers with Custom Elements support
- Chrome 67+, Firefox 63+, Safari 10.1+, Edge 79+

## Advantages of This Format

1. **Human Readable**: Content creators can easily read and edit the format
2. **Version Control Friendly**: Plain text format works well with Git
3. **No HTML Knowledge Required**: Teachers can create content without knowing HTML
4. **Flexible**: Easy to add or remove sections as needed
5. **Reusable**: Same element works for any reading comprehension activity

## License

MIT License - feel free to use and modify as needed.
