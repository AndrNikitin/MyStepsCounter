import React, { useState, useEffect } from "react";
import { Text, View, Button } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Pedometer } from "expo-sensors";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCATION_TASK_NAME = "background-location-task";
const PEDOMETER_TASK_NAME = "background-pedometer-task";

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
          const isPedometerAvailable = await Pedometer.isAvailableAsync();
          if (!isPedometerAvailable) {
            console.log("Педометр недоступен");
            return;
          }

          setIsTracking(true);
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.High,
            timeInterval: 60000,
            distanceInterval: 0,
            showsBackgroundLocationIndicator: true,
          });

          // Watch for step count changes
          const subscription = Pedometer.watchStepCount((result) => {
            setPedometerData(result.steps);
            savePedometerData(result.steps);
          });

          // Watch for location changes
          const locationSubscription = Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 60000,
              distanceInterval: 0,
            },
            (result) => {
              setLocationData(result.coords);
              saveLocationData(result.coords);
            }
          );
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

  const savePedometerData = async (steps) => {
    try {
      await AsyncStorage.setItem("pedometerData", JSON.stringify(steps));
    } catch (error) {
      console.log(`Ошибка при сохранении педометра: ${error}`);
    }
  };

  const saveLocationData = async (coords) => {
    try {
      await AsyncStorage.setItem("locationData", JSON.stringify(coords));
    } catch (error) {
      console.log(`Ошибка при сохранении локации: ${error}`);
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
      sendNotification();
    } catch (error) {
      console.log(`Ошибка при сохранении локации: ${error}`);
    }
  }
});

TaskManager.defineTask(PEDOMETER_TASK_NAME, ({ data: { steps }, error }) => {
  if (error) {
    console.log(`Ошибка при обработке педометра: ${error}`);
    return;
  }

  try {
    AsyncStorage.setItem("pedometerData", JSON.stringify(steps));
    sendNotification();
  } catch (error) {
    console.log(`Ошибка при сохранении педометра: ${error}`);
  }
});

const sendNotification = async () => {
  const steps = await AsyncStorage.getItem("pedometerData");
  const location = await AsyncStorage.getItem("locationData");
  Notifications.scheduleNotificationAsync({
    content: {
      title: "Step Counter Update",
      body: `Steps: ${steps}, Location: ${location}`,
    },
    trigger: null,
  });
};
