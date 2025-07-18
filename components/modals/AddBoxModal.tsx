import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { X } from 'lucide-react-native';

interface AddBoxModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AddBoxModal({ visible, onClose }: AddBoxModalProps) {
  const [boxName, setBoxName] = useState('');

  const handleAdd = () => {
    console.log('Box Name:', boxName);
    // You can clear or close here too if needed
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-sapLight-background rounded-t-3xl p-kpx">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-montserrat-bold text-sapLight-text">Add a Box</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Image */}
          <View className="items-center mb-5">
            <Image
              source={require('@/assets/images/projects/Boxes.jpg')}
              className="w-full h-48 rounded-xl"
              resizeMode="cover"
            />
          </View>

          {/* Input Field */}
          <View className="mb-5">
            <Text className="text-sm font-montserrat-medium text-sapLight-infoText mb-2">
              Box Name
            </Text>
            <TextInput
              placeholder="Enter box name"
              value={boxName}
              onChangeText={setBoxName}
              className="border border-gray-300 rounded-xl px-4 py-3 text-sapLight-text font-montserrat-medium bg-white"
              placeholderTextColor="#999"
            />
          </View>

          {/* Instruction */}
          <Text className="text-sapLight-infoText text-sm mb-6">
            Please provide a relevant and descriptive name for the new box you want to add.
          </Text>

          {/* Buttons */}
          <View className="flex-row justify-between">
            <TouchableOpacity
              className="flex-1 bg-gray-200 py-3 rounded-full mr-2"
              onPress={onClose}
            >
              <Text className="text-center text-sapLight-text font-montserrat-bold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-black py-3 rounded-full ml-2"
              onPress={handleAdd}
            >
              <Text className="text-center text-white font-montserrat-bold">Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
