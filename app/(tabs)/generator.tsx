import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import { ref, set } from 'firebase/database';
import { rtdb, auth, db } from '../firebase';
import * as FileSystem from 'expo-file-system';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';

// SavedDrawing arayüzü tanımlama
interface SavedDrawing {
  id: string;
  userId: string;
  imageData: string; // base64 formatında resim verisi
  title: string;
  createdAt: number;
}

export default function GeneratorScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<{prompt: string, image: string}[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Rastgele benzersiz id oluşturucu
  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Pollinations.ai API ile görüntü üretimi
  const generateImage = () => {
    if (!prompt.trim()) return;
    
    setLoading(true);

    // Prompt'u URL için düzenleme
    const encodedPrompt = encodeURIComponent(prompt);
    // Pollinations.ai API URL'i
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;
    
    // Görsel yüklendikten sonra
    setTimeout(() => {
      setGeneratedImage(imageUrl);
      setHistory(prev => [{prompt, image: imageUrl}, ...prev].slice(0, 10));
      setLoading(false);
    }, 500); // Kısa bir bekleme ekledik (isteğe bağlı)
  };

  // Görüntüyü base64'e dönüştürme ve kaydetme
  const saveImageAsBase64 = async (imageUrl: string) => {
    try {
      // Görüntüyü indirip base64'e çevir
      const fileUri = await FileSystem.downloadAsync(
        imageUrl,
        FileSystem.cacheDirectory + 'temp_image.jpg'
      );
      
      // Dosyayı base64'e dönüştür
      const base64Data = await FileSystem.readAsStringAsync(fileUri.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return `data:image/jpeg;base64,${base64Data}`;
    } catch (error) {
      console.error('Görüntü dönüştürme hatası:', error);
      Alert.alert('Hata', 'Görsel kaydedilemedi. Lütfen tekrar deneyin.');
      return null;
    }
  };

  // Üretilen görüntüyü Firebase'e kaydetme
  const saveGeneratedImageToFirebase = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Oturum Hatası', 'Görsel kaydetmek için giriş yapmalısınız.');
      return;
    }
    if (!generatedImage) {
      Alert.alert('Uyarı', 'Kaydedilecek bir görsel bulunamadı. Lütfen önce bir görsel üretin.');
      return;
    }

    try {
      setIsSaving(true);

      let imageData: string | null = generatedImage;
      if (Platform.OS !== 'web') {
        imageData = await saveImageAsBase64(generatedImage);
        if (!imageData) {
          setIsSaving(false);
          return;
        }
      }
      if (!imageData) {
        setIsSaving(false);
        return;
      }

      const drawingTitle = `AI Görsel_${prompt.substring(0, 20)}...`;
      const uniqueId = generateUniqueId();

      const newDrawing: SavedDrawing = {
        id: uniqueId,
        userId: currentUser.uid,
        imageData: imageData,
        title: drawingTitle,
        createdAt: Date.now()
      };

      const drawingRef = ref(rtdb, `drawings/${currentUser.uid}/${newDrawing.id}`);
      await set(drawingRef, newDrawing);

      await setDoc(doc(db, 'images', uniqueId), {
        id: uniqueId,
        userId: currentUser.uid,
        imageData: imageData,
        imageURL: imageData,
        title: drawingTitle,
        type: 'generator',
        prompt: prompt,
        createdAt: Date.now(),
        upvotes: 0,
        downvotes: 0
      });

      Alert.alert('Başarılı', 'Görsel başarıyla kaydedildi. Profil sayfanızdan görüntüleyebilirsiniz.');
    } catch (error) {
      console.error('Firebase kayıt hatası:', error);
      Alert.alert('Hata', 'Görsel kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[
      styles.container,
      {backgroundColor: isDark ? Colors.dark.background : Colors.light.background}
    ]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={[
          styles.title,
          {color: isDark ? Colors.dark.text : Colors.light.text}
        ]}>
          AI Görsel Üretici
        </Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.promptContainer}>
            <Text style={[
              styles.subtitle,
              {color: isDark ? Colors.dark.text : Colors.light.text}
            ]}>
              Ne tür bir resim hayal ediyorsun?
            </Text>
            
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? '#2D3748' : '#F7FAFC',
                  color: isDark ? Colors.dark.text : Colors.light.text,
                  borderColor: isDark ? '#4A5568' : '#E2E8F0'
                }
              ]}
              placeholder="Ör: Deniz manzarası, mavi gökyüzü, kumsalda palmiyeler..."
              placeholderTextColor={isDark ? '#A0AEC0' : '#718096'}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={4}
            />
            
            <TouchableOpacity 
              style={[styles.button, {opacity: prompt.trim() ? 1 : 0.7}]} 
              onPress={generateImage}
              disabled={!prompt.trim() || loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Üretiliyor...' : 'Görsel Üret'}
              </Text>
              {!loading && <MaterialCommunityIcons name="creation" size={20} color="#fff" style={styles.buttonIcon} />}
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={[
                styles.loadingText,
                {color: isDark ? Colors.dark.text : Colors.light.text}
              ]}>
                Görsel yaratılıyor...
              </Text>
            </View>
          ) : generatedImage ? (
            <View style={styles.resultContainer}>
              <Text style={[
                styles.resultTitle,
                {color: isDark ? Colors.dark.text : Colors.light.text}
              ]}>
                Üretilen Görsel
              </Text>
              
              <Image
                source={{ uri: generatedImage }}
                style={styles.generatedImage}
                resizeMode="contain"
              />
              
              <View style={styles.promptPreview}>
                <Text style={[
                  styles.promptText,
                  {color: isDark ? Colors.dark.text : Colors.light.text}
                ]} numberOfLines={2}>
                  {prompt}
                </Text>
              </View>

              {/* Kaydet butonu */}
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={saveGeneratedImageToFirebase}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={22} color="#fff" />
                    <Text style={styles.saveButtonText}>Galeriye Kaydet</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {history.length > 0 && !loading && !generatedImage && (
            <View style={styles.historyContainer}>
              <Text style={[
                styles.historyTitle,
                {color: isDark ? Colors.dark.text : Colors.light.text}
              ]}>
                Geçmiş Üretimler
              </Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {history.map((item, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.historyItem}
                    onPress={() => {
                      setPrompt(item.prompt);
                      setGeneratedImage(item.image);
                    }}
                  >
                    <Image source={{ uri: item.image }} style={styles.historyImage} />
                    <Text style={styles.historyPrompt} numberOfLines={2}>{item.prompt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  promptContainer: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 50,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  resultContainer: {
    marginTop: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  generatedImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 10,
  },
  promptPreview: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginBottom: 15,
  },
  promptText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  historyContainer: {
    marginTop: 30,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  historyItem: {
    width: 150,
    marginRight: 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  historyImage: {
    width: 150,
    height: 150,
  },
  historyPrompt: {
    padding: 8,
    fontSize: 12,
    color: '#333',
  },
  // Kaydet butonu stilleri
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 