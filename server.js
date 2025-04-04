const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
const port = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'src')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Redirect root to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

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
          model: 'phi4-mini',
          //prompt: 'Generate a single Thai word and its hint for a word guessing game. The word should be 3-7 letters long. The hint should explain what the word means in Thai.\n\nRespond ONLY with valid JSON in the format {"word": "Thai word", "hint": "Hint in Thai"} without any explanation or additional text. Just the JSON object.',
          prompt: 'สร้างคำภาษาไทยคำเดียวพร้อมคำใบ้สำหรับเกมทายคำศัพท์ภาษาไทย คำควรมีความยาว 3-7 ตัวอักษร และต้องเป็นคำที่มีความหมายชัดเจน คำใบ้ควรอธิบายความหมายของคำนั้นในภาษาไทย\n\nตอบเป็น JSON ด้วยรูปแบบดังนี้เท่านั้น ห้ามเพิ่มข้อความอื่นใด:\n\n{"word": "คำภาษาไทย", "hint": "คำอธิบายความหมายเป็นภาษาไทย"}\n\nใช้ชื่อฟิลด์เป็น "word" และ "hint" เท่านั้น ห้ามใช้ชื่ออื่น',
          //prompt: 'สร้างคำภาษาไทยคำเดียวพร้อมคำใบ้สำหรับเกมทายคำและต้องไม่ซ้ำกัน คำควรมีความยาว 3-7 ตัวอักษร คำใบ้ควรอธิบายความหมายของคำในภาษาไทยตอบด้วย JSON ที่ถูกต้องในรูปแบบ {"word": "คำภาษาไทย", "hint": "คำใบ้เป็นภาษาไทย"} เท่านั้น โดยไม่มีคำอธิบายหรือข้อความเพิ่มเติม เพียงแค่ออบเจ็กต์ JSON',
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
        console.error("JSON parse error:", jsonParseError.message);
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
            
            // Try to extract JSON from the text - using a more robust pattern
            // This pattern looks for JSON objects even if there's extra text around them
            const jsonMatch = data.response.match(/\{[\s\S]*?(?:\}(\s*\n\s*\})?|("\s*\})|(\s*\}))/g);
            
            if (jsonMatch) {
              // Try each matched JSON object until one parses successfully
              let parsedSuccessfully = false;
              
              for (const potentialJson of jsonMatch) {
                try {
                  // Clean the JSON string - remove any trailing backticks or markdown formatting
                  const cleanedJson = potentialJson
                    .replace(/^\s*```json\s*/, '')
                    .replace(/\s*```\s*$/, '')
                    .replace(/^[\s\n]*\{/, '{')
                    .replace(/\}[\s\n]*$/, '}')
                    .trim();
                  
                  parsedResponse = JSON.parse(cleanedJson);
                  parsedSuccessfully = true;
                  console.log("Successfully parsed JSON:", cleanedJson);
                  break;
                } catch (innerError) {
                  console.log(`Failed to parse potential JSON match: ${potentialJson.substring(0, 100)}...`);
                }
              }
              
              if (!parsedSuccessfully) {
                console.error("Failed to extract valid JSON from any matches:", jsonMatch);
                throw new Error("Failed to extract JSON from Ollama response");
              }
            } else {
              console.error("No JSON object found in Ollama response:", data.response);
              throw new Error("No JSON object found in Ollama response");
            }
          }
        } else if (typeof data.response === 'object') {
          // It's already an object
          parsedResponse = data.response;
        } else {
          console.error("Unexpected response format from Ollama:", typeof data.response);
          throw new Error("Unexpected response format from Ollama");
        }
        
        // Validate that we got a proper word and hint/definition
        if (parsedResponse.word && 
            typeof parsedResponse.word === 'string' && 
            ((parsedResponse.hint && typeof parsedResponse.hint === 'string') || 
             (parsedResponse.definition && typeof parsedResponse.definition === 'string'))) {
          
          // Create a standardized response
          const responseObj = {
            word: parsedResponse.word,
            hint: parsedResponse.hint || parsedResponse.definition // Use hint if available, otherwise use definition
          };
          
          console.log("Using Ollama-generated word:", responseObj);
          return res.json(responseObj);
        } else {
          console.error("Invalid response format from Ollama:", parsedResponse);
          throw new Error("Invalid response format from Ollama");
        }
      } catch (parseError) {
        console.error("Error parsing Ollama response:", parseError);
        throw new Error("Could not parse Ollama response");
      }
    } catch (ollamaError) {
      console.error("Error with Ollama API call:", ollamaError.message);
      console.error("Stack trace:", ollamaError.stack);
      console.log("Falling back to predefined words");
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
      { word: 'โรงเรียน', hint: 'สถานที่สำหรับการเรียนการสอน' },
      { word: 'พัทยา', hint: 'เมืองท่องเที่ยวชายทะเลในจังหวัดชลบุรี' },
      { word: 'หัวหิน', hint: 'สถานที่ตากอากาศชายทะเลที่มีชื่อเสียง' },
      { word: 'เกาะสมุย', hint: 'เกาะท่องเที่ยวที่ใหญ่เป็นอันดับสองของไทย' },
      { word: 'สุโขทัย', hint: 'อดีตราชธานีแห่งแรกของไทย' },
      { word: 'พระปฐมเจดีย์', hint: 'พระเจดีย์ที่ใหญ่ที่สุดในประเทศไทย' },
      { word: 'อุทยานแห่งชาติ', hint: 'พื้นที่คุ้มครองธรรมชาติและสัตว์ป่า' },
      { word: 'น้ำตก', hint: 'สายน้ำที่ไหลจากที่สูงลงสู่ที่ต่ำ' },
      { word: 'สนามบิน', hint: 'สถานที่สำหรับเครื่องบินขึ้นลง' },
      { word: 'พัทลุง', hint: 'จังหวัดในภาคใต้ มีทะเลสาบสงขลา' },
      { word: 'สุราษฎร์ธานี', hint: 'จังหวัดใหญ่ในภาคใต้ เป็นประตูสู่เกาะสมุย' },
      { word: 'ขอนแก่น', hint: 'จังหวัดใหญ่ในภาคอีสาน มีมหาวิทยาลัยชื่อดัง' },
      { word: 'อุดรธานี', hint: 'จังหวัดในภาคอีสานเหนือ ใกล้กับประเทศลาว' },
      { word: 'พิษณุโลก', hint: 'จังหวัดในภาคเหนือตอนล่าง มีพระพุทธชินราช' },
      { word: 'แม่ฮ่องสอน', hint: 'จังหวัดในภาคเหนือ มีหมอกและภูเขา' },
      { word: 'ระยอง', hint: 'จังหวัดชายทะเลภาคตะวันออก มีอุตสาหกรรม' },
      { word: 'เขาใหญ่', hint: 'อุทยานแห่งชาติที่มีป่าและสัตว์ป่า ใกล้กรุงเทพฯ' },
      { word: 'เชียงราย', hint: 'จังหวัดเหนือสุดของประเทศไทย มีดอยตุง' },
      { word: 'กาญจนบุรี', hint: 'จังหวัดตะวันตกมีสะพานข้ามแม่น้ำแคว' },
      { word: 'แกงมัสมั่น', hint: 'แกงกะทิใส่เนื้อและมันฝรั่ง มีกลิ่นเครื่องเทศ' },
      { word: 'ข้าวเหนียวมะม่วง', hint: 'ขนมหวานที่มีข้าวเหนียวและมะม่วงสุก' },
      { word: 'ขนมจีน', hint: 'เส้นหมักทำจากแป้งข้าวเจ้า มักกินกับน้ำยา' },
      { word: 'ยำ', hint: 'อาหารไทยประเภทเครื่องเคียง รสเปรี้ยวเผ็ด' },
      { word: 'มังคุด', hint: 'ผลไม้เปลือกแข็งสีม่วง เนื้อขาวรสหวานอมเปรี้ยว' },
      { word: 'มะม่วง', hint: 'ผลไม้รสหวาน มีทั้งกินดิบและสุก' },
      { word: 'เงาะ', hint: 'ผลไม้เปลือกขรุขระสีแดง เนื้อใสหวาน' },
      { word: 'ลำไย', hint: 'ผลไม้เปลือกกรอบสีน้ำตาล เนื้อใสหวาน' },
      { word: 'ขนมครก', hint: 'ขนมไทยที่ทำจากแป้งข้าว มีลักษณะเป็นวงกลม' },
      { word: 'ข้าวผัด', hint: 'อาหารที่นำข้าวมาผัดกับเครื่องปรุง' },
      { word: 'ข้าวมันไก่', hint: 'อาหารจานเดียว มีข้าวหุงกับน้ำมันไก่และไก่ต้ม' },
      { word: 'แกงส้ม', hint: 'แกงรสเปรี้ยว มีพริกและผักต่างๆ' },
      { word: 'น้ำพริก', hint: 'อาหารประเภทเครื่องจิ้ม ทำจากพริกและเครื่องปรุง' },
      { word: 'ข้าวเหนียว', hint: 'ข้าวชนิดหนึ่ง เมื่อหุงสุกแล้วเหนียว' },
      { word: 'สับปะรด', hint: 'ผลไม้รสเปรี้ยวอมหวาน มีหนามที่เปลือก' },
      { word: 'มะละกอ', hint: 'ผลไม้รสหวาน ใช้ทำส้มตำ' },
      { word: 'ชมพู่', hint: 'ผลไม้รูปคล้ายระฆัง สีชมพูหรือเขียว' },
      { word: 'กล้วย', hint: 'ผลไม้สีเหลือง มีหลายพันธุ์' },
      { word: 'ขนมชั้น', hint: 'ขนมไทยที่มีหลายชั้น สีสันสวยงาม' },
      { word: 'ทองหยิบ', hint: 'ขนมไทยทำจากไข่และน้ำตาล รูปร่างคล้ายดอกไม้' },
      { word: 'ไหว้', hint: 'การแสดงความเคารพแบบไทย ด้วยการประนมมือ' },
      { word: 'วัฒนธรรม', hint: 'แบบแผนพฤติกรรมและความเชื่อของกลุ่มคน' },
      { word: 'พระพุทธรูป', hint: 'รูปเคารพแทนองค์พระพุทธเจ้า' },
      { word: 'ผ้าไหม', hint: 'ผ้าทอมีค่าของไทย ทำจากเส้นใยไหม' },
      { word: 'ดนตรีไทย', hint: 'เครื่องดนตรีและบทเพลงแบบไทย' },
      { word: 'ประเพณี', hint: 'แบบแผนที่ปฏิบัติสืบต่อกันมา' },
      { word: 'วัด', hint: 'ศาสนสถานในพุทธศาสนา' },
      { word: 'พระสงฆ์', hint: 'นักบวชในพระพุทธศาสนา นุ่งห่มจีวรสีเหลือง' },
      { word: 'ศาลพระภูมิ', hint: 'ศาลเล็กๆ ที่สร้างไว้สำหรับบูชาเทพารักษ์' },
      { word: 'บั้งไฟ', hint: 'ประเพณีในภาคอีสาน มีการจุดพลุขนาดใหญ่' },
      { word: 'ผีตาโขน', hint: 'เทศกาลแห่หน้ากากผีที่จังหวัดเลย' },
      { word: 'ฉัตร', hint: 'เครื่องสูงที่อยู่เหนือพระพุทธรูปหรือศาสนวัตถุ' },
      { word: 'กราบ', hint: 'การแสดงความเคารพอย่างสูง โดยให้ศีรษะจรดพื้น' },
      { word: 'ผ้าขาวม้า', hint: 'ผ้าทอแบบดั้งเดิมของไทย ใช้ได้หลายวัตถุประสงค์' },
      { word: 'ตำนาน', hint: 'เรื่องเล่าที่สืบทอดกันมา เกี่ยวกับประวัติความเป็นมา' },
      { word: 'ทะเล', hint: 'พื้นที่น้ำเค็มขนาดใหญ่' },
      { word: 'ภูเขา', hint: 'พื้นที่สูงชันผิวโลก' },
      { word: 'แม่น้ำเจ้าพระยา', hint: 'แม่น้ำสายสำคัญที่ไหลผ่านกรุงเทพฯ' },
      { word: 'กล้วยไม้', hint: 'ดอกไม้ที่เป็นสัญลักษณ์ของเมืองไทย มีหลากสี' },
      { word: 'ลิง', hint: 'สัตว์เลี้ยงลูกด้วยนมที่คล้ายมนุษย์' },
      { word: 'เสือโคร่ง', hint: 'สัตว์ป่าใหญ่มีลายทาง อยู่ในป่าไทย' },
      { word: 'นกยูง', hint: 'นกที่มีหางสวยงาม แผ่เป็นพัด' },
      { word: 'ช้างป่า', hint: 'ช้างที่อาศัยอยู่ในธรรมชาติ ไม่ถูกเลี้ยง' },
      { word: 'กระรอก', hint: 'สัตว์ฟันแทะขนาดเล็ก มีหางฟู' },
      { word: 'งูเห่า', hint: 'งูพิษที่แผ่แม่เบี้ยและมีเสียงขู่' },
      { word: 'จระเข้', hint: 'สัตว์เลื้อยคลานขนาดใหญ่ อาศัยในน้ำ' },
      { word: 'ป่าชายเลน', hint: 'ป่าที่อยู่บริเวณชายฝั่งทะเล น้ำทะเลท่วมถึง' },
      { word: 'ดอกบัว', hint: 'ดอกไม้ที่เติบโตในน้ำ เป็นสัญลักษณ์ทางพุทธศาสนา' },
      { word: 'กระเพรา', hint: 'สมุนไพรที่มีกลิ่นหอม ใช้ประกอบอาหาร' },
      { word: 'มะกรูด', hint: 'พืชตระกูลส้ม ใช้ในอาหารไทย' },
      { word: 'ตะพาบน้ำ', hint: 'สัตว์เลื้อยคลานคล้ายเต่า อาศัยในน้ำ' },
      { word: 'แมงมุม', hint: 'สัตว์ขาปล้องที่ชอบชักใย' },
      { word: 'โทรศัพท์มือถือ', hint: 'อุปกรณ์สื่อสารพกพา' },
      { word: 'อินเทอร์เน็ต', hint: 'เครือข่ายคอมพิวเตอร์ทั่วโลก' },
      { word: 'รถไฟฟ้า', hint: 'ระบบขนส่งมวลชนในกรุงเทพฯ' },
      { word: 'สมาร์ทโฟน', hint: 'โทรศัพท์อัจฉริยะที่ใช้แอพพลิเคชั่น' },
      { word: 'คอมพิวเตอร์', hint: 'อุปกรณ์อิเล็กทรอนิกส์สำหรับประมวลผลข้อมูล' },
      { word: 'รถยนต์', hint: 'ยานพาหนะสี่ล้อที่ขับเคลื่อนด้วยเครื่องยนต์' },
      { word: 'โซเชียลมีเดีย', hint: 'สื่อออนไลน์สำหรับการแบ่งปันข้อมูล' },
      { word: 'แอพพลิเคชั่น', hint: 'โปรแกรมที่ใช้งานบนอุปกรณ์พกพา' },
      { word: 'วิทยาศาสตร์', hint: 'การศึกษาเกี่ยวกับธรรมชาติและจักรวาล' },
      { word: 'เทคโนโลยี', hint: 'การประยุกต์ความรู้ทางวิทยาศาสตร์' },
      { word: 'พลังงานแสงอาทิตย์', hint: 'พลังงานที่ได้จากดวงอาทิตย์' },
      { word: 'ปัญญาประดิษฐ์', hint: 'เทคโนโลยีที่จำลองความฉลาดของมนุษย์' },
      { word: 'แท็บเล็ต', hint: 'คอมพิวเตอร์แบบพกพาที่มีหน้าจอสัมผัส' },
      { word: 'เน็ตไอดอล', hint: 'บุคคลที่มีชื่อเสียงบนอินเทอร์เน็ต' },
      { word: 'สตรีมมิ่ง', hint: 'การส่งข้อมูลภาพและเสียงผ่านอินเทอร์เน็ต' },
      { word: 'ตลาดนัด', hint: 'ตลาดที่จัดขึ้นในวันเวลาที่กำหนด' },
      { word: 'รถเมล์', hint: 'รถโดยสารประจำทางในเมือง' },
      { word: 'ห้างสรรพสินค้า', hint: 'อาคารขนาดใหญ่ที่รวมร้านค้าหลายประเภท' },
      { word: 'ร้านอาหาร', hint: 'สถานที่จำหน่ายอาหารปรุงสำเร็จ' },
      { word: 'ตำรวจ', hint: 'เจ้าหน้าที่รักษากฎหมาย' },
      { word: 'ธนาคาร', hint: 'สถาบันการเงินที่รับฝากและให้กู้ยืมเงิน' },
      { word: 'โรงพยาบาล', hint: 'สถานที่รักษาผู้ป่วย' },
      { word: 'มหาวิทยาลัย', hint: 'สถาบันการศึกษาระดับสูง' },
      { word: 'อพาร์ทเม้นท์', hint: 'ที่พักอาศัยให้เช่า เป็นห้องหรือชุด' },
      { word: 'หอพัก', hint: 'ที่พักสำหรับนักเรียนหรือนักศึกษา' },
      { word: 'ร้านเสริมสวย', hint: 'ร้านที่ให้บริการเกี่ยวกับทรงผมและความงาม' },
      { word: 'ปั๊มน้ำมัน', hint: 'สถานที่เติมน้ำมันเชื้อเพลิงให้ยานพาหนะ' },
      { word: 'ร้านกาแฟ', hint: 'ร้านที่ขายกาแฟและเครื่องดื่ม' },
      { word: 'ร้านขายยา', hint: 'สถานที่จำหน่ายยาและผลิตภัณฑ์สุขภาพ' },
      { word: 'ร้านสะดวกซื้อ', hint: 'ร้านค้าขนาดเล็กที่เปิดตลอด 24 ชั่วโมง' },
      { word: 'ศูนย์การค้า', hint: 'อาคารขนาดใหญ่ที่รวมร้านค้าและกิจกรรมต่างๆ' },
      { word: 'ฝน', hint: 'น้ำที่ตกลงมาจากท้องฟ้า' },
      { word: 'ร้อน', hint: 'อุณหภูมิสูง ทำให้รู้สึกไม่สบายตัว' },
      { word: 'หนาว', hint: 'อุณหภูมิต่ำ ทำให้รู้สึกหนาวเย็น' },
      { word: 'ฤดูกาล', hint: 'ช่วงเวลาในรอบปีที่มีลักษณะอากาศแตกต่างกัน' },
      { word: 'น้ำท่วม', hint: 'ภัยธรรมชาติที่น้ำล้นตลิ่งหรือไหลท่วม' },
      { word: 'พายุ', hint: 'ลมแรงที่ก่อให้เกิดความเสียหาย' },
      { word: 'ฟ้าผ่า', hint: 'ประจุไฟฟ้าที่เกิดจากเมฆฝน' },
      { word: 'หมอก', hint: 'ละอองน้ำที่ลอยอยู่ใกล้พื้นดิน ทำให้มองเห็นไม่ชัด' },
      { word: 'ฤดูร้อน', hint: 'ฤดูกาลที่มีอากาศร้อน ช่วงมีนาคมถึงมิถุนายน' },
      { word: 'ฤดูฝน', hint: 'ฤดูกาลที่มีฝนตกชุก ช่วงกรกฎาคมถึงตุลาคม' },
      { word: 'ฤดูหนาว', hint: 'ฤดูกาลที่มีอากาศเย็น ช่วงพฤศจิกายนถึงกุมภาพันธ์' },
      { word: 'แดด', hint: 'แสงจากดวงอาทิตย์' },
      { word: 'เมฆ', hint: 'กลุ่มละอองน้ำในอากาศที่มองเห็นเป็นก้อน' },
      { word: 'ลูกเห็บ', hint: 'น้ำฝนที่กลายเป็นก้อนน้ำแข็งตกลงมา' },
      { word: 'ไต้ฝุ่น', hint: 'พายุหมุนขนาดใหญ่ในมหาสมุทรแปซิฟิก' },
      { word: 'สีแดง', hint: 'สีของเลือด หรือสีของไฟจราจรที่ห้ามผ่าน' },
      { word: 'สีเขียว', hint: 'สีของใบไม้ หรือสีของไฟจราจรที่ให้ผ่านได้' },
      { word: 'สีน้ำเงิน', hint: 'สีของท้องฟ้า หรือมหาสมุทร' },
      { word: 'สีเหลือง', hint: 'สีของแสงอาทิตย์ หรือไฟเตือนจราจร' },
      { word: 'หนึ่ง', hint: 'จำนวนนับแรก (1)' },
      { word: 'สิบ', hint: 'จำนวนนับที่มาหลังเลข 9 (10)' },
      { word: 'ร้อย', hint: 'จำนวนสิบคูณสิบ (100)' },
      { word: 'พัน', hint: 'จำนวนสิบคูณร้อย (1000)' },
      { word: 'สีชมพู', hint: 'สีที่คล้ายกับดอกกุหลาบ' },
      { word: 'สีม่วง', hint: 'สีที่ได้จากการผสมระหว่างสีแดงและน้ำเงิน' }
    ];
    
    const randomWord = sampleWords[Math.floor(Math.random() * sampleWords.length)];
    res.json(randomWord);
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
