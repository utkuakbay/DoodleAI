import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Colors } from '../constants/Colors';
import { StatusBar } from 'expo-status-bar';

export default function LoginScreen() {
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
          <Link href="/(tabs)" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Giriş Yap</Text>
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
  },
  buttonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
}); 