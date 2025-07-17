import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

export default function ProfileTabScreen() {
  return (
    <View className="flex-1 bg-sapLight-background justify-center items-center">
      <Text className="text-2xl font-montserrat-semibold text-sapLight-text">
        Profile
      </Text>
      <Text className="text-base font-montserrat text-sapLight-infoText mt-2">
        Manage your account details
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({})