import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import Navbar from '@/components/generic/Navbar'

export default function ProjectsTabScreen() {
  return (
    <View className="flex-1 bg-sapLight-background">
     <Navbar title="Projects" showBack={false} showSearch={false} />
    </View>
  )
}

const styles = StyleSheet.create({})