import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { loadProgress, clearProgress } from '../utils/storage';

export default function ProgressScreen({ route, navigation }) {
  const journeyId = route.params?.journeyId;
  const steps = route.params?.steps || [];
  const journeyTitle = route.params?.journeyTitle || '';
  const [progress, setProgress] = useState({});

  useEffect(() => {
    if (!journeyId) return;
    loadProgress(journeyId).then(setProgress);
  }, [journeyId]);

  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  if (!journeyId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }] }>
        <Text style={[styles.title, { color: theme.text }]}>Yolculuk seçilmedi</Text>
        <Text style={[styles.summary, { color: theme.textSecondary }]}>Lütfen ana ekrandan bir yolculuk seçerek ilerleyin.</Text>
        <Button title="Ana Ekrana Dön" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const completedSteps = Object.keys(progress).length;
  const totalSteps = steps.length || 1;
  const percent = Math.round((completedSteps / totalSteps) * 100);

  // Yolculuk tamamlandıysa kutlama mesajı
  if (route.params?.completed) {
    setTimeout(() => {
      navigation.setParams({ completed: false }); // kutlama mesajı bir kez gösterilsin
    }, 4000);
    return (
      <View style={[styles.container, { backgroundColor: theme.background }] }>
        <Text style={[styles.celebrate, { color: '#43a047' }]}>🎉 TEBRİKLER! 🎉</Text>
        <Text style={[styles.celebrate2, { color: '#1976d2' }]}>Tüm adımları başarıyla tamamladınız!</Text>
        <Text style={[styles.celebrate3, { color: theme.text }]}>🚀 Harika bir öğrenme yolculuğu geçirdiniz. Şimdi yeni bir yolculuğa başlayabilirsiniz!</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }] }>
      <Text style={styles.title}>İlerleme Ekranı</Text>
      <Text style={styles.summary}>{journeyTitle ? `Yolculuk: ${journeyTitle}` : ''}</Text>
      <Text style={styles.summary}>Tamamlanan Adım: {completedSteps} / {totalSteps}</Text>
      <Text style={styles.summary}>Başarı Oranı: %{percent}</Text>
      <ScrollView style={{ width: '100%', marginTop: 20 }}>
        {steps.map((step, idx) => (
          <View key={idx} style={styles.stepBox}>
            <Text style={styles.stepTitle}>Adım {idx + 1}: {step.title}</Text>
            <Text style={{ color: progress[idx] ? 'green' : 'gray' }}>
              {progress[idx] ? 'Tamamlandı' : 'Bekliyor'}
            </Text>
          </View>
        ))}
      </ScrollView>
      <Button title="İlerlemeyi Sıfırla" onPress={async () => { await clearProgress(journeyId); setProgress({}); }} color="#e53935" />
    </View>
  );
}


const lightTheme = {
  background: '#fff',
  card: '#f5f5f5',
  text: '#222',
  textSecondary: '#888',
};
const darkTheme = {
  background: '#181a20',
  card: '#23242b',
  text: '#fff',
  textSecondary: '#b0b0b0',
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 32, marginBottom: 12 },
  summary: { fontSize: 16, marginBottom: 4 },
  stepBox: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepTitle: { fontSize: 15, fontWeight: 'bold' },
  error: { color: '#e53935', fontSize: 16, marginTop: 32, fontWeight: 'bold' },
  celebrate: { fontSize: 38, color: '#43a047', fontWeight: 'bold', marginTop: 80, marginBottom: 16, textAlign: 'center' },
  celebrate2: { fontSize: 22, color: '#1976d2', fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  celebrate3: { fontSize: 17, color: '#333', marginBottom: 32, textAlign: 'center' },
});
