import { config } from './config.js';

class TjQuizElement extends HTMLElement {
    static get observedAttributes() {
        return ['submission-url'];
    }
    
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.questionBank = [];
        this.currentQuestions = [];
        this.score = 0;
        this.questionsAnswered = 0;
        this.questionsToDisplay = 5;
        this.totalQuestions = 0; // Will be set based on actual question count
        this.audioPlayer = null;
        this.utterance = null;
        this.audioSrc = '';
        this.submissionUrl = config.submissionUrl || ''; // Use config file for submission URL
        this.title = '';
        this.passage = '';
        this.vocabularySections = []; // Array of vocabulary sections
        this.vocabUserChoices = {}; // Track what user selected for each word (section-word key)
        this.vocabScore = 0;
        this.vocabSubmitted = false; // Track if vocab answers have been submitted
        this.clozeSections = []; // Array of cloze sections
        this.clozeAnswers = {}; // User's answers for each blank (section-blank key)
        this.clozeScore = 0;
        this.clozeSubmitted = false;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'submission-url') {
            this.submissionUrl = newValue;
        }
    }

    async connectedCallback() {
        // Store the original content before rendering shadow DOM
        this.originalContent = this.textContent;
        
        // Get submission URL from attribute if provided (overrides config file)
        if (this.hasAttribute('submission-url')) {
            this.submissionUrl = this.getAttribute('submission-url');
        }
        
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
            console.error('Failed to load external template:', error);
            this.shadowRoot.innerHTML = `
                <div style="padding: 2rem; text-align: center; font-family: Arial, sans-serif; background: #fee2e2; color: #dc2626; border-radius: 0.5rem; margin: 1rem;">
                    <h2>⚠️ Template Load Error</h2>
                    <p>Could not load external template files (template.html and styles.css).</p>
                    <p>Please ensure both files are available in the same directory as the script.</p>
                    <details style="margin-top: 1rem; text-align: left;">
                        <summary style="cursor: pointer; font-weight: bold;">Error Details:</summary>
                        <pre style="background: white; padding: 1rem; border-radius: 0.25rem; margin-top: 0.5rem; overflow: auto;">${error.message}</pre>
                    </details>
                </div>
            `;
            return;
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
            
            const sectionHeader = lines[0].toLowerCase();
            const sectionContent = lines.slice(1).join('\n').trim();
            
            // Check for numbered sections like vocab-5 or questions-3
            if (sectionHeader.startsWith('vocab')) {
                const match = sectionHeader.match(/vocab(?:-(\d+))?/);
                const vocabCount = match && match[1] ? parseInt(match[1]) : null;
                this.parseVocabulary(sectionContent, vocabCount);
            } else if (sectionHeader.startsWith('cloze')) {
                const match = sectionHeader.match(/cloze(?:-(\d+))?/);
                const clozeCount = match && match[1] ? parseInt(match[1]) : null;
                this.parseCloze(sectionContent, clozeCount);
            } else if (sectionHeader.startsWith('questions')) {
                const match = sectionHeader.match(/questions(?:-(\d+))?/);
                const questionCount = match && match[1] ? parseInt(match[1]) : null;
                this.parseQuestions(sectionContent, questionCount);
            } else {
                switch (sectionHeader) {
                    case 'text':
                        this.passage = sectionContent;
                        break;
                    case 'audio':
                        this.parseAudio(sectionContent);
                        break;
                }
            }
        }
        
        // Update the rendered content
        this.shadowRoot.getElementById('quizTitle').textContent = this.title || 'TJ Quiz Element';
        this.shadowRoot.getElementById('quizDescription').textContent = 'Read the passage, then answer the questions below.';
        this.shadowRoot.getElementById('passageText').textContent = this.passage;
        
        console.log('Parsed:', {
            title: this.title,
            passageLength: this.passage.length,
            vocabularySections: this.vocabularySections.length,
            clozeSections: this.clozeSections.length,
            audioSrc: this.audioSrc,
            questionsCount: this.questionBank.length
        });
    }

    parseVocabulary(vocabSection, maxWords = null) {
        if (!vocabSection) return;
        
        // Parse vocabulary: word: definition, word: definition
        const vocabPairs = vocabSection.split(',');
        const allVocab = {};
        
        vocabPairs.forEach(pair => {
            const [word, definition] = pair.split(':').map(s => s.trim());
            if (word && definition) {
                allVocab[word] = definition;
            }
        });
        
        let finalVocab;
        // If maxWords is specified, randomly select that many words
        if (maxWords && Object.keys(allVocab).length > maxWords) {
            const vocabEntries = Object.entries(allVocab);
            this.shuffleArray(vocabEntries);
            const selectedEntries = vocabEntries.slice(0, maxWords);
            finalVocab = Object.fromEntries(selectedEntries);
        } else {
            finalVocab = allVocab;
        }
        
        // Add this vocabulary section to the array
        this.vocabularySections.push({
            vocabulary: finalVocab,
            sectionId: this.vocabularySections.length
        });
        
        console.log('Vocabulary section parsed. Words in this section:', Object.keys(finalVocab).length, 'Max words:', maxWords);
    }

    parseAudio(audioSection) {
        if (!audioSection) return;
        
        // Look for audio-src = URL
        const audioMatch = audioSection.match(/audio-src\s*=\s*(.+)/);
        if (audioMatch) {
            this.audioSrc = audioMatch[1].trim();
        }
    }

    parseCloze(clozeSection, maxBlanks = null) {
        if (!clozeSection) return;
        
        // Extract words marked with asterisks
        const asteriskMatches = clozeSection.match(/\*([^*]+)\*/g);
        let clozeWords = [];
        if (asteriskMatches) {
            clozeWords = asteriskMatches.map(match => match.replace(/\*/g, ''));
            
            // If maxBlanks is specified, randomly select that many words to remove
            if (maxBlanks && clozeWords.length > maxBlanks) {
                this.shuffleArray(clozeWords);
                clozeWords = clozeWords.slice(0, maxBlanks);
            }
        }
        
        // Add this cloze section to the array
        this.clozeSections.push({
            text: clozeSection,
            words: clozeWords,
            sectionId: this.clozeSections.length
        });
        
        console.log('Cloze section parsed. Total words available:', asteriskMatches ? asteriskMatches.length : 0, 'Words to remove:', clozeWords.length, 'Max blanks:', maxBlanks);
    }

    parseQuestions(questionsSection, maxQuestions = null) {
        if (!questionsSection) return;
        
        const lines = questionsSection.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let currentQuestion = null;
        const tempQuestionBank = [];
        
        for (const line of lines) {
            if (line.startsWith('Q:') || line.startsWith('Q.')) {
                // New question
                if (currentQuestion) {
                    tempQuestionBank.push(currentQuestion);
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
            tempQuestionBank.push(currentQuestion);
        }
        
        // If maxQuestions is specified, randomly select that many questions
        if (maxQuestions && tempQuestionBank.length > maxQuestions) {
            this.shuffleArray(tempQuestionBank);
            this.questionBank = tempQuestionBank.slice(0, maxQuestions);
        } else {
            this.questionBank = tempQuestionBank;
        }
        
        console.log('Questions parsed. Total questions in bank:', this.questionBank.length, 'Max questions:', maxQuestions);
    }

    generateVocabMatching() {
        const vocabSection = this.shadowRoot.getElementById('vocabSection');
        const vocabGrid = this.shadowRoot.getElementById('vocabGrid');
        
        if (this.vocabularySections.length === 0) {
            vocabSection.classList.add('hidden');
            return;
        }
        
        vocabSection.classList.remove('hidden');
        vocabGrid.innerHTML = '';
        
        // Reset vocabulary tracking
        this.vocabScore = 0;
        this.vocabUserChoices = {};
        this.vocabSubmitted = false;
        
        // Generate a section for each vocabulary set
        this.vocabularySections.forEach((vocabSectionData, sectionIndex) => {
            const { vocabulary, sectionId } = vocabSectionData;
            if (!vocabulary) return; // Skip if vocabulary is undefined
            
            // Create section header if there are multiple vocabulary sections
            if (this.vocabularySections.length > 1) {
                const sectionHeader = document.createElement('div');
                sectionHeader.className = 'vocab-section-header';
                sectionHeader.innerHTML = `<h4>Vocabulary Set ${sectionIndex + 1}</h4>`;
                vocabGrid.appendChild(sectionHeader);
            }
            
            const words = Object.keys(vocabulary);
            const allDefinitions = Object.values(vocabulary);
            
            // Shuffle definitions to make it more challenging
            this.shuffleArray(allDefinitions);
            
            // Create table for this vocabulary section
            const tableContainer = document.createElement('div');
            tableContainer.className = 'vocab-grid-table';
            
            // Create definition header row
            const headerRow = document.createElement('div');
            headerRow.className = 'vocab-grid-header';
            
            // Word column header
            const wordHeaderCell = document.createElement('div');
            wordHeaderCell.className = 'vocab-grid-header-cell';
            wordHeaderCell.textContent = 'Word';
            headerRow.appendChild(wordHeaderCell);
            
            // Definition header cells
            allDefinitions.forEach((definition) => {
                const headerCell = document.createElement('div');
                headerCell.className = 'vocab-grid-header-cell';
                headerCell.textContent = definition;
                headerRow.appendChild(headerCell);
            });
            
            tableContainer.appendChild(headerRow);
            
            // Create word rows
            words.forEach((word, wordIndex) => {
                const wordRow = document.createElement('div');
                wordRow.className = 'vocab-grid-row';
                
                // Word cell
                const wordCell = document.createElement('div');
                wordCell.className = 'vocab-grid-cell vocab-word-cell';
                wordCell.textContent = word;
                wordRow.appendChild(wordCell);
                
                // Radio button cells for each definition
                allDefinitions.forEach((definition, defIndex) => {
                    const optionCell = document.createElement('div');
                    optionCell.className = 'vocab-grid-cell vocab-option-cell';
                    
                    const radioContainer = document.createElement('div');
                    radioContainer.className = 'vocab-radio-container';
                    
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = `vocab-${sectionId}-${wordIndex}`;
                    radio.value = definition;
                    radio.id = `vocab-${sectionId}-${wordIndex}-${defIndex}`;
                    
                    radioContainer.appendChild(radio);
                    optionCell.appendChild(radioContainer);
                    wordRow.appendChild(optionCell);
                });
                
                tableContainer.appendChild(wordRow);
            });
            
            vocabGrid.appendChild(tableContainer);
            
            // Add spacing between sections if there are multiple
            if (sectionIndex < this.vocabularySections.length - 1) {
                const spacer = document.createElement('div');
                spacer.style.marginBottom = '2rem';
                vocabGrid.appendChild(spacer);
            }
        });
    }

    generateCloze() {
        const clozeSection = this.shadowRoot.getElementById('clozeSection');
        const clozeContainer = this.shadowRoot.getElementById('clozeContainer');
        
        if (this.clozeSections.length === 0) {
            clozeSection.classList.add('hidden');
            return;
        }
        
        clozeSection.classList.remove('hidden');
        
        // Reset cloze tracking
        this.clozeScore = 0;
        this.clozeAnswers = {};
        this.clozeSubmitted = false;
        
        // Clear the container and rebuild with all cloze sections
        if (!clozeContainer) {
            // Create container if it doesn't exist
            const newContainer = document.createElement('div');
            newContainer.id = 'clozeContainer';
            clozeSection.appendChild(newContainer);
        }
        
        const container = this.shadowRoot.getElementById('clozeContainer');
        container.innerHTML = '';
        
        // Generate each cloze section
        this.clozeSections.forEach((clozeData, sectionIndex) => {
            const { text, words, sectionId } = clozeData;
            
            // Create section wrapper
            const sectionWrapper = document.createElement('div');
            sectionWrapper.className = 'cloze-section-wrapper';
            
            // Add section header if there are multiple cloze sections
            if (this.clozeSections.length > 1) {
                const sectionHeader = document.createElement('h4');
                sectionHeader.className = 'cloze-section-header';
                sectionHeader.textContent = `Fill in the Blanks - Section ${sectionIndex + 1}`;
                sectionWrapper.appendChild(sectionHeader);
            }
            
            // Create word bank for this section
            const wordBank = document.createElement('div');
            wordBank.className = 'cloze-word-bank';
            wordBank.innerHTML = `
                <div class="cloze-bank-title">Word Bank</div>
                <div class="cloze-bank-words">
                    ${words.map(word => `<span class="cloze-bank-word">${word}</span>`).join('')}
                </div>
            `;
            sectionWrapper.appendChild(wordBank);
            
            // Create text with blanks
            const textElement = document.createElement('div');
            textElement.className = 'cloze-text';
            
            let textWithBlanks = text;
            let blankIndex = 0;
            
            // Replace selected words with blanks
            words.forEach(word => {
                const regex = new RegExp(`\\*${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*`, 'gi');
                textWithBlanks = textWithBlanks.replace(regex, () => {
                    const inputHtml = `<input type="text" class="cloze-blank" data-answer="${word.toLowerCase()}" data-section-id="${sectionId}" data-blank-index="${blankIndex}" autocomplete="off" spellcheck="false" placeholder="____" title="Fill in the blank">`;
                    blankIndex++;
                    return inputHtml;
                });
            });
            
            // Remove remaining asterisks from words not selected for blanks
            textWithBlanks = textWithBlanks.replace(/\*([^*]+)\*/g, '$1');
            
            textElement.innerHTML = textWithBlanks;
            sectionWrapper.appendChild(textElement);
            
            // Add spacing between sections if there are multiple
            if (sectionIndex < this.clozeSections.length - 1) {
                sectionWrapper.style.marginBottom = '2rem';
            }
            
            container.appendChild(sectionWrapper);
        });
    }

    handleVocabAnswer(e) {
        if (e.target.type !== 'radio' || !e.target.name.startsWith('vocab-')) return;

        const radio = e.target;
        const nameParts = radio.name.split('-');
        const sectionId = parseInt(nameParts[1]);
        const wordIndex = parseInt(nameParts[2]);
        
        // Find the vocabulary section and word
        const vocabSection = this.vocabularySections.find(vs => vs.sectionId === sectionId);
        if (!vocabSection || !vocabSection.vocabulary) return;
        
        const words = Object.keys(vocabSection.vocabulary);
        const word = words[wordIndex];
        const selectedDefinition = radio.value;
        
        // Store the user's choice with section-word key
        const key = `${sectionId}-${word}`;
        this.vocabUserChoices[key] = selectedDefinition;
        
        // Check if all vocabulary questions are answered
        const totalVocabWords = this.vocabularySections.reduce((total, section) => 
            total + (section.vocabulary ? Object.keys(section.vocabulary).length : 0), 0);
        const answeredVocabWords = Object.keys(this.vocabUserChoices).length;
        
        if (answeredVocabWords === totalVocabWords) {
            // Check if all sections are complete to enable score button
            const allQuestionsAnswered = this.questionBank.length === 0 || this.checkAllQuestionsAnswered();
            const allClozeAnswered = this.checkAllClozeAnswered();
            
            if (allQuestionsAnswered && allClozeAnswered) {
                const checkScoreButton = this.shadowRoot.getElementById('checkScoreButton');
                checkScoreButton.disabled = false;
            }
        }
    }

    handleClozeAnswer(e) {
        if (e.target.type !== 'text' || !e.target.classList.contains('cloze-blank')) return;

        const input = e.target;
        const correctAnswer = input.dataset.answer;
        const sectionId = input.dataset.sectionId;
        const blankIndex = input.dataset.blankIndex;
        const userAnswer = input.value.trim().toLowerCase();
        
        // Store the user's answer with section-blank key
        const key = `${sectionId}-${blankIndex}`;
        this.clozeAnswers[key] = userAnswer;
        
        // Check if all cloze blanks are filled
        if (this.checkAllClozeAnswered()) {
            // Check if all sections are complete to enable score button
            const vocabComplete = this.vocabularySections.length === 0 || 
                Object.keys(this.vocabUserChoices).length === this.getTotalVocabWords();
            const questionsComplete = this.questionBank.length === 0 || this.checkAllQuestionsAnswered();
            
            if (vocabComplete && questionsComplete) {
                const checkScoreButton = this.shadowRoot.getElementById('checkScoreButton');
                checkScoreButton.disabled = false;
            }
        }
    }

    checkAllClozeAnswered() {
        const totalBlanks = this.clozeSections.reduce((total, section) => 
            total + section.words.length, 0);
        const filledBlanks = Object.keys(this.clozeAnswers).filter(key => 
            this.clozeAnswers[key].length > 0).length;
        return filledBlanks === totalBlanks;
    }

    getTotalVocabWords() {
        return this.vocabularySections.reduce((total, section) => 
            total + (section.vocabulary ? Object.keys(section.vocabulary).length : 0), 0);
    }

    showVocabScore() {
        // Calculate vocabulary score by comparing user choices to correct answers
        this.vocabScore = 0;
        const totalVocab = this.getTotalVocabWords();
        
        // Show feedback for each vocabulary section
        this.vocabularySections.forEach((vocabSection, sectionIndex) => {
            const { vocabulary, sectionId } = vocabSection;
            if (!vocabulary) return; // Skip if vocabulary is undefined
            const words = Object.keys(vocabulary);
            
            words.forEach((word, wordIndex) => {
                const key = `${sectionId}-${word}`;
                const userDefinition = this.vocabUserChoices[key];
                const correctDefinition = vocabulary[word];
                const isCorrect = userDefinition === correctDefinition;
                
                if (isCorrect) {
                    this.vocabScore++;
                }
                
                // Find the selected radio button and its cell
                const radioName = `vocab-${sectionId}-${wordIndex}`;
                const selectedRadio = this.shadowRoot.querySelector(`input[name="${radioName}"]:checked`);
                
                if (selectedRadio) {
                    // Disable all radio buttons for this word
                    const allRadios = this.shadowRoot.querySelectorAll(`input[name="${radioName}"]`);
                    allRadios.forEach(radio => {
                        radio.disabled = true;
                        const cell = radio.closest('.vocab-option-cell');
                        
                        if (radio.value === correctDefinition) {
                            cell.classList.add('correct');
                        } else if (radio.checked) {
                            cell.classList.add('incorrect');
                        }
                    });
                }
            });
        });
        
        const vocabScoreElement = this.shadowRoot.getElementById('vocabScore');
        vocabScoreElement.textContent = `Vocabulary Score: ${this.vocabScore}/${totalVocab}`;
        vocabScoreElement.classList.remove('hidden');
        this.vocabSubmitted = true;
    }

    showClozeScore() {
        // Calculate cloze score by comparing user answers to correct answers
        this.clozeScore = 0;
        const totalBlanks = this.clozeSections.reduce((total, section) => 
            total + section.words.length, 0);
        
        // Show feedback for each cloze blank
        const clozeInputs = this.shadowRoot.querySelectorAll('.cloze-blank');
        clozeInputs.forEach(input => {
            const correctAnswer = input.dataset.answer.toLowerCase();
            const userAnswer = input.value.trim().toLowerCase();
            const isCorrect = userAnswer === correctAnswer;
            
            if (isCorrect) {
                this.clozeScore++;
                input.classList.add('correct');
            } else {
                input.classList.add('incorrect');
            }
            
            input.disabled = true;
        });
        
        const clozeScoreElement = this.shadowRoot.getElementById('clozeScore');
        clozeScoreElement.textContent = `Fill in the Blanks Score: ${this.clozeScore}/${totalBlanks}`;
        clozeScoreElement.classList.remove('hidden');
        this.clozeSubmitted = true;
    }

    setupEventListeners() {
        const quizForm = this.shadowRoot.getElementById('quizForm');
        const sendButton = this.shadowRoot.getElementById('sendButton');
        const tryAgainButton = this.shadowRoot.getElementById('tryAgainButton');
        const themeToggle = this.shadowRoot.querySelector('.theme-toggle');

        quizForm.addEventListener('change', (e) => {
            this.handleAnswer(e);
            this.handleVocabAnswer(e);
        });
        quizForm.addEventListener('input', (e) => {
            this.handleClozeAnswer(e);
        });
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
        const readingSection = this.shadowRoot.getElementById('readingSection');
        const checkScoreButton = this.shadowRoot.getElementById('checkScoreButton');
        
        console.log('generateQuiz called, questionBank length:', this.questionBank.length);
        
        // Clear previous questions
        const existingQuestionBlocks = questionsSection.querySelectorAll('.question-block');
        existingQuestionBlocks.forEach(block => block.remove());
        
        this.score = 0;
        this.questionsAnswered = 0;
        checkScoreButton.disabled = true;

        // Hide or show reading section based on whether we have passage content
        if (!this.passage || this.passage.trim() === '') {
            readingSection.classList.add('hidden');
        } else {
            readingSection.classList.remove('hidden');
        }

        // Generate vocabulary matching if vocabulary exists
        this.generateVocabMatching();

        // Generate cloze section if cloze exists
        this.generateCloze();

        // Check if we should enable the score button right away (if only cloze exists)
        this.checkInitialCompletion();

        // Hide or show questions section based on whether we have questions
        if (this.questionBank.length === 0) {
            questionsSection.classList.add('hidden');
            this.totalQuestions = 0; // No questions available
        } else {
            questionsSection.classList.remove('hidden');
            
            // Use all questions from questionBank (already filtered by parseQuestions if needed)
            this.shuffleArray(this.questionBank);
            this.currentQuestions = this.questionBank; // Use all questions since they're already filtered
            this.totalQuestions = this.questionBank.length;
            
            this.currentQuestions.forEach((q, index) => {
                questionsSection.appendChild(this.createQuestionBlock(q, index));
            });
        }
    }

    checkInitialCompletion() {
        // If there's only cloze content and no vocab or questions, enable score button immediately
        const hasVocab = this.vocabularySections.length > 0;
        const hasQuestions = this.questionBank.length > 0;
        const hasCloze = this.clozeSections.length > 0;
        
        if (hasCloze && !hasVocab && !hasQuestions) {
            // Only cloze exists - score button should be enabled when all cloze answers are filled
            // This will be handled by handleClozeAnswer, so we don't need to do anything here
        } else if (!hasCloze && !hasVocab && !hasQuestions) {
            // No interactive content at all - hide the score button
            const checkScoreContainer = this.shadowRoot.getElementById('checkScoreContainer');
            checkScoreContainer.classList.add('hidden');
        }
    }

    checkAllQuestionsAnswered() {
        return this.questionsAnswered === this.totalQuestions;
    }

    handleAnswer(e) {
        if (e.target.type !== 'radio' || e.target.dataset.answered) return;
        
        const selectedRadio = e.target;
        const questionName = selectedRadio.name;
        
        // Skip vocabulary radio buttons - they're handled by handleVocabAnswer
        if (questionName.startsWith('vocab-')) return;
        
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
        
        // Enable check score button when all questions are answered and vocabulary is complete (if any)
        const vocabComplete = this.vocabularySections.length === 0 || Object.keys(this.vocabUserChoices).length === this.getTotalVocabWords();
        const questionsComplete = this.checkAllQuestionsAnswered();
        const clozeComplete = this.checkAllClozeAnswered();
        
        if (vocabComplete && questionsComplete && clozeComplete) {
            this.shadowRoot.getElementById('checkScoreButton').disabled = false;
        }
    }

    handleSubmit(e) {
        e.preventDefault(); 
        this.showFinalScore();
    }

    showFinalScore() {
        // Calculate and show vocabulary score/feedback if vocabulary exists and hasn't been scored yet
        if (this.vocabularySections.length > 0 && !this.vocabSubmitted) {
            this.showVocabScore();
        }
        
        // Calculate and show cloze score if cloze exists and hasn't been scored yet
        if (this.clozeSections.length > 0 && !this.clozeSubmitted) {
            this.showClozeScore();
        }
        
        const resultScore = this.shadowRoot.getElementById('resultScore');
        const readingSection = this.shadowRoot.getElementById('readingSection');
        const questionsSection = this.shadowRoot.getElementById('questionsSection');
        const vocabSection = this.shadowRoot.getElementById('vocabSection');
        const checkScoreContainer = this.shadowRoot.getElementById('checkScoreContainer');
        const resultArea = this.shadowRoot.getElementById('resultArea');
        const studentInfoSection = this.shadowRoot.getElementById('studentInfoSection');
        const postScoreActions = this.shadowRoot.getElementById('postScoreActions');
        
        // Calculate total score (vocabulary + cloze + questions)
        const vocabTotal = this.getTotalVocabWords();
        const clozeTotal = this.clozeSections.reduce((total, section) => total + section.words.length, 0);
        const questionTotal = this.totalQuestions;
        const totalPossible = vocabTotal + clozeTotal + questionTotal;
        const totalEarned = this.vocabScore + this.clozeScore + this.score;
        
        console.log('Final scoring - Vocab total:', vocabTotal, 'Cloze total:', clozeTotal, 'Question total:', questionTotal, 'Total possible:', totalPossible);
        console.log('Final scoring - Vocab score:', this.vocabScore, 'Cloze score:', this.clozeScore, 'Question score:', this.score, 'Total earned:', totalEarned);
        
        // Update score display to show combined score with better formatting
        if (totalPossible > 0) {
            const percentage = Math.round((totalEarned / totalPossible) * 100);
            
            // Determine how many sections we have
            const sectionsPresent = [];
            if (vocabTotal > 0) sectionsPresent.push('vocab');
            if (clozeTotal > 0) sectionsPresent.push('cloze');
            if (questionTotal > 0) sectionsPresent.push('questions');
            
            if (sectionsPresent.length > 1) {
                // Multiple sections - show breakdown
                let breakdownHTML = '';
                if (vocabTotal > 0) {
                    breakdownHTML += `
                        <div class="score-section">
                            <span class="score-label">Vocabulary:</span>
                            <span class="score-value">${this.vocabScore}/${vocabTotal}</span>
                        </div>`;
                }
                if (clozeTotal > 0) {
                    breakdownHTML += `
                        <div class="score-section">
                            <span class="score-label">Fill-in-the-blank:</span>
                            <span class="score-value">${this.clozeScore}/${clozeTotal}</span>
                        </div>`;
                }
                if (questionTotal > 0) {
                    breakdownHTML += `
                        <div class="score-section">
                            <span class="score-label">Questions:</span>
                            <span class="score-value">${this.score}/${questionTotal}</span>
                        </div>`;
                }
                
                resultScore.innerHTML = `
                    <div class="score-main">${totalEarned} / ${totalPossible}</div>
                    <div class="score-percentage">${percentage}%</div>
                    <div class="score-breakdown">
                        ${breakdownHTML}
                    </div>
                `;
            } else if (vocabTotal > 0) {
                // Vocabulary only
                resultScore.innerHTML = `
                    <div class="score-main">${this.vocabScore} / ${vocabTotal}</div>
                    <div class="score-percentage">${percentage}%</div>
                    <div class="score-label">Vocabulary Score</div>
                `;
            } else if (clozeTotal > 0) {
                // Cloze only
                resultScore.innerHTML = `
                    <div class="score-main">${this.clozeScore} / ${clozeTotal}</div>
                    <div class="score-percentage">${percentage}%</div>
                    <div class="score-label">Fill-in-the-blank Score</div>
                `;
            } else {
                // Questions only
                resultScore.innerHTML = `
                    <div class="score-main">${this.score} / ${questionTotal}</div>
                    <div class="score-percentage">${percentage}%</div>
                    <div class="score-label">Questions Score</div>
                `;
            }
        } else {
            const percentage = Math.round((this.score / this.totalQuestions) * 100);
            resultScore.innerHTML = `
                <div class="score-main">${this.score} / ${this.totalQuestions}</div>
                <div class="score-percentage">${percentage}%</div>
            `;
        }
        
        const scorePercentage = totalPossible > 0 ? totalEarned / totalPossible : this.score / this.totalQuestions;
        resultScore.className = '';
        if (scorePercentage >= 0.8) resultScore.classList.add('high');
        else if (scorePercentage >= 0.5) resultScore.classList.add('medium');
        else resultScore.classList.add('low');
        
        // Keep all sections visible, just hide the check score button
        checkScoreContainer.classList.add('hidden');
        resultArea.classList.remove('hidden');
        studentInfoSection.classList.remove('hidden');
        postScoreActions.classList.remove('hidden');
        
        // Scroll to the top of the quiz card
        const quizCard = this.shadowRoot.querySelector('.quiz-card');
        if (quizCard) {
            quizCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            this.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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
        
        // Calculate totals for all sections
        const vocabTotal = this.getTotalVocabWords();
        const clozeTotal = this.clozeSections.reduce((total, section) => total + section.words.length, 0);
        const questionTotal = this.questionBank.length;
        const totalPossible = vocabTotal + clozeTotal + questionTotal;
        const totalEarned = this.vocabScore + this.clozeScore + this.score;
        
        const studentData = {
            quizName: this.title,
            nickname: this.shadowRoot.getElementById('nickname').value,
            homeroom: this.shadowRoot.getElementById('homeroom').value,
            studentId: this.shadowRoot.getElementById('studentId').value,
            score: totalEarned,
            total: totalPossible,
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
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            } else {
                // If not JSON, return the text for debugging
                return response.text().then(text => {
                    console.warn('Non-JSON response received:', text);
                    return { message: 'Submission received (non-JSON response)' };
                });
            }
        })
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
