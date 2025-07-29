# TJ Quiz Element

A reusable custom HTML element for creating interactive reading comprehension activities with audio support, vocabulary, and quiz functionality.

## Features

- **Simple Markdown-like Format**: Easy to create content with a clean, readable format
- **Audio Integration**: Supports both audio files and text-to-speech fallback
- **Vocabulary Support**: Optional vocabulary definitions (useful for language learning)
- **Randomized Questions**: Automatically shuffles questions and answer options
- **Real-time Feedback**: Shows correct/incorrect answers immediately
- **Score Submission**: Optional score submission to external endpoints
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Theme**: Toggle between themes
- **Shadow DOM**: Encapsulated styles that won't interfere with your page

## Installation

1. Include the JavaScript file in your HTML:
```html
<script src="tj-quiz-element.js"></script>
```

2. Include the Inter font (recommended):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## Usage

Use the `<tj-quiz-element>` element with content divided by `---` sections:

```html
<tj-quiz-element>
Your Title Here
---
Your reading passage goes here. This can be multiple paragraphs of text that students will read and then answer questions about. The passage can include complex vocabulary and concepts that will be tested in the comprehension questions.
---
vocabulary: definition, another word: another definition, complex: complicated or difficult to understand
---
audio-src = https://example.com/audio.mp3
---
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

The content is divided into sections separated by `---`:

### Section 1: Title and Passage
- **First line**: The title of the reading
- **Remaining lines**: The reading passage text

### Section 2: Vocabulary (Optional)
Format: `word: definition, another_word: definition`
- Each vocabulary item is separated by commas
- Word and definition are separated by a colon
- This section can be omitted if no vocabulary is needed

### Section 3: Audio (Optional)  
Format: `audio-src = URL`
- Provides a URL to an audio file
- If omitted or empty, text-to-speech will be used instead
- Other audio settings can be added here in the future

### Section 4: Questions
Format:
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
- You can have as many questions as needed
- The system will randomly select 5 questions to display

## Examples

### Basic Reading Comprehension
```html
<tj-quiz-element>
The Water Cycle
---
Water moves through our environment in a continuous cycle. First, heat from the sun causes water in oceans, lakes, and rivers to evaporate into water vapor. This vapor rises into the atmosphere where it cools and condenses into tiny droplets that form clouds. When these droplets become heavy enough, they fall back to Earth as precipitation in the form of rain, snow, or hail.
---
evaporate: to change from liquid to gas, condense: to change from gas to liquid, precipitation: water falling from clouds as rain or snow
---
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

### With Audio Support
```html
<tj-quiz-element>
A Short Story
---
Once upon a time, in a small village, there lived a young girl who discovered a magical book that could transport her to different worlds.
---
transport: to carry or move from one place to another, magical: having special powers
---
audio-src = https://example.com/story-audio.mp3
---
Q: Where does the story take place?
A: In a big city
A: In a small village [correct]
A: In a forest
</tj-quiz-element>
```

## Customization

### Number of Questions
By default, 5 random questions are selected. Modify this in the JavaScript:
```javascript
this.questionsToDisplay = 8; // Show 8 questions instead of 5
```

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
