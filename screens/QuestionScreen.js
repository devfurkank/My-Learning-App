import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, TextInput, ActivityIndicator, useColorScheme, TouchableOpacity } from 'react-native';
import { getQuestionForStep, evaluateAnswerWithAI } from '../services/geminiApi';
import { saveProgress, loadProgress } from '../utils/storage';

export default function QuestionScreen({ route, navigation }) {
  // Adım ve soru route ile alınır
  const step = route.params?.step || 1;
  const stepText = route.params?.stepText || `Adım ${step}: React Native ile bir bileşen nasıl oluşturulur?`;
  const [question, setQuestion] = useState(route.params?.question || '');
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  // Çoklu yolculuk için ek parametreler
  const journeyId = route.params?.journeyId;
  const steps = route.params?.steps || [];
  const journeyTitle = route.params?.journeyTitle || '';

  // Eğer soru parametreyle gelmediyse AI'dan çek
  useEffect(() => {
    if (question) { setLoading(false); return; }
    setLoading(true);
    getQuestionForStep(stepText)
      .then(q => setQuestion(q))
      .catch(() => setQuestion('Soru alınamadı.'))
      .finally(() => setLoading(false));
  }, [step, stepText]);

  // Çoktan seçmeli soru parse
  // Gemini'den gelen bozuk JSON'u düzelt
  function fixGeminiJson(str) {
    if (!str) return '';
    let s = str.trim();
    // Kod bloğu başı/sonu ve satır başı/sonu boşlukları kaldır
    s = s.replace(/^(```json|'''json|```|''')/i, '').replace(/(```|''')$/i, '');
    s = s.replace(/^\s+|\s+$/g, '');
    // Unicode ve yanlış tırnak karakterlerini düzelt
    s = s.replace(/[\u201C\u201D\u201E\u201F\u275D\u275E\u301D\u301E\u301F\uFF02]/g, '"');
    s = s.replace(/[\u2018\u2019\u201A\u201B\u275B\u275C\u2039\u203A\u2032\u2035]/g, "'");
    // Tüm anahtarları başında ve sonunda çift tırnak olacak şekilde zorla düzelt (global replace)
    s = s.replace(/([{,]\s*)([a-zA-Z0-9_]+)[”"']?\s*:/g, '$1"$2":');
    // En baştaki {question": ... gibi durumları da zorla düzelt
    s = s.replace(/^{\s*([a-zA-Z0-9_]+)[”"']?\s*:/, '{"$1":');
    // Son kalan tek tırnakları çift tırnağa çevir
    s = s.replace(/'/g, '"');
    // Yanlış escape karakterlerini düzelt
    s = s.replace(/\\'/g, "'").replace(/\\"/g, '"');
    // Fazlalık yeni satırları kaldır
    s = s.replace(/\n/g, ' ');
    // Çift virgül, fazla virgül düzelt
    s = s.replace(/,\s*,/g, ',');
    // Fazla boşlukları temizle
    s = s.replace(/\s+/g, ' ');
    // Sonunda } yoksa ekle
    if (!s.trim().endsWith('}')) s = s.trim() + '}';
    // Başında { yoksa ekle
    if (!s.trim().startsWith('{')) s = '{' + s.trim();
    return s;
  }

  let parsed = null;
  let parseError = '';
  try {
    if (typeof question === 'string') {
      const cleaned = fixGeminiJson(question);
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    }
  } catch (err) {
    parseError = err.message || String(err);
  }
  const isMulti = parsed && parsed.question && parsed.options && parsed.answer && Array.isArray(parsed.options) && parsed.options.length === 4;


  const checkAnswer = async () => {
    setEvaluating(true);
    try {
      const result = await evaluateAnswerWithAI(stepText, question, answer);
      setFeedback(result.correct
        ? `🎉 Tebrikler! ${step >= steps.length ? 'Tüm adımları başarıyla tamamladınız! 🚀' : 'Doğru cevap, bir sonraki adıma geçiyorsunuz!'}`
        : result.feedback || 'Yanıt değerlendirilemedi.');
      if (result.correct) {
        import('../utils/notify').then(({ showLocalNotification }) => {
          showLocalNotification({
            title: step >= steps.length ? 'Tebrikler!' : 'Doğru Cevap!',
            body: step >= steps.length ? 'Tüm adımları başarıyla tamamladınız!' : 'Bir sonraki adıma geçiyorsunuz.'
          });
        });
      }
      setTimeout(async () => {
        setFeedback('');
        if (result.correct) {
          // Progress'i kaydet
          if (journeyId) {
            const oldProgress = await loadProgress(journeyId);
            const newProgress = { ...oldProgress, [step - 1]: true };
            await saveProgress(journeyId, newProgress);
          }
          // Son adım mı kontrolü
          if (step >= steps.length) {
            // Kutlama mesajı için özel ekran/modal
            navigation.navigate('Progress', { journeyId, steps, journeyTitle, completed: true });
          } else {
            navigation.navigate('VideoStep', { step: step + 1, youtubeUrl: route.params?.youtubeUrl, journeyId, steps, journeyTitle });
          }
        } else {
          navigation.navigate('VideoStep', { step, youtubeUrl: route.params?.youtubeUrl, journeyId, steps, journeyTitle });
        }
      }, result.correct && step >= steps.length ? 4000 : 2500);
    } catch {
      setFeedback('Cevap değerlendirilemedi.');
    } finally {
      setEvaluating(false);
    }
  };


  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  if (loading) {
    return <View style={[styles.container, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color="#2196f3" /></View>;
  }
  // JSON parse hatası veya yanlış formatta ise kullanıcıya teknik detay gösterme
  if (!isMulti && (question.includes('question') && question.includes('options') && question.includes('answer'))) {
    // Debug için temizlenmiş JSON'u ve parse hatasını da göster
    const cleaned = fixGeminiJson(question);
    return (
      <View style={[styles.container, { backgroundColor: theme.background }] }>
        <Text style={[styles.title, { color: theme.text }]}>Soru yüklenemedi. Lütfen tekrar deneyin.</Text>
        <View style={{ backgroundColor: '#eee', padding: 12, marginTop: 14, borderRadius: 8, maxWidth: 350 }}>
          <Text style={{ color: '#c00', fontSize: 11 }}>Ham: {question}{'\n'}---\nTemizlenmiş: {cleaned}{'\n'}---\nParse Hatası: {parseError}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }] }>
      <Text style={[styles.title, { color: theme.text }]}>Soru Ekranı</Text>
      {isMulti ? (
        <>
          <Text style={[styles.question, { color: theme.text }]}>{parsed.question}</Text>
          {parsed.options.map((opt, idx) => {
            const isSelected = answer === String.fromCharCode(65+idx);
            return (
              <TouchableOpacity
                key={idx}
                style={{
                  backgroundColor: isSelected ? '#1976d2' : '#fafafa',
                  borderRadius: 8,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? '#1976d2' : '#bbb',
                  marginVertical: 7,
                  paddingVertical: 13,
                  paddingHorizontal: 18,
                  width: 320,
                  alignSelf: 'center',
                  opacity: evaluating ? 0.6 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={async () => {
                  if (evaluating) return;
                  setAnswer(String.fromCharCode(65+idx));
                  setEvaluating(true);
                  // Cevap kontrolü
                  const correct = parsed.answer === String.fromCharCode(65+idx);
                  setFeedback(correct
                    ? `🎉 Tebrikler! ${step >= steps.length ? 'Tüm adımları başarıyla tamamladınız! 🚀' : 'Doğru cevap, bir sonraki adıma geçiyorsunuz!'}`
                    : 'Yanlış cevap!');
                  if (correct) {
                    import('../utils/notify').then(({ showLocalNotification }) => {
                      showLocalNotification({
                        title: step >= steps.length ? 'Tebrikler!' : 'Doğru Cevap!',
                        body: step >= steps.length ? 'Tüm adımları başarıyla tamamladınız!' : 'Bir sonraki adıma geçiyorsunuz.'
                      });
                    });
                  }
                  setTimeout(async () => {
                    setFeedback('');
                    setEvaluating(false);
                    if (correct) {
                      // Progress'i kaydet
                      if (journeyId) {
                        const oldProgress = await loadProgress(journeyId);
                        const newProgress = { ...oldProgress, [step - 1]: true };
                        await saveProgress(journeyId, newProgress);
                      }
                      // Son adım mı kontrolü
                      if (step >= steps.length) {
                        navigation.navigate('Progress', { journeyId, steps, journeyTitle, completed: true });
                      } else {
                        navigation.navigate('VideoStep', { step: step + 1, youtubeUrl: route.params?.youtubeUrl, journeyId, steps, journeyTitle });
                      }
                    }
                  }, correct && step >= steps.length ? 4000 : 1500);
                }}
                disabled={evaluating}
              >
                <Text style={{ color: isSelected ? '#fff' : '#222', fontSize: 16, flex: 1 }}>
                  {String.fromCharCode(65+idx) + ') ' + opt.replace(/^[A-D]\)\s*/, '')}
                </Text>
                {isSelected && <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        </>
      ) : (
        <>
          <Text style={[styles.question, { color: theme.text }]}>{question}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.input, color: theme.text }]}
            placeholder="Cevabınızı yazın"
            placeholderTextColor={theme.textSecondary}
            value={answer}
            onChangeText={setAnswer}
            multiline
          />
          <Button title={evaluating ? "Değerlendiriliyor..." : "Cevabı Gönder"} onPress={checkAnswer} disabled={!answer || evaluating} />
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        </>
      )}
    </View>
  );
}

const lightTheme = {
  background: '#fff',
  input: '#fafafa',
  text: '#222',
  textSecondary: '#888',
};
const darkTheme = {
  background: '#181a20',
  input: '#23242b',
  text: '#fff',
  textSecondary: '#b0b0b0',
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  question: { fontSize: 17, marginBottom: 16, textAlign: 'center' },
  input: { width: '100%', maxWidth: 350, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, backgroundColor: '#fafafa' },
  feedback: { fontSize: 16, marginTop: 18, color: '#2196f3', fontWeight: 'bold' },
});
