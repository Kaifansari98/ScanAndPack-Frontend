import { BottomSheetBackdrop, BottomSheetModal, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AddBoxModalProps {
  ref: React.Ref<BottomSheetModal>;
  onSubmit: (boxName: string) => void;
}

export const AddBoxModal = React.forwardRef<BottomSheetModal, AddBoxModalProps>(({ onSubmit }, ref) => {
  const snapPoints = useMemo(() => ['50%', '80%'], []);
  const [boxName, setBoxName] = useState('');

  const handleAdd = () => {
    if (!boxName.trim()) return;
    console.log('Entered box name:', boxName.trim());
    setBoxName('');
    ref && (ref as any).current.dismiss();
  };

  return (
    <BottomSheetModal
        ref={ref}
        index={1}
        snapPoints={snapPoints}
        backdropComponent={(props) => (
            <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close" // optional: tap outside to close
            />
        )}
        keyboardBehavior="interactive"
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create new Box</Text>
          <TouchableOpacity onPress={() => (ref as any).current.dismiss()}>
            <X size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <Image source={require('@/assets/images/projects/Boxes.jpg')} style={styles.image} />

        {/* Input */}
        <Text style={styles.label}>Box Name</Text>
        <BottomSheetTextInput
          value={boxName}
          onChangeText={setBoxName}
          placeholder="Enter box name"
          style={styles.input}
          placeholderTextColor="#999"
        />

        {/* Instructions */}
        <Text style={styles.instruction}>
          Please provide a relevant and descriptive name for the new box you want to add.
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => (ref as any).current.dismiss()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

AddBoxModal.displayName = "AddBoxModal";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontFamily: 'Montserrat-Bold' },
  image: { width: '100%', height: 180, borderRadius: 12, marginVertical: 16 },
  label: { fontSize: 14, fontFamily: 'Montserrat-Medium', marginBottom: 8 },
  input: { backgroundColor: '#EFEFF0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 16, fontFamily: 'Montserrat-Medium', marginBottom: 12 },
  instruction: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#fff', borderColor: '#000', borderWidth: 1, marginRight: 8 },
  cancelText: { textAlign: 'center', fontFamily: 'Montserrat-Bold', color: '#000' },
  addBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#000', marginLeft: 8, borderColor: '#000', borderWidth: 1, },
  addText: { textAlign: 'center', fontFamily: 'Montserrat-Bold', color: '#fff' },
});