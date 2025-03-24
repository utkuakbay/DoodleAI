import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from 'react-native';

export default function CanvasScreen() {
  const colorScheme = useColorScheme();
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);

  const colors = [
    '#000000', // Siyah
    '#FF0000', // Kırmızı
    '#0000FF', // Mavi
    '#00FF00', // Yeşil
    '#FFFF00', // Sarı
    '#FFA500', // Turuncu
    '#800080', // Mor
    Colors.primary, // Tema ana rengi
    Colors.accent  // Tema vurgu rengi
  ];

  const brushSizes = [2, 5, 10, 15, 20];

  return (
    <SafeAreaView style={[
      styles.container, 
      {backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background}
    ]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={[
          styles.title, 
          {color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text}
        ]}>
          Tuval
        </Text>
        <TouchableOpacity style={styles.clearButton}>
          <MaterialCommunityIcons name="eraser" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.canvas, {
        backgroundColor: colorScheme === 'dark' ? '#2D3748' : '#F7FAFC'
      }]}>
        <Text style={styles.canvasInfo}>
          Bu özellik mobil için çok yakında gelecek...
        </Text>
      </View>

      <View style={styles.toolsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorsContainer}>
          {colors.map((color, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                currentColor === color && styles.selectedColor
              ]}
              onPress={() => setCurrentColor(color)}
            />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brushContainer}>
          {brushSizes.map((size, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.brushOption,
                brushSize === size && styles.selectedBrush
              ]}
              onPress={() => setBrushSize(size)}
            >
              <View style={[styles.brushPreview, { width: size * 2, height: size * 2, backgroundColor: currentColor }]} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  clearButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
  canvas: {
    flex: 1,
    margin: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvasInfo: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  toolsContainer: {
    paddingVertical: 15,
  },
  colorsContainer: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  brushContainer: {
    paddingHorizontal: 15,
  },
  brushOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectedBrush: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  brushPreview: {
    borderRadius: 10,
  },
}); 