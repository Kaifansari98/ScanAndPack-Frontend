import Loader from "@/components/generic/Loader";
import Navbar from "@/components/generic/Navbar";
import axios from "@/lib/axios";
import { RootState } from "@/redux/store";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useSelector } from "react-redux";

import { MachineCard } from "@/components/ItemCards/MachineCard";

interface MachineCardProps {
  machine: {
    id: number;
    machine_name: string;
    machine_code: string;
    machine_type: string;
    image_path: string;
  };
}

interface FormattedMachines {
  id: number;
  machine_name: string;
  machine_code: string;
  machine_type: string;
  image_path: string;
}

// Project Card Component

export default function MachineTabScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [machines, setMachines] = useState<MachineCardProps["machine"][]>([]);
  const [loading, setLoading] = useState(true);    


 const fetchMachines = async () => {

  const vendorId = user?.vendor_id;
  const userId = user?.id;

  if (!vendorId) {
    console.log("Vendor ID not ready yet");
    return;
  }

  setLoading(true);

  try {
    const response = await axios.get(`/track-trace/machines/${vendorId}/${userId}`);
    
    console.log(
      "Machines API response:",
      JSON.stringify(response.data, null, 2)
    );

    const machines = response.data.data;

    if (!Array.isArray(machines)) {
      console.warn("Machines is not an array:", machines);
      return;
    }

    const formatted: FormattedMachines[] = machines.map((mac: any) => ({
      id: mac.id,
      machine_name: mac.machine_name,
      machine_code: mac.machine_code,
      machine_type: mac.machine_type,
      image_path: mac.image_path,
    }));

    
    console.log("Formatted machines:", formatted);
    // alert(formatted.length)

   setMachines(formatted);
  } catch (error) {
    console.warn("Failed to fetch machines:", error);
  } finally {
    setLoading(false);
  }
};

useFocusEffect(
  useCallback(() => {
    if (user?.vendor_id) {
      fetchMachines();
    }
  }, [user?.vendor_id])
);


  // useFocusEffect(
  //   useCallback(() => {
  //     fetchMachines();
  //   }, [user?.vendor_id])
  // );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-sapLight-background">
        <Loader />
      </View>
    );
  }

  // const onRefresh = async () => {
  //   // setRefreshing(true);
  //   await fetchMachines();
  //   // setRefreshing(false);
  // };

  return (
    <View className="flex-1 bg-sapLight-background">
      <Navbar
        title="Projects"
        showBack={false}
        showSearch={false}
        showNotification={true}
        showScan={true}
        onScanPress={() => {
          // Optional: Custom scan handler
          // If not provided, it will navigate to '/scanner'
          router.push('/scanner');
        }}
      />

      <FlatList
                data={machines}
                renderItem={({ item, index }) => (
                  <MachineCard
                    machine={item}
                    index={index}                   
                  />
                )}
                keyExtractor={(item, index) => item.machine_name + index}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}                
                ListEmptyComponent={
                  <View
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      alignItems: "center",
      
                    }}
                  >
                    {/* <LottieView
                      source={require("@/assets/animations/projectEmpty.json")}
                      style={styles.lottie}
                      autoPlay
                      loop={false}
                    /> */}
                  </View>
                }
              />

     


    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {    
    padding: 20,
    paddingTop: 24,
  },
  cardContainer: {
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  lottie: {
    width: 220,
    height: 220,
  },
});