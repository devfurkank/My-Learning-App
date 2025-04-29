import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Alert, useColorScheme } from 'react-native';
import { loadJourneys, addJourney, removeJourney } from '../utils/storage';
import { showLocalNotification } from '../utils/notify';

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export default function HomeScreen({ navigation }) {
  const [journeys, setJourneys] = useState([]);
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchJourneys = async () => {
    setRefreshing(true);
    const list = await loadJourneys();
    setJourneys(list);
    setRefreshing(false);
  };
  useEffect(() => { fetchJourneys(); }, []);

  const handleAdd = async () => {
    if (!title || !youtubeUrl) return;
    await addJourney({ id: generateId(), title, url: youtubeUrl });
    setTitle('');
    setYoutubeUrl('');
    fetchJourneys();
    showLocalNotification({ title: 'Başarılı', body: 'Yeni yolculuk eklendi!' });
  };

  const handleDelete = (id) => {
    Alert.alert('Yolculuk Sil', 'Silmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await removeJourney(id);
        fetchJourneys();
        showLocalNotification({ title: 'Silindi', body: 'Yolculuk başarıyla silindi.' });
      } },
    ]);
  };

  const [progressMap, setProgressMap] = useState({});

  // Her yolculuk için progress'i yükle
  useEffect(() => {
    (async () => {
      const journeys = await loadJourneys();
      const map = {};
      for (const j of journeys) {
        const prog = await import('../utils/storage').then(m => m.loadProgress(j.id));
        map[j.id] = await prog;
      }
      setProgressMap(map);
    })();
  }, [journeys]);

  const renderJourney = ({ item }) => {
    const progress = progressMap[item.id] || {};
    const totalSteps = Object.keys(progress).length ? Object.keys(progress).length : 10;
    const completed = Object.values(progress).filter(Boolean).length;
    const percent = totalSteps ? Math.round((completed / totalSteps) * 100) : 0;
    return (
      <TouchableOpacity style={styles.journeyItem} onPress={() => navigation.navigate('VideoStep', { youtubeUrl: item.url, journeyId: item.id, journeyTitle: item.title })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <View style={[styles.badge, percent === 100 ? styles.badgeDone : styles.badgeInProgress]}>
            {percent === 100 ? <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>✓</Text> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>{percent}%</Text>}
          </View>
          <Text style={styles.journeyTitle}>{item.title}</Text>
        </View>
        <Text style={styles.journeyUrl}>{item.url}</Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBar, { width: `${percent}%`, backgroundColor: percent === 100 ? '#43a047' : '#1976d2' }]} />
        </View>
        <Text style={{ fontSize: 13, color: percent === 100 ? '#43a047' : '#1976d2', marginTop: 4 }}>
          {percent === 100 ? 'Tamamlandı!' : `İlerleme: ${completed} / ${totalSteps}`}
        </Text>
        <Button title="Sil" color="#e53935" onPress={() => handleDelete(item.id)} />
      </TouchableOpacity>
    );
  };


  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }] }>
      <Text style={[styles.title, { color: theme.text }]}>Öğrenme Yolculuklarım</Text>
      <FlatList
        data={journeys}
        renderItem={renderJourney}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={fetchJourneys}
        ListEmptyComponent={<Text style={{ color: theme.textSecondary, marginBottom: 12 }}>Henüz yolculuk yok.</Text>}
        style={{ width: '100%', maxWidth: 400 }}
      />
      <View style={[styles.addBox, { backgroundColor: theme.card }] }>
        <TextInput
          style={[styles.input, { backgroundColor: theme.input, color: theme.text }]}
          placeholder="Yolculuk başlığı"
          placeholderTextColor={theme.textSecondary}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, { backgroundColor: theme.input, color: theme.text }]}
          placeholder="YouTube playlist veya video linki"
          placeholderTextColor={theme.textSecondary}
          value={youtubeUrl}
          onChangeText={setYoutubeUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button title="Yeni Yolculuk Ekle" onPress={handleAdd} disabled={!title || !youtubeUrl} />
      </View>
    </View>
  );
}

const lightTheme = {
  background: '#fff',
  card: '#f7f9fa',
  input: '#fafafa',
  text: '#222',
  textSecondary: '#888',
};
const darkTheme = {
  background: '#181a20',
  card: '#22232b',
  input: '#23242b',
  text: '#fff',
  textSecondary: '#b0b0b0',
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginVertical: 24 },
  addBox: { width: '100%', maxWidth: 400, marginTop: 24, padding: 12, borderRadius: 10, backgroundColor: '#f7f9fa', elevation: 2 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 16, backgroundColor: '#fafafa' },
  journeyItem: { backgroundColor: '#e3f2fd', marginBottom: 14, borderRadius: 10, padding: 16, width: '100%', maxWidth: 400, elevation: 1 },
  journeyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, marginLeft: 10 },
  journeyUrl: { fontSize: 13, color: '#1976d2', marginBottom: 8 },
  progressBarBg: { height: 8, width: '100%', backgroundColor: '#cfd8dc', borderRadius: 5, marginTop: 6 },
  progressBar: { height: 8, borderRadius: 5 },
  badge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  badgeDone: { backgroundColor: '#43a047' },
  badgeInProgress: { backgroundColor: '#1976d2' },
});
