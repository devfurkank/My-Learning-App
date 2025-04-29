import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { getStepsFromYoutube } from '../services/geminiApi';
import { saveProgress, loadProgress } from '../utils/storage';

function extractYoutubeId(url) {
  const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[1].length === 11) ? match[1] : null;
}



export default function VideoStepScreen({ route, navigation }) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark'
    ? { background: '#121212', text: '#fff', textSecondary: '#bbb' }
    : { background: '#fff', text: '#222', textSecondary: '#555' };

  const { youtubeUrl, journeyId, journeyTitle } = route.params || {};
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState({});
  const playerRef = useRef();

  // Progress yükle
  useEffect(() => {
    if (!journeyId) return;
    loadProgress(journeyId).then(setProgress);
  }, [journeyId]);

  useEffect(() => {
    if (!youtubeUrl) return;
    setLoading(true);
    getStepsFromYoutube(youtubeUrl)
      .then(({ steps }) => {
        setSteps(steps);
        setError('');
      })
      .catch(e => {
        setError('Adımlar alınamadı. Lütfen tekrar deneyin.');
        setSteps([]);
      })
      .finally(() => setLoading(false));
  }, [youtubeUrl]);

  const videoId = extractYoutubeId(youtubeUrl);
  const start = steps[currentStep]?.start || 0;
  const end = steps[currentStep]?.end || (start + 60);

  // Adım tamamlanınca otomatik durdur
  const onProgress = (e) => {
    if (e >= end) {
      setPlaying(false);
    }
  };

  if (loading) {
    return <View style={styles.container}><ActivityIndicator size="large" color="#2196f3" style={{ margin: 24 }} /></View>;
  }
  if (error) {
    return <View style={styles.container}><Text style={styles.error}>{error}</Text></View>;
  }
  if (!videoId) {
    return <View style={styles.container}><Text style={styles.error}>Geçerli bir YouTube linki girin.</Text></View>;
  }

  // İlerlememi Gör butonu için fonksiyon
  const goToProgress = () => {
    navigation.navigate('Progress', { journeyId, journeyTitle });
  };

  // Adım tamamlandığında progress'i kaydet
  const completeStep = async (stepIdx) => {
    if (!journeyId) return;
    const newProgress = { ...progress, [stepIdx]: true };
    setProgress(newProgress);
    await saveProgress(journeyId, newProgress);
    import('../utils/notify').then(({ showLocalNotification }) => {
      showLocalNotification({
        title: 'Adım Tamamlandı',
        body: `Adım ${stepIdx + 1} başarıyla tamamlandı!`
      });
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Adım {currentStep + 1} / {steps.length}</Text>
      <Text style={[styles.stepTitle, { color: theme.text }]}>{steps[currentStep]?.title}</Text>
      <Text style={[styles.stepText, { color: theme.text }]}>{steps[currentStep]?.description}</Text>
      <Text style={[styles.timeInfo, { color: theme.textSecondary }]}>Başlangıç: {start}s  |  Bitiş: {end}s</Text>
      <View style={{ width: '100%', aspectRatio: 16/9, marginVertical: 16 }}>
        <YoutubePlayer
          ref={playerRef}
          height={220}
          width={'100%'}
          videoId={videoId}
          play={playing}
          onChangeState={state => {
            if (state === 'ended') setPlaying(false);
          }}
          forceAndroidAutoplay={false}
          initialPlayerParams={{ start, end }}
          onProgress={onProgress}
        />
      </View>
      <Button title="İlerlememi Gör" onPress={goToProgress} color="#1976d2" />
      <Button
        title={currentStep === steps.length - 1 ? 'Soruya Geç' : 'Sonraki Adım'}
        onPress={async () => {
          await completeStep(currentStep);
          if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
          } else {
            navigation.navigate('Question', {
              step: currentStep + 1,
              stepText: steps[currentStep]?.description || '',
              question: '',
              youtubeUrl,
              journeyId,
              steps,
              journeyTitle,
            });
          }
        }}
        color="#43a047"
        disabled={playing}
      />
      {currentStep > 0 && (
        <View style={{ marginTop: 12 }}>
          <Button
            title="Önceki Adım"
            onPress={() => {
              setCurrentStep(s => s - 1);
              setPlaying(false);
            }}
            color="#888"
          />
        </View>
      )}
      <View style={{ marginTop: 16 }}>
        <Button
          title={playing ? 'Durdur' : 'Oynat'}
          onPress={() => setPlaying(p => !p)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 32, marginBottom: 8 },
  stepTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  stepText: { fontSize: 16, marginBottom: 8, textAlign: 'center' },
  timeInfo: { fontSize: 13, marginBottom: 8 },
  error: { color: '#e53935', fontSize: 16, marginTop: 32, fontWeight: 'bold' },
});
