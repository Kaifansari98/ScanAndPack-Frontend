import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import Notification from '@/screens/Notification/notification'

const notificaitons = () => {
  return (
    <View className='flex-1 bg-sapLight-background'>
      <Notification />
    </View>
  )
}

export default notificaitons

const styles = StyleSheet.create({})