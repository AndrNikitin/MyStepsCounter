import React, { useState, useEffect } from "react";
import { Text, View, Button } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Pedometer from "expo-sensors/build/Pedometer";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCATION_TASK_NAME = "background-location-task";
const PEDOMETER_TASK_NAME = "background-pedometer-task";
const NOTIFICATION_TASK_NAME = "background-notification-task";

export default function App() {
  const [isTracking, setIsTracking] = useState(false);
  const [pedometerData, setPedometerData] = useState(null);
  const [locationData, setLocationData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        const { status: backgroundStatus } =
          await Location.requestBackgroundPermissionsAsync();
        if (status === "granted" && backgroundStatus === "granted") {
          setIsTracking(true);
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.High,
            timeInterval: 60000,
            distanceInterval: 0,
            showsBackgroundLocationIndicator: true,
          });
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 1);
          const { steps } = await Pedometer.getStepCountAsync(start, end);
          setPedometerData(steps);
          await TaskManager.registerTaskAsync(PEDOMETER_TASK_NAME, {
            taskName: PEDOMETER_TASK_NAME,
            taskType: TaskManager.TaskType.INTERVAL,
            interval: 60000,
            options: {
              startImmediately: true,
            },
          });
        } else {
          setIsTracking(false);
        }

        const locationData = await AsyncStorage.getItem("locationData");
        setLocationData(locationData ? JSON.parse(locationData) : null);

        const pedometerData = await AsyncStorage.getItem("pedometerData");
        setPedometerData(pedometerData ? JSON.parse(pedometerData) : null);
      } catch (error) {
        console.log(`Ошибка при получении данных: ${error}`);
      }
    })();
  }, []);

  const clearData = async () => {
    try {
      await AsyncStorage.removeItem("locationData");
      await AsyncStorage.removeItem("pedometerData");
      setPedometerData(null);
      setLocationData(null);
    } catch (error) {
      console.log(`Ошибка при очистке данных: ${error}`);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {isTracking ? (
        <>
          <Text>Steps: {pedometerData}</Text>
          <Text>Location: {JSON.stringify(locationData)}</Text>
          <Button title="Clear" onPress={clearData} />
        </>
      ) : (
        <Text>Нет данных для работы</Text>
      )}
    </View>
  );
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.log(`Ошибка при обработке локации: ${error}`);
    return;
  }
  if (data) {
    const { locations } = data;
    try {
      await AsyncStorage.setItem("locationData", JSON.stringify(locations));
    } catch (error) {
      console.log(`Ошибка при сохранении локации: ${error}`);
    }
  }
});

TaskManager.defineTask(PEDOMETER_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.log(`Ошибка при обработке педометра: ${error}`);
    return;
  }
  if (data) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 1);
    const { steps } = await Pedometer.getStepCountAsync(start, end);
    try {
      await AsyncStorage.setItem("pedometerData", JSON.stringify(steps));
    } catch (error) {
      console.log(`Ошибка при сохранении педометра: ${error}`);
    }
  }
});

TaskManager.defineTask(NOTIFICATION_TASK_NAME, async () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 1);
  const { steps } = await Pedometer.getStepCountAsync(start, end);
  const location = await Location.getLastKnownPositionAsync();
  Notifications.scheduleNotificationAsync({
    content: {
      title: "Step Counter Update",
      body: `Steps: ${steps}, Location: ${JSON.stringify(location)}`,
    },
    trigger: null,
  });
});

(async () => {
  try {
    await TaskManager.registerTaskAsync(NOTIFICATION_TASK_NAME, {
      taskName: NOTIFICATION_TASK_NAME,
      taskType: TaskManager.TaskType.FOREGROUND_SERVICE,
      interval: 60000,
      options: {
        startImmediately: true,
      },
    });
  } catch (error) {
    console.log(`Ошибка при регистрации задачи уведомлений: ${error}`);
  }
})();
