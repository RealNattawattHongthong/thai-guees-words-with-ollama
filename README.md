# Thai Word Guessing Game with Ollama

A Thai word guessing game that uses Ollama for word generation, featuring keyboard input support and enhanced gameplay.

## Features

- Clean, responsive design
- Thai keyboard for guessing letters
- Physical keyboard input support
- Hints provided for each word
- Integration with Ollama for AI-generated words and hints

## Prerequisites

- Node.js (v12 or higher)
- npm
- Ollama running locally (optional, for full functionality)

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

## How to Play

1. A random Thai word will be chosen, with blank boxes representing each letter
2. Read the hint to help you guess the word
3. Use your physical keyboard or click on the on-screen Thai keyboard to guess letters
4. If the letter is in the word, it will be revealed in all positions
5. You have 8 incorrect guesses allowed (shown as hearts)
6. Win by guessing all letters correctly before running out of tries
7. Lose if you make 8 incorrect guesses
8. Click "New Game" to start a new round

## Keyboard Input

You can now use your physical keyboard to play! Just type Thai characters to make guesses. 
The game will show which key you pressed and highlight the corresponding on-screen key.

## Word Generation

The game currently uses:
- A built-in dataset of authentic Thai words and hints
- Ollama API integration for AI-generated words (when enabled)

## Enabling Full Ollama Integration

Ollama integration is already implemented in the server.js file. The game will try to use Ollama if it's available, but will fall back to the predefined words if Ollama is not running or returns an error.

## License

MIT
