import React, { useState, useEffect } from "react";
import { Text, View, Button } from "react-native";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Pedometer from "expo-sensors";
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
          setIsTracking(true);
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.High,
            timeInterval: 60000,
            distanceInterval: 0,
            showsBackgroundLocationIndicator: true,
          });
          Pedometer.watchStepCount((result) => {
            setPedometerData(result.steps);
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
      Notifications.scheduleNotificationAsync({
        content: {
          title: "Location Update",
          body: JSON.stringify(locations),
        },
        trigger: null,
      });
    } catch (error) {
      console.log(`Ошибка при сохранении локации: ${error}`);
    }
  }
});

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.log(`Ошибка при обработке локации: ${error}`);
    return;
  }
  if (data) {
    const { locations } = data;
    try {
      await AsyncStorage.setItem("locationData", JSON.stringify(locations));
      Notifications.scheduleNotificationAsync({
        content: {
          title: "Location Update",
          body: JSON.stringify(locations),
        },
        trigger: null,
      });
    } catch (error) {
      console.log(`Ошибка при сохранении локации: ${error}`);
    }
  }
});
