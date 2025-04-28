import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Link, router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { auth } from './firebase';

export default function IndexScreen() {
  // Kullanıcı oturum durumunu kontrol et
  useEffect(() => {
    const checkAuthState = () => {
      // Mevcut oturum varsa ana sayfaya yönlendir
      if (auth.currentUser) {
        router.replace('/(tabs)');
      }
    };
    
    checkAuthState();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.backgroundGradient} />
      
      <View style={styles.contentContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>ArtApp</Text>
          <Text style={styles.subtitleText}>Sanatsal Keşifler</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <Link href="/auth/login" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Giriş Yap</Text>
            </TouchableOpacity>
          </Link>
          
          <Link href="/auth/register" asChild>
            <TouchableOpacity style={styles.registerButton}>
              <Text style={styles.registerButtonText}>Yeni Hesap Oluştur</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  backgroundGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 100,
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitleText: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.8,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 15,
  },
  buttonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
}); 