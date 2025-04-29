import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import VideoStepScreen from './screens/VideoStepScreen';
import QuestionScreen from './screens/QuestionScreen';
import ProgressScreen from './screens/ProgressScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Öğrenme Yolculuğu' }} />
        <Stack.Screen name="VideoStep" component={VideoStepScreen} options={{ title: 'Video Adımları' }} />
        <Stack.Screen name="Question" component={QuestionScreen} options={{ title: 'Soru' }} />
        <Stack.Screen name="Progress" component={ProgressScreen} options={{ title: 'İlerleme' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
