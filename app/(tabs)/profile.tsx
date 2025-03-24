import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from 'react-native';

interface UserData {
  username: string;
  email: string;
  fullName: string;
  bio: string;
  profileImage: string;
  createdArtworks: number;
  favoriteStyle: string;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() || 'light';
  const isDark = colorScheme === 'dark';

  const [userData] = useState<UserData>({
    username: 'sanatçı123',
    email: 'kullanici@ornek.com',
    fullName: 'Ahmet Yılmaz',
    bio: 'Dijital sanat ve resim çizmeyi seviyorum. Yeni teknolojileri denemeyi ve yaratıcı işler üretmeyi seviyorum.',
    profileImage: 'https://picsum.photos/200',
    createdArtworks: 27,
    favoriteStyle: 'Empresyonizm',
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(isDark);

  const menuItems = [
    {
      title: 'Çalışmalarım',
      icon: 'images',
      color: Colors.primary,
    },
    {
      title: 'Ayarlar',
      icon: 'settings',
      color: '#4A5568',
    },
    {
      title: 'Yardım',
      icon: 'help-circle',
      color: Colors.accent,
    },
    {
      title: 'Hakkında',
      icon: 'information-circle',
      color: Colors.success,
    },
  ];

  const stats = [
    {
      label: 'Çizim',
      value: userData.createdArtworks,
      icon: 'brush',
    },
    {
      label: 'Üretilen',
      value: 15,
      icon: 'sparkles',
    },
    {
      label: 'Favori',
      value: 42,
      icon: 'heart',
    },
  ];

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
          Profil
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: userData.profileImage }}
              style={styles.profileImage}
            />
          </View>
          
          <Text style={[
            styles.username,
            {color: isDark ? Colors.dark.text : Colors.light.text}
          ]}>
            {userData.fullName}
          </Text>
          
          <Text style={[
            styles.email,
            {color: isDark ? Colors.dark.icon : Colors.light.icon}
          ]}>
            @{userData.username}
          </Text>
          
          <Text style={[
            styles.bio,
            {color: isDark ? Colors.dark.text : Colors.light.text}
          ]}>
            {userData.bio}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View 
              key={index} 
              style={[
                styles.statItem,
                {backgroundColor: isDark ? '#252A37' : '#F5F8FF'}
              ]}
            >
              <MaterialCommunityIcons name={stat.icon as any} size={24} color={Colors.primary} />
              <Text style={[
                styles.statValue,
                {color: isDark ? Colors.dark.text : Colors.light.text}
              ]}>
                {stat.value}
              </Text>
              <Text style={[
                styles.statLabel,
                {color: isDark ? Colors.dark.icon : Colors.light.icon}
              ]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.settingsSection}>
          <Text style={[
            styles.sectionTitle,
            {color: isDark ? Colors.dark.text : Colors.light.text}
          ]}>
            Tercihler
          </Text>
          
          <View style={[
            styles.settingItem, 
            {borderBottomColor: isDark ? '#2D3748' : '#E2E8F0'}
          ]}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={22} color={Colors.primary} />
              <Text style={[
                styles.settingText,
                {color: isDark ? Colors.dark.text : Colors.light.text}
              ]}>
                Bildirimler
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              thumbColor={notificationsEnabled ? Colors.primary : '#F4F3F4'}
              trackColor={{ false: '#767577', true: `${Colors.primary}80` }}
            />
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon" size={22} color={Colors.primary} />
              <Text style={[
                styles.settingText,
                {color: isDark ? Colors.dark.text : Colors.light.text}
              ]}>
                Karanlık Mod
              </Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              thumbColor={darkModeEnabled ? Colors.primary : '#F4F3F4'}
              trackColor={{ false: '#767577', true: `${Colors.primary}80` }}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={[
            styles.sectionTitle,
            {color: isDark ? Colors.dark.text : Colors.light.text}
          ]}>
            Menü
          </Text>
          
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index !== menuItems.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#2D3748' : '#E2E8F0'
                }
              ]}
            >
              <View style={styles.menuItemContent}>
                <View style={[styles.menuIconContainer, {backgroundColor: `${item.color}20`}]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <Text style={[
                  styles.menuItemText,
                  {color: isDark ? Colors.dark.text : Colors.light.text}
                ]}>
                  {item.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDark ? Colors.dark.icon : Colors.light.icon} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.logoutButton, {backgroundColor: `${Colors.error}20`}]}>
          <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          <Text style={[styles.logoutText, {color: Colors.error}]}>Çıkış Yap</Text>
        </TouchableOpacity>
        
        <View style={styles.footer}>
          <Text style={[
            styles.footerText,
            {color: isDark ? Colors.dark.icon : Colors.light.icon}
          ]}>
            ArtApp v1.0.0
          </Text>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: Colors.primary,
    marginBottom: 15,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  statItem: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  settingsSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
}); 