import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import App from './App';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);

  // Background එකේදි channel එක හදලා Notification එක පෙන්නනවා
  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'General Updates',
    importance: AndroidImportance.HIGH,
  });

  const fullBody = remoteMessage.data?.body || remoteMessage.notification?.body || 'New Notification';
  const notifImage = remoteMessage.data?.image_url || remoteMessage.notification?.android?.imageUrl;

  let notificationConfig = {
    title: remoteMessage.data?.title || remoteMessage.notification?.title || 'IMA Campus',
    body: fullBody,
    android: {
      channelId: channelId,
      smallIcon: 'ic_launcher', // අයිකන් එක පෙන්නුවේ නැත්නම් මේක 'ic_stat_name' කියලා වෙනස් කරන්න
      color: '#9B1B1B',
      pressAction: {
        id: 'default',
      },
    },
  };

  if (notifImage) {
    notificationConfig.android.largeIcon = notifImage;
    notificationConfig.android.style = {
      type: AndroidStyle.BIGPICTURE,
      picture: notifImage,
      summary: fullBody,
    };
  }

  // මෙතනින් තමයි Background එකේදි උඩින් පෙන්නන්නේ
  await notifee.displayNotification(notificationConfig);
});

// Expo නිසා ගොඩක් වෙලාවට 'main' තමයි එන්නේ.
AppRegistry.registerComponent('main', () => App);