// Gemini API entegrasyon servisi
// Google Gemini API Key'inizi burada kullanabilirsiniz

const GEMINI_API_KEY = 'AIzaSyCV1DB59RBCcLvgRklIC-oxh6LolYCcyRk';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * YouTube videosundan transkript ve adımları almak için Gemini API'ye istek atar.
 * @param {string} youtubeUrl
 * @returns {Promise<{steps: string[], transcript: string}>}
 */
export async function getStepsFromYoutube(youtubeUrl) {
  // Gemini promptunu oluştur
  const prompt = `Aşağıdaki YouTube videosunun linkinden transkript çıkar ve 10 adımda özetle. Her adım için başlık, kısa açıklama, başlama ve bitiş saniyesi ver. Formatı şu şekilde döndür:\nBaşlık: ...\nAçıklama: ...\nBaşlangıç: ...\nBitiş: ...\n\nYouTube Link: ${youtubeUrl}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Gemini API hatası');
  }

  const data = await response.json();
  // Gemini'den dönen cevabı işle
  // (Cevap formatı: data.candidates[0].content.parts[0].text)
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  // Adımları ayıkla
  // Her adım: Başlık: ..., Açıklama: ..., Başlangıç: ..., Bitiş: ...
  const stepBlocks = text.split(/\n(?=Başlık: )/).filter(Boolean);
  const steps = stepBlocks.map(block => {
    const title = block.match(/Başlık: (.*)/)?.[1] || '';
    const description = block.match(/Açıklama: (.*)/)?.[1] || '';
    const start = parseInt(block.match(/Başlangıç: (\d+)/)?.[1] || '0', 10);
    const end = parseInt(block.match(/Bitiş: (\d+)/)?.[1] || '0', 10);
    return { title, description, start, end };
  });
  return { steps, transcript: text };
}

/**
 * Kullanıcının cevabını AI ile değerlendirir.
 * @param {string} stepText
 * @param {string} question
 * @param {string} userAnswer
 * @returns {Promise<{correct: boolean, feedback: string}>}
 */
export async function evaluateAnswerWithAI(stepText, question, userAnswer) {
  const prompt = `Aşağıda bir öğrenme adımı, bu adım için bir test sorusu ve kullanıcının verdiği cevap var.\nAdım: ${stepText}\nSoru: ${question}\nCevap: ${userAnswer}\n\nKullanıcının cevabını değerlendir ve sadece şu formatta dön:\nDoğru mu (evet/hayır): ...\nAçıklama: ...`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Gemini API hatası');
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  // Doğru/yanlış ve açıklama ayıkla
  const correct = /Doğru mu.*evet/i.test(text);
  const feedback = text.match(/Açıklama:([\s\S]*)/i)?.[1]?.trim() || '';
  return { correct, feedback };
}

/**
 * Bir adım için Gemini API'den test sorusu üretir.
 * @param {string} stepText
 * @returns {Promise<string>} Soru metni
 */
export async function getQuestionForStep(stepText) {
  const prompt = `Aşağıdaki adım bilgisini öğrenen bir kişiyi test etmek için 4 şıklı (A, B, C, D) çoktan seçmeli bir soru hazırla. SADECE ve SADECE aşağıdaki gibi geçerli ve parse edilebilir bir JSON objesi döndür. Kod bloğu, açıklama veya başka bir şey ekleme.\n{\"question\": \"...\", \"options\": [\"...\", \"...\", \"...\", \"...\"], \"answer\": \"A\"}\nAdım: ${stepText}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Gemini API hatası');
  }

  const data = await response.json();
  const question = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return question.trim();
}

