import React, { useEffect, useContext } from 'react';
import { StatusBar, ActivityIndicator, View, Alert, PermissionsAndroid, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native'; 

import { CourseProvider } from './src/context/CourseContext'; 
import { AuthProvider, AuthContext } from './src/context/AuthContext'; 
import COLORS from './src/constants/colors';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import CoursesScreen from './src/screens/CoursesScreen';
import CourseDetailsScreen from './src/screens/CourseDetailsScreen';
import PaymentScreen from './src/screens/PaymentScreen'; 
import MyCoursesScreen from './src/screens/MyCoursesScreen';
import ProfileScreen from './src/screens/ProfileScreen'; 
import DownloadsScreen from './src/screens/DownloadsScreen';
import CourseContentScreen from './src/screens/CourseContentScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import LiveScreen from './src/screens/LiveScreen';
import PaymentMethodScreen from './src/screens/PaymentMethodScreen'; 

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { height: 70, paddingBottom: 12, paddingTop: 8, backgroundColor: 'white', elevation: 20 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: 'bold' },
        tabBarIcon: ({ color, focused }) => {
          let iconName;
          let iconSize = focused ? 30 : 26;

          if (route.name === 'Home') iconName = 'home-variant';
          else if (route.name === 'Courses') iconName = 'book-open-page-variant';
          else if (route.name === 'Live') iconName = 'video-wireless';
          else if (route.name === 'My Courses') iconName = 'play-box-multiple';
          else if (route.name === 'Payments') iconName = 'wallet';

          return <Icon name={iconName} color={color} size={iconSize} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Courses" component={CoursesScreen} />
      <Tab.Screen name="Live" component={LiveScreen} />
      <Tab.Screen name="My Courses" component={MyCoursesScreen} />
      <Tab.Screen name="Payments" component={PaymentScreen} /> 
    </Tab.Navigator>
  );
}

const AppNavigation = () => {
  const { userToken, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userToken == null ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
          <Stack.Screen name="Downloads" component={DownloadsScreen} options={{ headerShown: true, title: 'My Downloads' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Profile' }} />
          <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} options={{ headerShown: true, title: 'Enroll Course' }} />
          <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
          <Stack.Screen name="CourseContent" component={CourseContentScreen} />
          <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} options={{ title: 'Select Payment Method' }} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {

  // --- NOTIFICATION LOGIC START ---
  useEffect(() => {
    const setupNotifications = async () => {
      // 1. Android 13+ walata Permission illanna
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      // 2. Firebase Permissions
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Authorization status:', authStatus);
      }

      // 3. Create Channel
      await notifee.createChannel({
        id: 'default', 
        name: 'General Updates',
        importance: AndroidImportance.HIGH, 
        sound: 'default',
      });

      // 4. Subscribe to Topic
      await messaging().subscribeToTopic('ima_updates');
      console.log('Subscribed to ima_updates topic');
    };

    setupNotifications();

    // 5. Foreground Handler (UPDATED: Smart Text Truncate to Show Images)
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('Foreground Message Full:', JSON.stringify(remoteMessage, null, 2));

      // Image URL Logic
      const notifImage = remoteMessage.notification?.android?.imageUrl;
      const dataImage = remoteMessage.data?.image_url;
      const imageUrl = notifImage || dataImage;
      
      console.log('Final Image URL To Display:', imageUrl); 

      // Body Text Handle Kirima
      // Image ekak thiyenawanam, api body eka diga wadi wenna denne na.
      // Mokada body eka digai nam Android eken Image eka hangala Text eka pennanawa.
      const fullBody = remoteMessage.notification?.body || 'New Notification';
      const truncatedBody = fullBody.length > 40 
          ? fullBody.substring(0, 40) + '... (Pull down 👇)' 
          : fullBody;

      // Base Configuration
      let notificationConfig = {
        title: remoteMessage.notification?.title || 'IMA Campus',
        // Image ekak thiyenawanam short text, nathnam full text
        body: imageUrl ? truncatedBody : fullBody,
        android: {
          channelId: 'default',
          smallIcon: 'ic_launcher',
          color: COLORS.primary,
          pressAction: {
            id: 'default',
          },
        },
      };

      // Image Style Logic
      if (imageUrl) {
        console.log("Applying Image Styles (LargeIcon + BigPicture)..."); 
        
        // 1. Large Icon (Collapsed view eke paththen penna)
        notificationConfig.android.largeIcon = imageUrl;

        // 2. Big Picture (Expand karama lokuwata penna + Full Text eka summary ekata)
        notificationConfig.android.style = {
          type: AndroidStyle.BIGPICTURE,
          picture: imageUrl,
          summary: fullBody, // Expand karama methana full text eka pennanawa
        };
      } else {
        console.log("No Image Found - Using BigText Style");
        notificationConfig.android.style = {
            type: AndroidStyle.BIGTEXT,
            text: fullBody
        };
      }

      // Notification eka pennanna
      await notifee.displayNotification(notificationConfig);
    });

    return unsubscribe;
  }, []);
  // --- NOTIFICATION LOGIC END ---

  return (
    <AuthProvider>
      <CourseProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
          <AppNavigation />
        </NavigationContainer>
      </CourseProvider>
    </AuthProvider>
  );
}