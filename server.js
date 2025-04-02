const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
const port = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'src')));
app.use(express.json());

// API endpoint to get words from Ollama
app.post('/api/getWord', async (req, res) => {
  try {
    // Try to get a word from Ollama first
    try {
      // Get the raw response text first to troubleshoot potential JSON parsing issues
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma3',
          prompt: 'Generate a single Thai word and its hint for a word guessing game. The word should be 3-7 letters long. The hint should explain what the word means in Thai.\n\nRespond ONLY with valid JSON in the format {"word": "Thai word", "hint": "Hint in Thai"} without any explanation or additional text. Just the JSON object.',
          stream: false
        }),
      });
      
      // Get the raw text to see what's happening
      const responseText = await response.text();
      let data;
      
      try {
        // Try to parse the raw text as JSON
        data = JSON.parse(responseText);
      } catch (jsonParseError) {
        console.error("Failed to parse Ollama response as JSON:", responseText.substring(0, 500));
        throw new Error("Invalid JSON response from Ollama API");
      }
      
      // If we get here, we have valid JSON from the API
      
      // Now extract and parse the LLM response
      try {
        // The response might already be parsed by some versions of the API
        let parsedResponse;
        
        if (typeof data.response === 'string') {
          try {
            // Try to parse it as JSON
            parsedResponse = JSON.parse(data.response);
          } catch (e) {
            // If it fails, it might be because the response contains actual JSON already
            console.log("Trying to extract JSON from response text...");
            
            // Try to extract JSON from the text
            const jsonMatch = data.response.match(/\{.*\}/s);
            
            if (jsonMatch) {
              try {
                parsedResponse = JSON.parse(jsonMatch[0]);
              } catch (extractError) {
                console.error("Failed to extract JSON from response:", jsonMatch[0]);
                throw new Error("Failed to extract JSON from Ollama response");
              }
            } else {
              throw new Error("No JSON object found in Ollama response");
            }
          }
        } else if (typeof data.response === 'object') {
          // It's already an object
          parsedResponse = data.response;
        } else {
          throw new Error("Unexpected response format from Ollama");
        }
        
        // Validate that we got a proper word and hint
        if (parsedResponse.word && parsedResponse.hint && 
            typeof parsedResponse.word === 'string' && 
            typeof parsedResponse.hint === 'string') {
          console.log("Using Ollama-generated word:", parsedResponse);
          return res.json(parsedResponse);
        } else {
          throw new Error("Invalid response format from Ollama");
        }
      } catch (parseError) {
        console.error("Error parsing Ollama response:", parseError);
        throw new Error("Could not parse Ollama response");
      }
    } catch (ollamaError) {
      console.error("Error with Ollama, falling back to predefined words:", ollamaError);
      throw ollamaError; // Pass to fallback
    }
  } catch (error) {
    console.error('Error with Ollama, using fallback words:', error);
    
    // Fallback to predefined words (expanded dataset)
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
      { word: 'กระบี่', hint: 'จังหวัดทางภาคใต้ มีหาดทรายขาวและทะเลสวย' },
      { word: 'ภูเก็ต', hint: 'เกาะที่เป็นจังหวัดของไทย เป็นเมืองท่องเที่ยว' },
      { word: 'รำไทย', hint: 'ศิลปะการเต้นรำแบบไทย' },
      { word: 'ขนมไทย', hint: 'ของหวานดั้งเดิมของไทย มักทำจากแป้ง กะทิ และน้ำตาล' },
      { word: 'ไตรมาส', hint: 'ช่วงเวลาสามเดือนในบัญชีหรือการเงิน' },
      { word: 'ธงชาติ', hint: 'สัญลักษณ์ประจำชาติ มีสีแดง ขาว น้ำเงิน' },
      { word: 'มรสุม', hint: 'ลมประจำฤดูกาลที่พัดเป็นประจำในเอเชีย' },
      { word: 'ลาวา', hint: 'หินหลอมเหลวจากภูเขาไฟ' },
      { word: 'เมือง', hint: 'พื้นที่ที่มีประชากรอาศัยอยู่หนาแน่น' },
      { word: 'ถนน', hint: 'เส้นทางสำหรับการเดินทาง' },
      { word: 'ตลาด', hint: 'สถานที่ซื้อขายสินค้า' },
      { word: 'บ้าน', hint: 'ที่อยู่อาศัย' },
      { word: 'อาหาร', hint: 'สิ่งที่กินเพื่อบำรุงร่างกาย' },
      { word: 'หมอ', hint: 'ผู้ที่รักษาโรค' },
      { word: 'ครู', hint: 'ผู้ที่สอนหนังสือ' },
      { word: 'นักเรียน', hint: 'ผู้ที่กำลังศึกษาเล่าเรียน' },
      { word: 'โรงเรียน', hint: 'สถานที่สำหรับการเรียนการสอน' }
    ];
    
    const randomWord = sampleWords[Math.floor(Math.random() * sampleWords.length)];
    res.json(randomWord);
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});