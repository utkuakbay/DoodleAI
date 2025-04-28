import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Link, router } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../../constants/Colors';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    // Hata mesajını temizle
    setError('');
    
    // Form doğrulama
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Lütfen tüm alanları doldurun.');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      setLoading(true);
      
      // Firebase ile kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Kullanıcı profilini güncelle
      await updateProfile(user, {
        displayName: fullName
      });
      
      // Firestore'a kullanıcı verilerini kaydet
      await setDoc(doc(db, 'users', user.uid), {
        userId: user.uid,
        fullName,
        email,
        username: email.split('@')[0], // Basit bir kullanıcı adı oluştur
        bio: '',
        profileImage: '',
        createdAt: new Date(),
        favoriteStyle: '',
        settings: {
          notifications: true,
          darkMode: false
        }
      });
      
      // Başarılı kayıt sonrası ana sayfaya yönlendir
      router.replace('/(tabs)');
    } catch (error: any) {
      // Hata işleme
      console.error("Kayıt hatası:", error);
      
      // Kullanıcı dostu hata mesajları
      let errorMessage = "Kayıt olurken bir hata oluştu. Lütfen tekrar deneyin.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Bu e-posta adresi zaten kullanılıyor.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Geçersiz e-posta adresi.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Şifre çok zayıf. Lütfen daha güçlü bir şifre seçin.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <View style={styles.backgroundGradient} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>Hesap Oluştur</Text>
            <Text style={styles.subtitleText}>Sanat dünyasına katılın</Text>
          </View>
          
          <View style={styles.formContainer}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Ad Soyad</Text>
              <TextInput
                style={styles.input}
                placeholder="Ad ve soyadınız"
                placeholderTextColor="#aaa"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>E-posta</Text>
              <TextInput
                style={styles.input}
                placeholder="E-posta adresiniz"
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Şifre</Text>
              <TextInput
                style={styles.input}
                placeholder="Şifreniz (en az 6 karakter)"
                placeholderTextColor="#aaa"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Şifre Tekrar</Text>
              <TextInput
                style={styles.input}
                placeholder="Şifrenizi tekrar girin"
                placeholderTextColor="#aaa"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Kayıt Ol</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Zaten hesabınız var mı?</Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLinkText}>Giriş Yap</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  formContainer: {
    width: '100%',
    marginBottom: 30,
  },
  errorText: {
    color: '#FF6B6B',
    marginBottom: 15,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#fff',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
  },
  registerButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    marginTop: 10,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#fff',
    opacity: 0.8,
    marginRight: 6,
  },
  loginLinkText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 