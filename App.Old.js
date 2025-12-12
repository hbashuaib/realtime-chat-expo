import React, { useEffect, useState } from 'react';
import { View, StatusBar } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font'
import { MenuProvider } from 'react-native-popup-menu'
import { Provider as PaperProvider } from 'react-native-paper'
import * as Font from 'expo-font'

import SplashScreen from './src/screens/Splash';
import HomeScreen from './src/screens/Home';
import MessagesScreen from './src/screens/Message';
import SearchScreen from './src/screens/Search';
import SignInScreen from './src/screens/SignIn';
import SignUpScreen from './src/screens/SignUp';
import EmojiTest from './src/screens/EmojiTest';
import useGlobal from './src/core/global';

import './src/core/fontawesome'
import MainTabs from './src/navigation/MainTabs';


const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded] = useFonts({
    'LeckerliOne-Regular': require('./src/assets/fonts/LeckerliOne-Regular.ttf'),
    'MontserratExtraBold': require('./src/assets/fonts/Montserrat-ExtraBold.ttf'),
  });

  const initialized = useGlobal(state => state.initialized);
  const authenticated = useGlobal(state => state.authenticated);
  const init = useGlobal(state => state.init);

  useEffect(() => {
    init();
  }, []);

  if (!fontsLoaded) return <View />;

  return (
      <PaperProvider>
        <MenuProvider>
          <StatusBar barStyle="dark-content" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!initialized ? (
              <Stack.Screen name="Splash" component={SplashScreen} />
            ) : !authenticated ? (
              <>
                <Stack.Screen name="SignIn" component={SignInScreen} />
                <Stack.Screen name="SignUp" component={SignUpScreen} />
              </>
            ) : (
              <>
                {/* <Stack.Screen name="MainTabs" component={MainTabs} /> */}
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Search" component={SearchScreen} />
                <Stack.Screen name="Messages" component={MessagesScreen} />
                <Stack.Screen name="EmojiTest" component={EmojiTest} options={{ title: 'Emoji Test'}} />
              </>
            )}
          </Stack.Navigator>
        </MenuProvider>
      </PaperProvider>
    
  );
}