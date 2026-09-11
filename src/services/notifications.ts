import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Rest-timer completion as a local notification, so the phone buzzes with the
 * screen off and in a pocket. No remote/push anything.
 */

let configured = false;

export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('rest-timer', {
        name: 'Rest timer',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 100, 250],
        sound: 'default',
      });
    }
  } catch {
    // Expo Go without notification support — the in-app haptic still fires.
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

let pendingId: string | null = null;

export async function scheduleRestDone(seconds: number, body: string): Promise<void> {
  await cancelRestDone();
  if (seconds <= 0) return;
  try {
    pendingId = await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest done', body, sound: 'default', vibrate: [0, 250, 100, 250] },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        channelId: 'rest-timer',
      },
    });
  } catch {
    pendingId = null;
  }
}

export async function cancelRestDone(): Promise<void> {
  if (!pendingId) return;
  const id = pendingId;
  pendingId = null;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore
  }
}
