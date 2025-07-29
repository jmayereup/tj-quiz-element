class TjQuizElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.questionBank = [];
        this.currentQuestions = [];
        this.vocabulary = {};
        this.score = 0;
        this.questionsAnswered = 0;
        this.questionsToDisplay = 5;
        this.totalQuestions = this.questionsToDisplay;
        this.audioPlayer = null;
        this.utterance = null;
        this.audioSrc = '';
        this.submissionUrl = '';
        this.title = '';
        this.passage = '';
    }

    async connectedCallback() {
        // Store the original content before rendering shadow DOM
        this.originalContent = this.textContent;
        await this.loadTemplate();
        this.parseContent();
        this.setupEventListeners();
        this.generateQuiz();
    }

    async loadTemplate() {
        try {
            console.log('Attempting to load external templates...');
            
            // Now that we're loaded as a module, we can use import.meta.url
            const templateUrl = new URL('template.html', import.meta.url);
            const stylesUrl = new URL('styles.css', import.meta.url);
            
            const templateResponse = await fetch(templateUrl);
            console.log('Template response status:', templateResponse.status);
            
            if (!templateResponse.ok) {
                throw new Error(`Template fetch failed: ${templateResponse.status}`);
            }
            
            const templateHtml = await templateResponse.text();
            console.log('Template loaded, length:', templateHtml.length);
            
            // Load styles.css
            const stylesResponse = await fetch(stylesUrl);
            console.log('Styles response status:', stylesResponse.status);
            
            if (!stylesResponse.ok) {
                throw new Error(`Styles fetch failed: ${stylesResponse.status}`);
            }
            
            const stylesText = await stylesResponse.text();
            console.log('Styles loaded, length:', stylesText.length);
            
            // Create template element and add styles properly
            const template = document.createElement('template');
            template.innerHTML = `<style>${stylesText}</style>${templateHtml}`;
            
            this.shadowRoot.appendChild(template.content.cloneNode(true));
            console.log('External template applied successfully');
            
        } catch (error) {
            console.warn('Failed to load external template, using inline fallback:', error);
            this.renderInline();
        }
    }

    parseContent() {
        const content = this.originalContent || this.textContent;
        console.log('Parsing content:', content.substring(0, 200) + '...');
        
        // Split content by --- sections
        const sections = content.split('---').map(s => s.trim());
        
        if (sections.length >= 1) {
            // First section is the title (first line)
            const titleSection = sections[0].trim();
            const lines = titleSection.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length > 0) {
                this.title = lines[0]; // First line is title
            }
        }
        
        // Parse each labeled section
        for (let i = 1; i < sections.length; i++) {
            const section = sections[i];
            const lines = section.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length === 0) continue;
            
            const sectionType = lines[0].toLowerCase();
            const sectionContent = lines.slice(1).join('\n').trim();
            
            switch (sectionType) {
                case 'text':
                    this.passage = sectionContent;
                    break;
                case 'vocab':
                    this.parseVocabulary(sectionContent);
                    break;
                case 'audio':
                    this.parseAudio(sectionContent);
                    break;
                case 'questions':
                    this.parseQuestions(sectionContent);
                    break;
            }
        }
        
        // Update the rendered content
        this.shadowRoot.getElementById('quizTitle').textContent = this.title || 'TJ Quiz Element';
        this.shadowRoot.getElementById('quizDescription').textContent = 'Read the passage, then answer the questions below.';
        this.shadowRoot.getElementById('passageText').textContent = this.passage;
        
        console.log('Parsed:', {
            title: this.title,
            passageLength: this.passage.length,
            vocabularyCount: Object.keys(this.vocabulary).length,
            audioSrc: this.audioSrc,
            questionsCount: this.questionBank.length
        });
    }

    parseVocabulary(vocabSection) {
        if (!vocabSection) return;
        
        // Parse vocabulary: word: definition, word: definition
        const vocabPairs = vocabSection.split(',');
        vocabPairs.forEach(pair => {
            const [word, definition] = pair.split(':').map(s => s.trim());
            if (word && definition) {
                this.vocabulary[word] = definition;
            }
        });
    }

    parseAudio(audioSection) {
        if (!audioSection) return;
        
        // Look for audio-src = URL
        const audioMatch = audioSection.match(/audio-src\s*=\s*(.+)/);
        if (audioMatch) {
            this.audioSrc = audioMatch[1].trim();
        }
    }

    parseQuestions(questionsSection) {
        if (!questionsSection) return;
        
        const lines = questionsSection.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let currentQuestion = null;
        
        for (const line of lines) {
            if (line.startsWith('Q:')) {
                // New question
                if (currentQuestion) {
                    this.questionBank.push(currentQuestion);
                }
                currentQuestion = {
                    q: line.substring(2).trim(),
                    o: [],
                    a: '',
                    e: '' // explanation
                };
            } else if (line.startsWith('A:') && currentQuestion) {
                // Answer option
                const answerText = line.substring(2).trim();
                const isCorrect = answerText.includes('[correct]');
                const cleanAnswer = answerText.replace('[correct]', '').trim();
                
                currentQuestion.o.push(cleanAnswer);
                if (isCorrect) {
                    currentQuestion.a = cleanAnswer;
                }
            } else if (line.startsWith('E:') && currentQuestion) {
                // Explanation
                currentQuestion.e = line.substring(2).trim();
            }
        }
        
        // Don't forget the last question
        if (currentQuestion) {
            this.questionBank.push(currentQuestion);
        }
    }

    renderInline() {
        // Fallback inline template with comprehensive styles
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    --bg-light: #f1f5f9;
                    --text-light: #1e293b;
                    --card-bg-light: #ffffff;
                    --card-shadow-light: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    --border-light: #e2e8f0;
                    --input-bg-light: #f8fafc;
                    --input-border-light: #cbd5e1;
                    --subtle-text-light: #475569;
                    --primary-color: #4f46e5;
                    --primary-hover: #4338ca;
                    --primary-text: #ffffff;
                    --green-color: #16a34a;
                    --green-hover: #15803d;
                    --green-light-bg: #dcfce7;
                    --red-color: #ef4444;
                    --red-light-bg: #fee2e2;
                    --yellow-color: #eab308;
                    --slate-color: #64748b;
                    --slate-hover: #475569;
                    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }
                
                :host(.dark) {
                    --bg-light: #0f172a;
                    --text-light: #e2e8f0;
                    --card-bg-light: #1e293b;
                    --card-shadow-light: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
                    --border-light: #334155;
                    --input-bg-light: #334155;
                    --input-border-light: #475569;
                    --subtle-text-light: #94a3b8;
                    --green-light-bg: #14532d;
                    --red-light-bg: #7f1d1d;
                }
                
                .quiz-wrapper * { box-sizing: border-box; }
                .quiz-wrapper { 
                    font-family: var(--font-sans); 
                    background-color: var(--bg-light); 
                    color: var(--text-light); 
                    line-height: 1.6; 
                    transition: background-color 0.3s, color 0.3s; 
                    padding: 1rem 0; 
                }
                .quiz-wrapper p { font-size: 1em; margin-bottom: 1rem; }
                .container { max-width: 800px; margin: 0 auto; padding: 0 1rem; }
                .quiz-card { 
                    background-color: var(--card-bg-light); 
                    border-radius: 0.75rem; 
                    box-shadow: var(--card-shadow-light); 
                    overflow: hidden; 
                    transition: background-color 0.3s;
                }
                .quiz-header { 
                    background-color: var(--primary-color); 
                    color: var(--primary-text); 
                    padding: 1.5rem; 
                    position: relative; 
                }
                .quiz-header h1 { font-size: 1.5em; font-weight: 700; margin: 0; }
                .quiz-header p { margin-top: 0.5rem; color: #e0e7ff; opacity: 0.9; font-size: 0.9375em; }
                .theme-toggle { 
                    position: absolute; 
                    top: 1rem; 
                    right: 1rem; 
                    cursor: pointer; 
                    padding: 0.5rem; 
                    border-radius: 50%; 
                    background-color: rgba(255, 255, 255, 0.1); 
                    color: white; 
                    border: none;
                    font-size: 1.25em;
                }
                .theme-toggle:hover { background-color: rgba(255, 255, 255, 0.2); }
                form { padding: 2rem; }
                fieldset { border: none; padding: 0; margin: 0 0 2rem 0; }
                .legend-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--border-light);
                    padding-bottom: 0.5rem;
                    margin-bottom: 1rem;
                }
                legend { font-size: 1.125em; font-weight: 600; color: var(--text-light); margin: 0; }
                .reading-instructions {
                    font-size: 0.9em;
                    color: var(--subtle-text-light);
                    margin-bottom: 1.5rem;
                    margin-top: -0.5rem;
                }
                .audio-toggle {
                    cursor: pointer;
                    padding: 0.75rem;
                    border-radius: 50%;
                    background-color: var(--primary-color);
                    border: none;
                    color: var(--primary-text);
                    transition: background-color 0.2s;
                }
                .audio-toggle:hover { background-color: var(--primary-hover); }
                .audio-toggle svg { width: 1.5em; height: 1.5em; }
                .passage-content { 
                    background-color: var(--input-bg-light); 
                    border-radius: 0.5rem; 
                    padding: 1.5rem; 
                    margin-bottom: 1.5rem; 
                    border: 1px solid var(--border-light); 
                    line-height: 1.7; 
                }
                .question-block { padding-top: 1.5rem; border-top: 1px solid var(--border-light); }
                .question-block:first-of-type { border-top: none; padding-top: 0; }
                .question-text { font-weight: 600; margin-bottom: 1rem; font-size: 1em; }
                .options-group { display: flex; flex-direction: column; gap: 0.75rem; }
                .option-label { 
                    display: flex; 
                    align-items: center; 
                    padding: 1rem; 
                    background-color: var(--input-bg-light); 
                    border-radius: 0.5rem; 
                    cursor: pointer; 
                    border: 1px solid transparent; 
                    transition: background-color 0.3s, border-color 0.3s;
                    font-size: 0.9375em;
                }
                .option-label:hover { background-color: #e2e8f0; }
                :host(.dark) .option-label:hover { background-color: #334155; }
                .option-label.correct { 
                    background-color: var(--green-light-bg); 
                    border-color: var(--green-color); 
                }
                .option-label.incorrect { 
                    background-color: var(--red-light-bg); 
                    border-color: var(--red-color); 
                }
                .form-radio { 
                    width: 1.125em; 
                    height: 1.125em; 
                    margin-right: 0.75em; 
                    accent-color: var(--primary-color); 
                    flex-shrink: 0;
                }
                .form-radio:disabled { cursor: not-allowed; }
                .feedback-icon { margin-left: auto; font-size: 1.25em; }
                .explanation {
                    margin-top: 1rem;
                    padding: 1rem;
                    background-color: var(--input-bg-light);
                    border-radius: 0.5rem;
                    border-left: 4px solid var(--primary-color);
                    font-size: 0.9em;
                    line-height: 1.5;
                }
                .explanation-content strong { color: var(--primary-color); }
                .button { 
                    width: 100%; 
                    font-weight: 600; 
                    padding: 0.875rem 1.5rem; 
                    border-radius: 0.5rem; 
                    border: none; 
                    cursor: pointer; 
                    background-color: var(--primary-color); 
                    color: var(--primary-text);
                    font-size: 1em;
                    transition: all 0.2s ease-in-out;
                }
                .button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                    background-color: var(--primary-hover);
                }
                .button:disabled {
                    background-color: #94a3b8;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }
                .actions-container {
                    padding-top: 1.5rem;
                    border-top: 1px solid var(--border-light);
                    margin-top: 2rem;
                }
                .hidden { display: none !important; }
            </style>
            <div class="quiz-wrapper">
                <div class="container">
                    <div class="quiz-card">
                        <div class="quiz-header">
                            <button class="theme-toggle" title="Toggle Light/Dark Mode">
                                <span class="light-icon">☀️</span>
                                <span class="dark-icon hidden">🌙</span>
                            </button>
                            <h1 id="quizTitle">TJ Quiz Element</h1>
                            <p id="quizDescription">Read the passage, then answer the questions below.</p>
                        </div>
                        <form id="quizForm">
                            <fieldset id="readingSection">
                                <div class="legend-container">
                                    <legend>Reading Passage</legend>
                                    <button type="button" class="audio-toggle" title="Play Audio">
                                        <svg class="play-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                        <svg class="pause-icon hidden" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                                    </button>
                                </div>
                                <p class="reading-instructions">Click the play button to hear the passage, then read along and answer the questions below.</p>
                                <div class="passage-content">
                                    <p id="passageText"></p>
                                </div>
                            </fieldset>
                            <fieldset id="questionsSection">
                                <legend>Comprehension Questions</legend>
                            </fieldset>
                            <div id="checkScoreContainer" class="actions-container">
                                <button type="submit" id="checkScoreButton" class="button">Check My Score</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        console.log('Using inline fallback template');
    }

    setupEventListeners() {
        const quizForm = this.shadowRoot.getElementById('quizForm');
        const sendButton = this.shadowRoot.getElementById('sendButton');
        const tryAgainButton = this.shadowRoot.getElementById('tryAgainButton');
        const themeToggle = this.shadowRoot.querySelector('.theme-toggle');

        quizForm.addEventListener('change', (e) => this.handleAnswer(e));
        quizForm.addEventListener('submit', (e) => this.handleSubmit(e));
        sendButton.addEventListener('click', () => this.sendScore());
        tryAgainButton.addEventListener('click', () => this.resetQuiz());
        themeToggle.addEventListener('click', () => this.toggleTheme());

        this.shadowRoot.addEventListener('click', (event) => {
            const audioToggle = event.target.closest('.audio-toggle');
            if (audioToggle) {
                this.handleAudioToggle();
            }
        });
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    setAudioIcon(state) {
        const playIcon = this.shadowRoot.querySelector('.play-icon');
        const pauseIcon = this.shadowRoot.querySelector('.pause-icon');
        if (state === 'playing') {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    }
    
    stopAllAudio() {
        if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.paused)) {
            window.speechSynthesis.cancel();
        }
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer.currentTime = 0;
        }
        this.setAudioIcon('paused');
    }

    handleTTS() {
        if (this.audioPlayer && !this.audioPlayer.paused) this.audioPlayer.pause();
        
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            this.setAudioIcon('playing');
        } else if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            this.setAudioIcon('paused');
        } else {
            this.utterance = new SpeechSynthesisUtterance(this.passage);
            this.utterance.onstart = () => this.setAudioIcon('playing');
            this.utterance.onend = () => this.setAudioIcon('paused');
            this.utterance.onerror = (e) => {
                console.error("TTS Error:", e);
                this.setAudioIcon('paused');
            };
            window.speechSynthesis.speak(this.utterance);
        }
    }

    handleAudioFile() {
        if (window.speechSynthesis.speaking || window.speechSynthesis.paused) window.speechSynthesis.cancel();
        
        if (!this.audioPlayer) {
            this.audioPlayer = new Audio(this.audioSrc);
            this.audioPlayer.onplaying = () => this.setAudioIcon('playing');
            this.audioPlayer.onpause = () => this.setAudioIcon('paused');
            this.audioPlayer.onended = () => this.setAudioIcon('paused');
            this.audioPlayer.onerror = (e) => {
                console.error("Audio file error. Falling back to TTS.", e);
                this.audioPlayer = null; 
                this.handleTTS();
            };
        }
        if (this.audioPlayer.paused) {
            this.audioPlayer.play();
        } else {
            this.audioPlayer.pause();
        }
    }

    handleAudioToggle() {
        if (this.audioSrc && this.audioSrc.trim() !== "") {
            this.handleAudioFile();
        } else {
            this.handleTTS();
        }
    }

    createQuestionBlock(q, index) {
        const questionId = `q${index}`;
        const shuffledOptions = [...q.o];
        this.shuffleArray(shuffledOptions);
        const optionsHtml = shuffledOptions.map(option => `
            <label class="option-label">
                <input type="radio" name="${questionId}" value="${option}" class="form-radio" required>
                <span>${option}</span>
            </label>
        `).join('');
        
        const explanationHtml = q.e ? `<div class="explanation hidden" id="explanation-${questionId}">
            <div class="explanation-content">
                <strong>Explanation:</strong> ${q.e}
            </div>
        </div>` : '';
        
        const questionBlock = document.createElement('div');
        questionBlock.className = 'question-block';
        questionBlock.innerHTML = `
            <p class="question-text">${index + 1}. ${q.q}</p>
            <div class="options-group">${optionsHtml}</div>
            ${explanationHtml}
        `;
        return questionBlock;
    }
    
    generateQuiz() {
        const questionsSection = this.shadowRoot.getElementById('questionsSection');
        const checkScoreButton = this.shadowRoot.getElementById('checkScoreButton');
        
        console.log('generateQuiz called, questionBank length:', this.questionBank.length);
        
        // Clear previous questions
        const existingQuestionBlocks = questionsSection.querySelectorAll('.question-block');
        existingQuestionBlocks.forEach(block => block.remove());
        
        this.score = 0;
        this.questionsAnswered = 0;
        checkScoreButton.disabled = true;

        // Generate questions
        this.shuffleArray(this.questionBank);
        this.currentQuestions = this.questionBank.slice(0, this.questionsToDisplay);
        this.totalQuestions = Math.min(this.questionsToDisplay, this.questionBank.length);
        
        console.log('Current questions:', this.currentQuestions.length);
        
        this.currentQuestions.forEach((q, index) => {
            questionsSection.appendChild(this.createQuestionBlock(q, index));
        });
    }

    handleAnswer(e) {
        if (e.target.type !== 'radio' || e.target.dataset.answered) return;

        const selectedRadio = e.target;
        const questionName = selectedRadio.name;
        const questionIndex = parseInt(questionName.substring(1));
        
        const questionData = this.currentQuestions[questionIndex];

        if (selectedRadio.value === questionData.a) {
            this.score++;
        }
        this.questionsAnswered++;

        const radioButtons = this.shadowRoot.querySelectorAll(`input[name="${questionName}"]`);
        radioButtons.forEach(radio => {
            const label = radio.closest('.option-label');
            radio.disabled = true;
            radio.dataset.answered = 'true';
            label.style.cursor = 'default';
            
            let feedbackIcon = label.querySelector('.feedback-icon');
            if (!feedbackIcon) {
                feedbackIcon = document.createElement('span');
                feedbackIcon.className = 'feedback-icon';
                label.appendChild(feedbackIcon);
            }

            if (radio.value === questionData.a) {
                label.classList.add('correct');
                feedbackIcon.textContent = '✅';
            } else if (radio.checked) {
                label.classList.add('incorrect');
                feedbackIcon.textContent = '❌';
            }
        });
        
        // Show explanation if available
        const explanation = this.shadowRoot.getElementById(`explanation-${questionName}`);
        if (explanation) {
            explanation.classList.remove('hidden');
        }
        
        if (this.questionsAnswered === this.totalQuestions) {
            this.shadowRoot.getElementById('checkScoreButton').disabled = false;
        }
    }

    handleSubmit(e) {
        e.preventDefault(); 
        this.showFinalScore();
    }

    showFinalScore() {
        const resultScore = this.shadowRoot.getElementById('resultScore');
        const readingSection = this.shadowRoot.getElementById('readingSection');
        const questionsSection = this.shadowRoot.getElementById('questionsSection');
        const checkScoreContainer = this.shadowRoot.getElementById('checkScoreContainer');
        const resultArea = this.shadowRoot.getElementById('resultArea');
        const studentInfoSection = this.shadowRoot.getElementById('studentInfoSection');
        const postScoreActions = this.shadowRoot.getElementById('postScoreActions');
        
        resultScore.textContent = `${this.score} / ${this.totalQuestions}`;
        const scorePercentage = this.score / this.totalQuestions;
        resultScore.className = '';
        if (scorePercentage >= 0.8) resultScore.classList.add('high');
        else if (scorePercentage >= 0.5) resultScore.classList.add('medium');
        else resultScore.classList.add('low');
        
        readingSection.classList.add('hidden');
        questionsSection.classList.add('hidden');
        checkScoreContainer.classList.add('hidden');
        resultArea.classList.remove('hidden');
        studentInfoSection.classList.remove('hidden');
        postScoreActions.classList.remove('hidden');
        
        this.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.stopAllAudio();
    }

    sendScore() {
        const validationMessage = this.shadowRoot.getElementById('validationMessage');
        const sendButton = this.shadowRoot.getElementById('sendButton');
        const tryAgainButton = this.shadowRoot.getElementById('tryAgainButton');
        const studentInputs = [
            this.shadowRoot.getElementById('nickname'), 
            this.shadowRoot.getElementById('homeroom'), 
            this.shadowRoot.getElementById('studentId')
        ];
        
        this.scrollIntoView({ behavior: 'smooth', block: 'start' });
        let allFieldsValid = true;
        studentInputs.forEach(input => {
            if (input.value.trim() === '') {
                allFieldsValid = false;
                input.classList.add('invalid');
            } else {
                input.classList.remove('invalid');
            }
        });
        if (!allFieldsValid) {
            validationMessage.textContent = 'Please fill out all student information fields.';
            validationMessage.className = 'error';
            return;
        }
        validationMessage.textContent = '';
        sendButton.disabled = true;
        tryAgainButton.disabled = true;
        sendButton.textContent = 'Sending...';
        
        const studentData = {
            quizName: this.title,
            nickname: this.shadowRoot.getElementById('nickname').value,
            homeroom: this.shadowRoot.getElementById('homeroom').value,
            studentId: this.shadowRoot.getElementById('studentId').value,
            score: this.score,
            total: this.totalQuestions,
            timestamp: new Date().toISOString()
        };
        
        if (!this.submissionUrl) {
            validationMessage.textContent = '⚠️ No submission URL configured.';
            validationMessage.className = 'error';
            sendButton.textContent = 'No Submission URL';
            return;
        }
        
        fetch(this.submissionUrl, {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(studentData)
        })
        .then(response => response.json())
        .then(data => {
            validationMessage.textContent = `✅ ${data.message || 'Submission successful!'}`;
            validationMessage.className = 'success';
            sendButton.textContent = 'Sent Successfully';
            studentInputs.forEach(input => input.disabled = true);
        })
        .catch((error) => {
            console.error('Error:', error);
            validationMessage.textContent = `⚠️ Error: Could not submit score. Please try again.`;
            validationMessage.className = 'error';
            sendButton.textContent = 'Try Sending Again';
            sendButton.disabled = false;
            tryAgainButton.disabled = false;
        });
    }

    resetQuiz() {
        const quizForm = this.shadowRoot.getElementById('quizForm');
        const resultArea = this.shadowRoot.getElementById('resultArea');
        const studentInfoSection = this.shadowRoot.getElementById('studentInfoSection');
        const postScoreActions = this.shadowRoot.getElementById('postScoreActions');
        const readingSection = this.shadowRoot.getElementById('readingSection');
        const questionsSection = this.shadowRoot.getElementById('questionsSection');
        const checkScoreContainer = this.shadowRoot.getElementById('checkScoreContainer');
        const validationMessage = this.shadowRoot.getElementById('validationMessage');
        const sendButton = this.shadowRoot.getElementById('sendButton');
        const tryAgainButton = this.shadowRoot.getElementById('tryAgainButton');
        const studentInputs = [
            this.shadowRoot.getElementById('nickname'), 
            this.shadowRoot.getElementById('homeroom'), 
            this.shadowRoot.getElementById('studentId')
        ];
        
        quizForm.reset();
        resultArea.classList.add('hidden');
        studentInfoSection.classList.add('hidden');
        postScoreActions.classList.add('hidden');
        readingSection.classList.remove('hidden');
        questionsSection.classList.remove('hidden');
        checkScoreContainer.classList.remove('hidden');
        validationMessage.textContent = '';
        studentInputs.forEach(input => {
            input.classList.remove('invalid');
            input.disabled = false;
        });
        sendButton.disabled = false;
        sendButton.textContent = 'Send Score to Teacher';
        tryAgainButton.disabled = false;
        this.stopAllAudio();
        this.generateQuiz();
        this.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    toggleTheme() {
        this.classList.toggle('dark');
        const isDark = this.classList.contains('dark');
        this.shadowRoot.querySelector('.light-icon').classList.toggle('hidden', isDark);
        this.shadowRoot.querySelector('.dark-icon').classList.toggle('hidden', !isDark);
    }
}

// Register the custom element
customElements.define('tj-quiz-element', TjQuizElement);
