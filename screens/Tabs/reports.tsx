import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

export default function ReportsTabScreen() {
  return (
    <View className="flex-1 bg-sapLight-background justify-center items-center">
      <Text className="text-2xl font-montserrat-semibold text-sapLight-text">
        Reports
      </Text>
      <Text className="text-base font-montserrat text-sapLight-infoText mt-2">
        Explore your Reports
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({})