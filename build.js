#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define source and destination directories
const srcDir = __dirname;
const distDir = path.join(__dirname, 'dist');

// Files to include in the distribution
const filesToCopy = [
    'tj-quiz-element.js',
    'template.html',
    'styles.css',
    'config.js.example'  // We'll create this as a template
];

// Optional files to copy if they exist
const optionalFiles = [
    'README.md',
    'package.json'
];

console.log('🏗️  Building TJ Quiz Element...');

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
    console.log('📁 Created dist directory');
} else {
    // Clean existing dist directory
    fs.rmSync(distDir, { recursive: true, force: true });
    fs.mkdirSync(distDir, { recursive: true });
    console.log('🧹 Cleaned and recreated dist directory');
}

// Copy required files
filesToCopy.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(distDir, file);
    
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied ${file}`);
    } else {
        console.log(`⚠️  Warning: ${file} not found, skipping...`);
    }
});

// Copy optional files
optionalFiles.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(distDir, file);
    
    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`✅ Copied ${file} (optional)`);
    }
});

// Create config.js.example from config.js if it exists
const configPath = path.join(srcDir, 'config.js');
const configExamplePath = path.join(distDir, 'config.js.example');

if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    // Replace actual values with placeholders
    const exampleContent = configContent
        .replace(/submissionUrl:\s*['"][^'"]*['"]/, `submissionUrl: 'https://your-server.com/submit-quiz'`)
        .replace(/apiKey:\s*['"][^'"]*['"]/, `apiKey: 'your-api-key-here'`);
    
    fs.writeFileSync(configExamplePath, exampleContent);
    console.log('✅ Created config.js.example with placeholder values');
}

// Create a simple example HTML file
const exampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TJ Quiz Element Example</title>
</head>
<body>
    <h1>TJ Quiz Element Example</h1>
    
    <tj-quiz-element>
        Sample Quiz
        
        ---questions
        Q: What is 2 + 2?
        A: 3
        A: 4 [correct]
        A: 5
        A: 6

        Q: What is the capital of France?
        A: London
        A: Berlin
        A: Paris [correct]
        A: Madrid
    </tj-quiz-element>

    <script type="module" src="tj-quiz-element.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(distDir, 'example.html'), exampleHtml);
console.log('✅ Created example.html');

// Create a README for the dist folder
const distReadme = `# TJ Quiz Element Distribution

This folder contains the built files for TJ Quiz Element.

## Files Included:

- \`tj-quiz-element.js\` - Main component file
- \`template.html\` - HTML template
- \`styles.css\` - Component styles
- \`config.js.example\` - Configuration template
- \`example.html\` - Usage example

## Setup:

1. Copy \`config.js.example\` to \`config.js\`
2. Update \`config.js\` with your submission URL
3. Include the files in your project
4. Use \`<tj-quiz-element>\` in your HTML

## Usage:

\`\`\`html
<script type="module" src="tj-quiz-element.js"></script>

<tj-quiz-element>
    Quiz Title
    
    ---questions
    Q: Your question here?
    A: Wrong answer
    A: Correct answer [correct]
</tj-quiz-element>
\`\`\`

For more information, see the main README.md file.
`;

fs.writeFileSync(path.join(distDir, 'README.md'), distReadme);
console.log('✅ Created dist README.md');

console.log('');
console.log('🎉 Build completed successfully!');
console.log(`📦 Distribution files are in: ${distDir}`);
console.log('');
console.log('Next steps:');
console.log('1. Copy config.js.example to config.js in the dist folder');
console.log('2. Update config.js with your submission URL');
console.log('3. Deploy the dist folder to your web server');
