import { useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pedometer } from "expo-sensors";
import * as Location from "expo-location";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { Notifications } from "expo-notifications";

const TASK_NAME = "background-data-fetch";
const NOTIFICATION_CHANNEL_ID = "background-data-fetch-channel";

export default function App() {
  const [isPedometerAvailable, setIsPedometerAvailable] = useState("checking");
  const [pastStepCount, setPastStepCount] = useState(0);
  const [currentStepCount, setCurrentStepCount] = useState(0);
  const [location, setLocation] = useState(null);

  const subscribe = async () => {
    const isAvailable = await Pedometer.isAvailableAsync();
    setIsPedometerAvailable(String(isAvailable));

    if (isAvailable) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 1);

      const pastStepCountResult = await Pedometer.getStepCountAsync(start, end);
      if (pastStepCountResult) {
        setPastStepCount(pastStepCountResult.steps);
      }

      return Pedometer.watchStepCount((result) => {
        setCurrentStepCount(result.steps);
      });
    }
  };

  useEffect(() => {
    const subscription = subscribe();
    return () => subscription && subscription.remove();
  }, []);

  useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    };

    getLocation();
  }, []);

  useEffect(() => {
    const registerBackgroundFetch = async () => {
      // Запрашиваем разрешение на доступ к местоположению и шагомеру в фоновом режиме
      const { status: locationStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (locationStatus !== "granted") {
        console.log("Permission to access location in background was denied");
        return;
      }

      const { status: pedometerStatus } =
        await Pedometer.requestPermissionsAsync();
      if (pedometerStatus !== "granted") {
        console.log("Permission to access pedometer in background was denied");
        return;
      }

      await BackgroundFetch.registerTaskAsync(TASK_NAME, {
        minimumInterval: 60, // 60 seconds
        stopOnTerminate: false,
        startOnBoot: true,
        requiresNetworkConnectivity: true,
        requiresBatteryNotLow: true,
        requiresCharging: false,
        allowsExecutionInForeground: false,
        allowsBackgroundLocationUpdates: true,
      });

      await Notifications.createChannelAsync("channel-id", {
        name: "Channel Name",
        description: "Channel description",
        sound: true,
        priority: "high",
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Background Data Fetch",
          body: "Fetching data...",
        },
        trigger: {
          seconds: 1, // Send a notification immediately after registering the task
        },
        channelId: NOTIFICATION_CHANNEL_ID,
      });
    };

    registerBackgroundFetch();
  }, []);

  useEffect(() => {
    const fetchDataInForeground = async () => {
      // Запрашиваем разрешение на доступ к местоположению и шагомеру в фоновом режиме,
      // чтобы убедиться, что они будут доступны и в фоновом режиме
      const { status: locationStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (locationStatus !== "granted") {
        console.log("Permission to access location in background was denied");
        return;
      }

      const { status: pedometerStatus } =
        await Pedometer.requestPermissionsAsync();
      if (pedometerStatus !== "granted") {
        console.log("Permission to access pedometer in background was denied");
        return;
      }

      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 1);

      const pastStepCountResult = await Pedometer.getStepCountAsync(start, end);
      if (pastStepCountResult) {
        setPastStepCount(pastStepCountResult.steps);
      }

      const locationResult = await Location.getCurrentPositionAsync({});
      if (locationResult) {
        setLocation(locationResult);
      }
    };

    fetchDataInForeground();
  }, []);

  TaskManager.defineTask(TASK_NAME, async () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 1);

    const stepCountResult = await Pedometer.getStepCountAsync(start, end);
    if (stepCountResult) {
      setCurrentStepCount(stepCountResult.steps);
    }

    const locationResult = await Location.getCurrentPositionAsync({});
    if (locationResult) {
      setLocation(locationResult);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Steps and Location",
        body: `Steps: ${currentStepCount}, Location: ${location?.coords.latitude},${location?.coords.longitude}`,
      },
      trigger: {
        seconds: 60, // Send a notification every minute
      },
      channelId: NOTIFICATION_CHANNEL_ID,
    });

    return BackgroundFetch.Result.NewData;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Pedometer available: {isPedometerAvailable}
      </Text>
      <Text style={styles.text}>
        Steps taken in the last 24 hours: {pastStepCount}
      </Text>
      <Text style={styles.text}>Current step count: {currentStepCount}</Text>
      {location && (
        <Text style={styles.text}>
          Current location: {location.coords.latitude},
          {location.coords.longitude}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 20,
    marginVertical: 10,
  },
});
