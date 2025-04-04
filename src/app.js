document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const wordContainer = document.getElementById('word-container');
  const hintElement = document.getElementById('hint');
  const keyboardElement = document.getElementById('keyboard');
  const newGameButton = document.getElementById('new-game');
  const statusElement = document.createElement('div');
  statusElement.id = 'status';
  statusElement.style.textAlign = 'center';
  statusElement.style.marginTop = '10px';
  wordContainer.parentNode.insertBefore(statusElement, wordContainer.nextSibling);

  // Game state
  let currentWord = '';
  let guessedLetters = [];
  let gameOver = false;
  let remainingTries = 8; // Number of incorrect guesses allowed
  let incorrectGuesses = 0; // Track incorrect guesses
  let score = 0; // Track player's score
  let highScore = localStorage.getItem('thaiWordGameHighScore') || 0; // Get high score from local storage

  // Complete Thai keyboard layout - Accurate and properly labeled
  const thaiConsonants = [
    // First row
    'ก', 'ข', 'ฃ', 'ค', 'ฅ', 'ฆ', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 
    // Second row
    'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 
    // Third row
    'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 
    // Fourth row
    'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 
    // Fifth row
    'ฬ', 'อ', 'ฮ'
  ];
  
  const thaiVowels = [
    // Single characters
    'ะ', 'า', 'ำ', 'ิ', 'ี', 'ึ', 'ื', 'ุ', 'ู', 'เ', 'แ', 'โ', 'ใ', 'ไ',
    // Tone marks
    '่', '้', '๊', '๋', '็', '์', 'ั','ํ'
  ];
  
  const thaiSpecial = [
    // Thai numerals
    '๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙',
    // Special symbols used in Thai writing
    'ๆ', 'ฯ', '฿', '"', '"'
  ];
  
  // Combine all characters for the full keyboard
  const thaiKeyboard = [...thaiConsonants, ...thaiVowels, ...thaiSpecial];

  // Create score display
  const scoreContainer = document.createElement('div');
  scoreContainer.id = 'score-container';
  scoreContainer.classList.add('score-container');
  hintElement.parentNode.insertBefore(scoreContainer, hintElement);
  
  // Additional game state
  let streak = 0; // Winning streak counter
  
  // Check if the device is mobile
  const isMobile = window.matchMedia("(max-width: 480px)").matches;
  
  // Function to update score display
  function updateScoreDisplay() {
    scoreContainer.innerHTML = `
      <div class="score-box">
        <div class="current-score">
          <div class="score-title">คะแนน</div>
          <div class="score-value">${score}</div>
          ${streak > 1 ? `<div class="streak-counter">${streak}🔥</div>` : ''}
        </div>
        <div class="high-score">
          <div class="score-title">สถิติสูงสุด</div>
          <div class="score-value">${highScore}</div>
        </div>
      </div>
    `;
  }
  
  // Initialize the game
  async function initGame() {
    gameOver = false;
    guessedLetters = [];
    remainingTries = 8;
    incorrectGuesses = 0;
    statusElement.textContent = '';
    updateScoreDisplay();
    
    // Adjust for mobile devices
    if (isMobile) {
      // Add virtual keyboard support for mobile
      if (!document.getElementById('hidden-input')) {
        const hiddenInput = document.createElement('input');
        hiddenInput.id = 'hidden-input';
        hiddenInput.style.position = 'absolute';
        hiddenInput.style.opacity = '0';
        hiddenInput.style.height = '0';
        hiddenInput.style.width = '0';
        hiddenInput.style.pointerEvents = 'none';
        hiddenInput.autocomplete = 'off';
        hiddenInput.autocorrect = 'off';
        hiddenInput.autocapitalize = 'off';
        hiddenInput.spellcheck = false;
        document.body.appendChild(hiddenInput);
        
        // Focus the hidden input when clicking anywhere in the game area
        document.querySelector('.game-area').addEventListener('click', () => {
          hiddenInput.focus({preventScroll: true});
        });
        
        // Handle input events for virtual keyboards
        hiddenInput.addEventListener('input', (e) => {
          const key = e.data;
          if (key && key.length === 1) {
            // Create a synthetic keydown event
            const syntheticEvent = {key: key};
            handleKeyPress(syntheticEvent);
          }
          // Clear the input for next character
          hiddenInput.value = '';
        });
      }
      
      // Focus initially
      setTimeout(() => {
        const hiddenInput = document.getElementById('hidden-input');
        if (hiddenInput) hiddenInput.focus({preventScroll: true});
      }, 500);
    }
    
    // Show loading state
    wordContainer.innerHTML = '<div style="text-align: center; width: 100%;">กำลังโหลด...</div>';
    hintElement.textContent = '';
    
    try {
      // Get a word from our API that connects to Ollama
      const wordObj = await getWordFromOllama();
      currentWord = wordObj.word;
      
      // Display hint
      hintElement.textContent = wordObj.hint;
    } catch (error) {
      console.error('Error initializing game:', error);
      // Fallback to sample word if API fails
      const sampleWords = [
        { word: 'กรุงเทพ', hint: 'เมืองหลวงของประเทศไทย' },
        { word: 'ช้าง', hint: 'สัตว์ที่เป็นสัญลักษณ์ของประเทศไทย' },
        { word: 'ส้มตำ', hint: 'อาหารไทยที่มีรสจัด ทำจากมะละกอ' },
        { word: 'ทุเรียน', hint: 'ผลไม้ที่มีกลิ่นแรง ราคาแพง' },
        { word: 'มวยไทย', hint: 'กีฬาประจำชาติของไทย' },
        { word: 'สงกรานต์', hint: 'เทศกาลปีใหม่ไทย มีการเล่นน้ำ' },
        { word: 'ลอยกระทง', hint: 'เทศกาลแห่งสายน้ำในเดือนพฤศจิกายน' },
        { word: 'ผัดไทย', hint: 'อาหารไทยที่มีก๋วยเตี๋ยวเส้นเล็ก และถั่วงอก' },
        { word: 'แกงเขียวหวาน', hint: 'อาหารไทยรสเผ็ด ใส่กะทิและพริกเขียว' },
        { word: 'ต้มยำกุ้ง', hint: 'อาหารไทยรสจัด มีเครื่องเทศและสมุนไพร' },
        { word: 'วัดพระแก้ว', hint: 'วัดที่ประดิษฐานพระแก้วมรกต' },
        { word: 'อยุธยา', hint: 'อดีตราชธานีของไทย เป็นเมืองมรดกโลก' },
        { word: 'เชียงใหม่', hint: 'จังหวัดทางภาคเหนือของไทย มีดอยสุเทพ' }
      ];
      const randomIndex = Math.floor(Math.random() * sampleWords.length);
      const wordObj = sampleWords[randomIndex];
      currentWord = wordObj.word;
      hintElement.textContent = wordObj.hint;
    }
    
    // Create word display
    renderWord();
    
    // Create keyboard
    renderKeyboard();
  }

  // Render the word with boxes
  function renderWord() {
    wordContainer.innerHTML = '';
    
    // Create tries indicator
    const triesElement = document.createElement('div');
    triesElement.classList.add('tries-indicator');
    triesElement.innerHTML = `
      <span>เหลือโอกาสผิด: ${remainingTries - incorrectGuesses}</span>
      <div class="hearts">
        ${Array(remainingTries).fill().map((_, i) => 
          i < (remainingTries - incorrectGuesses) 
            ? '<span class="heart">❤️</span>' 
            : '<span class="heart empty">🖤</span>'
        ).join('')}
      </div>
    `;
    wordContainer.appendChild(triesElement);
    
    // Create letter boxes container
    const boxesContainer = document.createElement('div');
    boxesContainer.classList.add('boxes-container');
    boxesContainer.style.display = 'flex';
    boxesContainer.style.justifyContent = 'center';
    boxesContainer.style.flexWrap = 'wrap';
    boxesContainer.style.gap = '10px';
    boxesContainer.style.margin = '15px 0';
    
    for (const char of currentWord) {
      const letterBox = document.createElement('div');
      letterBox.classList.add('letter-box');
      
      if (guessedLetters.includes(char)) {
        letterBox.textContent = char;
      }
      
      boxesContainer.appendChild(letterBox);
    }
    
    wordContainer.appendChild(boxesContainer);
    
    // Check if game is lost
    if (incorrectGuesses >= remainingTries && !gameOver) {
      gameOver = true;
      
      // Reset streak when losing
      streak = 0;
      
      // Lose points for losing
      const pointsLost = 50;
      score = Math.max(0, score - pointsLost); // Lose 50 points, but not below 0
      updateScoreDisplay();
      
      // Create result message
      const resultMessage = document.createElement('div');
      resultMessage.classList.add('result-message', 'lose-message');
      resultMessage.innerHTML = `
        <h2>😢 เสียใจด้วย! คุณแพ้แล้ว! 😢</h2>
        <div class="word-reveal">
          <p>คำที่ถูกต้อง: <strong>${currentWord}</strong></p>
          <p>ความหมาย: ${hintElement.textContent}</p>
        </div>
        <div class="score-summary">
          <p>คะแนนที่เสีย: <strong>-${pointsLost}</strong> คะแนน</p>
          <p>ชนะต่อเนื่อง: รีเซ็ตเป็น 0</p>
        </div>
        <div class="next-word">
          <p>ต้องการลองใหม่ไหม?</p>
          <button id="try-again-button" class="button continue-button">เล่นใหม่</button>
        </div>
      `;
      
      // Show modal with result
      setTimeout(() => {
        document.body.appendChild(resultMessage);
        
        // Add event listener to try again button
        const tryAgainButton = document.getElementById('try-again-button');
        tryAgainButton.addEventListener('click', () => {
          document.body.removeChild(resultMessage);
          initGame(); // Start a new game
        });
        
        // Also continue on Enter key
        const handleEnterKey = (e) => {
          if (e.key === 'Enter') {
            document.body.removeChild(resultMessage);
            document.removeEventListener('keydown', handleEnterKey);
            initGame(); // Start a new game
          }
        };
        document.addEventListener('keydown', handleEnterKey);
        
        // Focus the button for accessibility
        tryAgainButton.focus();
      }, 300);
    }
    
    // Check if game is won
    const allLettersGuessed = [...currentWord].every(letter => guessedLetters.includes(letter));
    if (allLettersGuessed && !gameOver) {
      gameOver = true;
      
      // Calculate score: base points + bonus for remaining tries
      const basePoints = 100;
      const bonusPoints = (remainingTries - incorrectGuesses) * 20;
      const wordLengthBonus = currentWord.length * 10;
      const roundScore = basePoints + bonusPoints + wordLengthBonus;
      
      // Increment streak and apply streak bonus
      streak++;
      const streakBonus = streak > 1 ? (streak * 10) : 0;
      
      // Update score with streak bonus
      score += roundScore + streakBonus;
      
      // Update high score if needed
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('thaiWordGameHighScore', highScore);
      }
      
      // Update score display
      updateScoreDisplay();
      
      // Create result message
      const resultMessage = document.createElement('div');
      resultMessage.classList.add('result-message', 'win-message');
      resultMessage.innerHTML = `
        <h2>🎉 ยินดีด้วย! คุณชนะแล้ว! 🎉</h2>
        <div class="score-summary">
          <p>คะแนนที่ได้: <strong>${roundScore + streakBonus}</strong> คะแนน</p>
          <div class="score-details">
            <p>- พื้นฐาน: ${basePoints} คะแนน</p>
            <p>- โบนัสครั้งที่เหลือ: ${bonusPoints} คะแนน</p>
            <p>- โบนัสความยาวคำ: ${wordLengthBonus} คะแนน</p>
            ${streak > 1 ? `<p>- โบนัสชนะต่อเนื่อง (${streak}): ${streakBonus} คะแนน</p>` : ''}
          </div>
        </div>
        <div class="next-word">
          <p>ต้องการเล่นต่อไหม?</p>
          <button id="continue-button" class="button continue-button">เล่นต่อ</button>
        </div>
      `;
      
      // Show modal with result
      setTimeout(() => {
        document.body.appendChild(resultMessage);
        
        // Add event listener to continue button
        const continueButton = document.getElementById('continue-button');
        continueButton.addEventListener('click', () => {
          document.body.removeChild(resultMessage);
          initGame(); // Start a new game
        });
        
        // Also continue on Enter key
        const handleEnterKey = (e) => {
          if (e.key === 'Enter') {
            document.body.removeChild(resultMessage);
            document.removeEventListener('keydown', handleEnterKey);
            initGame(); // Start a new game
          }
        };
        document.addEventListener('keydown', handleEnterKey);
        
        // Focus the button for accessibility
        continueButton.focus();
      }, 300);
    }
  }

  // Render the Thai keyboard in sections
  function renderKeyboard() {
    keyboardElement.innerHTML = '';
    
    // Create section headers and containers
    const createSection = (title, className, characters) => {
      const sectionDiv = document.createElement('div');
      sectionDiv.classList.add('keyboard-section');
      sectionDiv.classList.add(className);
      
      const sectionTitle = document.createElement('div');
      sectionTitle.classList.add('section-title');
      sectionTitle.textContent = title;
      sectionDiv.appendChild(sectionTitle);
      
      const keysContainer = document.createElement('div');
      keysContainer.classList.add('keys-container');
      
      characters.forEach(letter => {
        const keyButton = document.createElement('button');
        keyButton.classList.add('key');
        keyButton.textContent = letter;
        
        if (guessedLetters.includes(letter)) {
          if (currentWord.includes(letter)) {
            keyButton.classList.add('correct');
          } else {
            keyButton.classList.add('incorrect');
          }
        }
        
        keyButton.addEventListener('click', () => {
          if (!gameOver && !guessedLetters.includes(letter)) {
            guessedLetters.push(letter);
            
            // Check if guess is incorrect
            if (!currentWord.includes(letter)) {
              incorrectGuesses++;
            }
            
            renderWord();
            renderKeyboard();
          }
        });
        
        keysContainer.appendChild(keyButton);
      });
      
      sectionDiv.appendChild(keysContainer);
      return sectionDiv;
    };
    
    // Create each section
    const consonantsSection = createSection('พยัญชนะ', 'consonants-section', thaiConsonants);
    const vowelsSection = createSection('สระและวรรณยุกต์', 'vowels-section', thaiVowels);
    const specialSection = createSection('ตัวเลขและอักขระพิเศษ', 'special-section', thaiSpecial);
    
    // Add sections to keyboard
    keyboardElement.appendChild(consonantsSection);
    keyboardElement.appendChild(vowelsSection);
    keyboardElement.appendChild(specialSection);
  }

  // Connect to our API endpoint that communicates with Ollama
  async function getWordFromOllama() {
    try {
      const response = await fetch('/api/getWord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching from Ollama API:', error);
      const sampleWords = [
        { word: 'กรุงเทพ', hint: 'เมืองหลวงของประเทศไทย' },
        { word: 'ช้าง', hint: 'สัตว์ที่เป็นสัญลักษณ์ของประเทศไทย' },
        { word: 'ส้มตำ', hint: 'อาหารไทยที่มีรสจัด ทำจากมะละกอ' },
        { word: 'ทุเรียน', hint: 'ผลไม้ที่มีกลิ่นแรง ราคาแพง' },
        { word: 'มวยไทย', hint: 'กีฬาประจำชาติของไทย' },
        { word: 'สงกรานต์', hint: 'เทศกาลปีใหม่ไทย มีการเล่นน้ำ' },
        { word: 'ลอยกระทง', hint: 'เทศกาลแห่งสายน้ำในเดือนพฤศจิกายน' },
        { word: 'ผัดไทย', hint: 'อาหารไทยที่มีก๋วยเตี๋ยวเส้นเล็ก และถั่วงอก' },
        { word: 'แกงเขียวหวาน', hint: 'อาหารไทยรสเผ็ด ใส่กะทิและพริกเขียว' },
        { word: 'ต้มยำกุ้ง', hint: 'อาหารไทยรสจัด มีเครื่องเทศและสมุนไพร' },
        { word: 'วัดพระแก้ว', hint: 'วัดที่ประดิษฐานพระแก้วมรกต' },
        { word: 'อยุธยา', hint: 'อดีตราชธานีของไทย เป็นเมืองมรดกโลก' },
        { word: 'เชียงใหม่', hint: 'จังหวัดทางภาคเหนือของไทย มีดอยสุเทพ' },
        { word: 'เมือง', hint: 'พื้นที่ที่มีประชากรอาศัยอยู่หนาแน่น' },
        { word: 'ถนน', hint: 'เส้นทางสำหรับการเดินทาง' },
        { word: 'ตลาด', hint: 'สถานที่ซื้อขายสินค้า' },
        { word: 'บ้าน', hint: 'ที่อยู่อาศัย' },
        { word: 'อาหาร', hint: 'สิ่งที่กินเพื่อบำรุงร่างกาย' },
        { word: 'หมอ', hint: 'ผู้ที่รักษาโรค' },
        { word: 'ครู', hint: 'ผู้ที่สอนหนังสือ' }
      ];
      return sampleWords[Math.floor(Math.random() * sampleWords.length)]; // Fallback
    }
  }

  // Map physical keyboard to Thai characters
  const keyboardMap = {
    // Common physical keyboard to Thai mapping
    'q': 'ๆ', 'w': 'ไ', 'e': 'ำ', 'r': 'พ', 't': 'ะ', 'y': 'ั', 'u': 'ี', 'i': 'ร', 'o': 'น', 'p': 'ย', '[': 'บ', ']': 'ล',
    'a': 'ฟ', 's': 'ห', 'd': 'ก', 'f': 'ด', 'g': 'เ', 'h': '้', 'j': '่', 'k': 'า', 'l': 'ส', ';': 'ว', '\'': 'ง',
    'z': 'ผ', 'x': 'ป', 'c': 'แ', 'v': 'อ', 'b': 'ิ', 'n': 'ื', 'm': 'ท', ',': 'ม', '.': 'ใ', '/': 'ฝ',
    // Number row
    '1': 'ๅ', '2': '/', '3': '-', '4': 'ภ', '5': 'ถ', '6': 'ุ', '7': 'ึ', '8': 'ค', '9': 'ต', '0': 'จ', '-': 'ข', '=': 'ช'
  };
  
  // Handle keyboard input
  function handleKeyPress(event) {
    if (gameOver) return;
    
    let key = event.key;
    
    // Map physical keyboard keys to Thai characters
    if (keyboardMap[key]) {
      key = keyboardMap[key];
    }
    
    // Debug information for Thai keyboard input
    console.log(`Key pressed: "${key}" (original: "${event.key}"), Char code: ${key.charCodeAt(0)}`);
    
    // Check if the pressed key is in the Thai keyboard
    if (thaiKeyboard.includes(key) && !guessedLetters.includes(key)) {
      // Update status to show last pressed key and how to type it
      const physicalKey = Object.keys(keyboardMap).find(k => keyboardMap[k] === key) || 'ตรง';
      statusElement.innerHTML = `คีย์ที่กด: <span class="key-highlight">${key}</span> (พิมพ์โดยกด: ${physicalKey === 'ตรง' ? 'ตรง' : `"${physicalKey}"`})`;
      statusElement.style.color = '#3498db';
      
      // Process the key press
      guessedLetters.push(key);
      
      // Check if the guess is incorrect
      if (!currentWord.includes(key)) {
        incorrectGuesses++;
        // No sound for incorrect guess
      } else {
        // No sound for correct guess
      }
      
      // Show visual feedback for the pressed key
      const keyElements = document.querySelectorAll('.key');
      keyElements.forEach(element => {
        // Handle extended character matching
        if (element.textContent === key) {
          // Add active class for animation
          element.classList.add('active');
          
          // Scroll the key into view if needed
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          
          // Add correct/incorrect class
          if (currentWord.includes(key)) {
            element.classList.add('correct');
          } else {
            element.classList.add('incorrect');
          }
          
          // Remove active class after animation
          setTimeout(() => {
            element.classList.remove('active');
          }, 300);
        }
      });
      
      // Update the word display
      renderWord();
      renderKeyboard();
    } else if (key.length === 1) {
      // For keys not in the Thai keyboard, show helpful message
      statusElement.innerHTML = `คีย์ <span class="key-warning">"${key}"</span> ไม่ใช่อักษรไทยที่ใช้ในเกมนี้ หรือถูกเดาไปแล้ว`;
      statusElement.style.color = '#e74c3c';
      
      // Clear message after a delay
      setTimeout(() => {
        statusElement.textContent = 'โปรดใช้แป้นพิมพ์ไทยเท่านั้น';
        statusElement.style.color = '#666';
      }, 2000);
    }
  }

  // Create reset score button
  const resetScoreButton = document.createElement('button');
  resetScoreButton.classList.add('button', 'reset-button');
  resetScoreButton.textContent = 'รีเซ็ตคะแนน';
  resetScoreButton.style.marginLeft = '10px';
  resetScoreButton.style.backgroundColor = '#e74c3c';
  resetScoreButton.addEventListener('click', () => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะรีเซ็ตคะแนน?')) {
      score = 0;
      highScore = 0;
      localStorage.setItem('thaiWordGameHighScore', 0);
      updateScoreDisplay();
    }
  });
  
  // Add reset score button next to new game button
  newGameButton.parentNode.appendChild(resetScoreButton);
  
  // Event listeners
  newGameButton.addEventListener('click', initGame);
  document.addEventListener('keydown', handleKeyPress);
  
  // Add instruction and keyboard help
  const instructionElement = document.createElement('div');
  instructionElement.classList.add('instruction');
  instructionElement.innerHTML = `
    <p>คุณสามารถใช้แป้นพิมพ์ในการเดาคำได้</p>
    <p>แต้มคะแนน: ชนะ = 100 คะแนน + โบนัสตามความยาวคำและจำนวนครั้งที่เหลือ, แพ้ = -50 คะแนน</p>
    <button id="show-keyboard-help" class="button" style="margin: 10px auto; background-color: #4caf50; font-size: 14px; padding: 8px 15px;">แสดงวิธีการพิมพ์อักษรไทย</button>
  `;
  instructionElement.style.textAlign = 'center';
  instructionElement.style.marginTop = '15px';
  instructionElement.style.fontSize = '14px';
  instructionElement.style.color = '#666';
  keyboardElement.parentNode.insertBefore(instructionElement, keyboardElement.nextSibling);
  
  // Create keyboard help element
  const keyboardHelpElement = document.createElement('div');
  keyboardHelpElement.classList.add('keyboard-help');
  keyboardHelpElement.style.display = 'none'; // Hidden by default
  keyboardHelpElement.innerHTML = `
    <h3>การพิมพ์อักษรไทย</h3>
    <p>คุณสามารถใช้แป้นพิมพ์ปกติเพื่อพิมพ์อักษรไทยได้ตามที่กำหนด:</p>
    <div class="keyboard-layout">
      ${Object.entries(keyboardMap).slice(0, 15).map(([physical, thai]) => `
        <div class="key-mapping">
          <span class="physical-key">${physical}</span> → <span class="thai-key">${thai}</span>
        </div>
      `).join('')}
      <div class="key-mapping"><span class="physical-key">...</span> → <span class="thai-key">และอื่นๆ</span></div>
    </div>
    <p style="margin-top: 10px; font-style: italic;">สลับแป้นพิมพ์เป็นภาษาไทยเพื่อพิมพ์อักษรไทยโดยตรง</p>
    <button id="hide-keyboard-help" class="button" style="margin: 10px auto; background-color: #7f8c8d; font-size: 14px; padding: 8px 15px;">ซ่อน</button>
  `;
  instructionElement.appendChild(keyboardHelpElement);
  
  // Add event listeners for keyboard help toggle
  document.addEventListener('click', (event) => {
    if (event.target.id === 'show-keyboard-help') {
      keyboardHelpElement.style.display = 'block';
    } else if (event.target.id === 'hide-keyboard-help') {
      keyboardHelpElement.style.display = 'none';
    }
  });

  // Start the game
  initGame();
});