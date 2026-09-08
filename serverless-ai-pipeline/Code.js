const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
const INPUT_FOLDER_ID = "YOUR_INPUT_FOLDER_ID";
const OUTPUT_FOLDER_ID = "YOUR_OUTPUT_FOLDER_ID";
const MASK = 78236; // Deterministic calculation mask

function processPhysicsFiles() {
  const startTime = new Date().getTime();
  const MAX_EXECUTION_TIME = 5 * 60 * 1000; // 5 хвилин захисного таймауту

  const inputFolder = DriveApp.getFolderById(INPUT_FOLDER_ID);
  const outputFolder = DriveApp.getFolderById(OUTPUT_FOLDER_ID);

  const existingFiles = [];
  const existingFilesIterator = outputFolder.getFiles();
  while (existingFilesIterator.hasNext()) {
    existingFiles.push(existingFilesIterator.next().getName());
  }

  const files = inputFolder.getFilesByType(MimeType.PLAIN_TEXT);

  while (files.hasNext()) {
    if (new Date().getTime() - startTime > MAX_EXECUTION_TIME) {
      Logger.log("Time threshold reached (5m). Safe exit. Pending files deferred to next trigger.");
      return;
    }

    const file = files.next();
    const fileName = file.getName();
    const newFileName = "ua_" + fileName;

    if (existingFiles.includes(newFileName)) {
      Logger.log("Skipped (Already exists): " + fileName);
      continue;
    }

    Logger.log("Processing file: " + fileName);
    const originalText = file.getBlob().getDataAsString('UTF-8');

    const translatedText = callGeminiTranslate(originalText);
    const finalText = processNumbers(translatedText);

    outputFolder.createFile(newFileName, finalText, MimeType.PLAIN_TEXT);
    Logger.log("Successfully stored: " + newFileName);

    Utilities.sleep(2000);
  }
  Logger.log("Batch run complete. All files processed.");
}

function callGeminiTranslate(text) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" + GEMINI_API_KEY;

  const systemInstruction = 
    "Ти точний технічний перекладач фізичних завдань. " +
    "Перекладай виключно з російської на українську мову слово в слово за змістом. " +
    "КАТЕГОРИЧНО ЗАБОРОНЕНО змінювати фізичні терміни та шукані величини " +
    "(наприклад: 'разность потенциалов' перекладати ВИКЛЮЧНО як 'різниця потенціалів', а не 'опір'; 'сопротивление' — як 'опір'). " +
    "Зберігай структуру рядків, номери завдань, символи і всі початкові числа незмінними. " +
    "Не розв'язуй задачі і не додавай пояснень.";

  const payload = {
    contents: [{
      parts: [
        { text: systemInstruction + "\n\n" + text }
      ]
    }],
    generationConfig: {
      temperature: 0.1
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());

    if (json.error) {
      if (json.error.code === 503 || json.error.message.includes("high demand")) {
        Logger.log(`Server busy (503). Attempt ${attempt} of 3. Retrying in 5s...`);
        Utilities.sleep(5000);
        continue;
      }
      throw new Error("Gemini API Error: " + json.error.message);
    }

    if (json.candidates && json.candidates[0] && json.candidates[0].content) {
      return json.candidates[0].content.parts[0].text;
    }
  }

  throw new Error("Failed to retrieve inference response after 3 retries.");
}

function processNumbers(text) {
  return text.replace(/(?<=^|\s)(\d+([,\.]\d+)?)(?=\s|$)/gm, function(match, p1) {
    let numStr = p1.replace(',', '.');
    let num = parseFloat(numStr);

    if (!isNaN(num) && num > MASK) {
      let result = num - MASK;
      result = Math.round(result * 100) / 100;
      return p1.includes(',') ? result.toString().replace('.', ',') : result.toString();
    }
    return match;
  });
}
