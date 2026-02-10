import Navbar from '@/components/generic/Navbar'
import React from 'react'
import { StyleSheet, View } from 'react-native'

export default function ReportsTabScreen() {
  return (
    <View className="flex-1 bg-sapLight-background">
      <Navbar title="Machines" showBack={false} showSearch={false} showNotification={true}/>
    </View>
  )
}

const styles = StyleSheet.create({})