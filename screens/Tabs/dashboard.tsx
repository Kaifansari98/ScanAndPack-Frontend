import Navbar from '@/components/generic/Navbar'
import { router } from 'expo-router'
import React from 'react'
import { StyleSheet, View } from 'react-native'

export default function DashboardTabScreen() {
  return (
    <View className="flex-1 bg-sapLight-background">
      <Navbar 
        title="Dashboard" 
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
    </View>
  )
}

const styles = StyleSheet.create({})