import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Modal,
  Alert,
  TextInput
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, rtdb, db } from '../firebase';
import { router } from 'expo-router';
import { ref, onValue, remove } from 'firebase/database';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface UserData {
  username: string;
  email: string;
  fullName: string;
  bio: string;
  profileImage: string;
  createdArtworks: number;
  favoriteStyle: string;
}

interface SavedDrawing {
  id: string;
  userId: string;
  imageData: string; // base64 formatında resim verisi
  title: string;
  createdAt: number;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() || 'light';
  const isDark = colorScheme === 'dark';

  const [userData, setUserData] = useState<UserData>({
    username: '',
    email: '',
    fullName: '',
    bio: 'Dijital sanat ve resim çizmeyi seviyorum. Yeni teknolojileri denemeyi ve yaratıcı işler üretmeyi seviyorum.',
    profileImage: 'https://picsum.photos/200',
    createdArtworks: 0,
    favoriteStyle: 'Empresyonizm',
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(isDark);
  const [savedDrawings, setSavedDrawings] = useState<SavedDrawing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDrawing, setSelectedDrawing] = useState<SavedDrawing | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isUserDataLoading, setIsUserDataLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUserData, setEditedUserData] = useState<{
    fullName: string;
    bio: string;
  }>({
    fullName: '',
    bio: '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Kullanıcı verilerini ve çizimlerini yükle
  useEffect(() => {
    const loadUserData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setIsLoading(false);
        setIsUserDataLoading(false);
        return;
      }

      // Kullanıcı bilgilerini ayarla
      try {
        setIsUserDataLoading(true);
        
        // Firestore'dan kullanıcı bilgilerini al
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          // Kullanıcı bilgileri varsa, bunları kullan
          const userData = userDoc.data() as UserData;
          setUserData(userData);
        } else {
          // Kullanıcı bilgileri yoksa, Firebase Auth'dan gelen temel bilgileri kullan
          // ve Firestore'a kaydet
          const newUserData: UserData = {
            username: currentUser.displayName?.toLowerCase().replace(/\s+/g, '') || 'kullanıcı',
            email: currentUser.email || '',
            fullName: currentUser.displayName || 'İsimsiz Kullanıcı',
            bio: 'Dijital sanat ve resim çizmeyi seviyorum. Yeni teknolojileri denemeyi ve yaratıcı işler üretmeyi seviyorum.',
            profileImage: currentUser.photoURL || 'https://picsum.photos/200',
            createdArtworks: 0,
            favoriteStyle: 'Empresyonizm',
          };
          
          // Yeni kullanıcı bilgilerini Firestore'a kaydet
          await setDoc(userDocRef, newUserData);
          setUserData(newUserData);
        }
        
        setIsUserDataLoading(false);

        // Kullanıcının çizimlerini al
        const drawingsRef = ref(rtdb, `drawings/${currentUser.uid}`);
        
        onValue(drawingsRef, (snapshot) => {
          setIsLoading(true);
          const data = snapshot.val();
          const drawings: SavedDrawing[] = [];
          
          if (data) {
            Object.keys(data).forEach(key => {
              drawings.push(data[key]);
            });
            
            // Çizimleri tarih sırasına göre sırala (en yeniden en eskiye)
            drawings.sort((a, b) => b.createdAt - a.createdAt);
          }
          
          setSavedDrawings(drawings);
          
          // Kullanıcı bilgilerine çizim sayısını ekle
          setUserData(prev => ({
            ...prev,
            createdArtworks: drawings.length
          }));
          
          setIsLoading(false);
        });
      } catch (error) {
        console.error('Kullanıcı bilgileri yüklenirken hata:', error);
        setIsUserDataLoading(false);
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, []);

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
      icon: 'star',
    },
    {
      label: 'Favori',
      value: 42,
      icon: 'heart',
    },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/auth/login');
    } catch (error) {
      console.error('Çıkış hatası:', error);
    }
  };

  // Seçili çizimi sil
  const deleteDrawing = async (drawingId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const drawingRef = ref(rtdb, `drawings/${currentUser.uid}/${drawingId}`);
      await remove(drawingRef);
      
      Alert.alert('Başarılı', 'Çizim başarıyla silindi.');
      setShowModal(false);
    } catch (error) {
      console.error('Silme hatası:', error);
      Alert.alert('Hata', 'Çizim silinirken bir sorun oluştu.');
    }
  };
  
  // Profil düzenleme modalını aç
  const openEditProfile = () => {
    setEditedUserData({
      fullName: userData.fullName,
      bio: userData.bio,
    });
    setIsEditing(true);
  };
  
  // Profil düzenleme modalını kapat
  const closeEditProfile = () => {
    setIsEditing(false);
  };
  
  // Profil bilgilerini kaydet
  const saveProfile = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      setIsSavingProfile(true);
      
      // Firestore'da kullanıcı bilgilerini güncelle
      const userDocRef = doc(db, "users", currentUser.uid);
      
      // Mevcut kullanıcı bilgileriyle değiştirilenleri birleştir
      const updatedUserData = {
        ...userData,
        fullName: editedUserData.fullName,
        bio: editedUserData.bio,
      };
      
      // Firestore'a güncelleme
      try {
        await setDoc(userDocRef, updatedUserData, { merge: true });
        
        // Kullanıcı verilerini güncelle
        setUserData(updatedUserData);
        
        Alert.alert('Başarılı', 'Profil bilgileri başarıyla güncellendi.');
        setIsEditing(false);
      } catch (error) {
        console.error('Profil güncelleme hatası:', error);
        Alert.alert('Hata', 'Profil güncellenirken bir sorun oluştu. Daha sonra tekrar deneyin.');
      }
      
      setIsSavingProfile(false);
    } catch (error) {
      setIsSavingProfile(false);
      console.error('Profil güncelleme hatası:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir sorun oluştu.');
    }
  };

  // Çizim detayları modal'ı
  const renderDrawingModal = () => {
    if (!selectedDrawing) return null;
    
    return (
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, {backgroundColor: isDark ? '#252A37' : 'white'}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: isDark ? 'white' : 'black'}]}>
                {selectedDrawing.title}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={isDark ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
            
            <Image 
              source={{uri: selectedDrawing.imageData}} 
              style={styles.modalImage}
              resizeMode="contain"
            />
            
            <Text style={[styles.modalDate, {color: isDark ? '#ddd' : '#666'}]}>
              {new Date(selectedDrawing.createdAt).toLocaleDateString()}
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, {backgroundColor: Colors.error + '20'}]}
                onPress={() => {
                  Alert.alert(
                    'Çizimi Sil',
                    'Bu çizimi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
                    [
                      { text: 'İptal', style: 'cancel' },
                      { 
                        text: 'Sil', 
                        style: 'destructive',
                        onPress: () => deleteDrawing(selectedDrawing.id)
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
                <Text style={[styles.modalButtonText, {color: Colors.error}]}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Profil düzenleme modalı
  const renderEditProfileModal = () => {
    return (
      <Modal
        visible={isEditing}
        transparent={true}
        animationType="slide"
        onRequestClose={closeEditProfile}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, {backgroundColor: isDark ? '#252A37' : 'white'}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: isDark ? 'white' : 'black'}]}>
                Profili Düzenle
              </Text>
              <TouchableOpacity onPress={closeEditProfile}>
                <Ionicons name="close" size={24} color={isDark ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, {color: isDark ? '#ddd' : '#666'}]}>
                Ad Soyad
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: isDark ? 'white' : 'black',
                    backgroundColor: isDark ? '#1A202C' : '#F7FAFC',
                    borderColor: isDark ? '#2D3748' : '#E2E8F0'
                  }
                ]}
                value={editedUserData.fullName}
                onChangeText={(text) => setEditedUserData(prev => ({...prev, fullName: text}))}
                placeholder="Adınız Soyadınız"
                placeholderTextColor={isDark ? '#718096' : '#A0AEC0'}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, {color: isDark ? '#ddd' : '#666'}]}>
                Biyografi
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: isDark ? 'white' : 'black',
                    backgroundColor: isDark ? '#1A202C' : '#F7FAFC',
                    borderColor: isDark ? '#2D3748' : '#E2E8F0',
                    textAlignVertical: 'top'
                  }
                ]}
                value={editedUserData.bio}
                onChangeText={(text) => setEditedUserData(prev => ({...prev, bio: text}))}
                placeholder="Kendinizi tanıtın"
                placeholderTextColor={isDark ? '#718096' : '#A0AEC0'}
                multiline
                numberOfLines={4}
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, {backgroundColor: Colors.error + '20'}]}
                onPress={closeEditProfile}
              >
                <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
                <Text style={[styles.modalButtonText, {color: Colors.error}]}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, {backgroundColor: Colors.primary + '20'}]}
                onPress={saveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color={Colors.primary} />
                    <Text style={[styles.modalButtonText, {color: Colors.primary}]}>Kaydet</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Çizim listesi renderleyicisi
  const renderDrawingItem = ({ item }: { item: SavedDrawing }) => (
    <TouchableOpacity 
      style={[styles.drawingItem, {backgroundColor: isDark ? '#252A37' : '#F5F8FF'}]}
      onPress={() => {
        setSelectedDrawing(item);
        setShowModal(true);
      }}
    >
      <Image 
        source={{ uri: item.imageData }} 
        style={styles.drawingImage}
        resizeMode="cover"
      />
      <View style={styles.drawingInfo}>
        <Text 
          style={[styles.drawingTitle, {color: isDark ? 'white' : 'black'}]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={[styles.drawingDate, {color: isDark ? '#ddd' : '#666'}]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isUserDataLoading) {
    return (
      <SafeAreaView style={[
        styles.container,
        {backgroundColor: isDark ? Colors.dark.background : Colors.light.background}
      ]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, {color: isDark ? Colors.dark.text : Colors.light.text}]}>
            Profil Yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          
          <View style={styles.profileNameSection}>
            <Text style={[
              styles.username,
              {color: isDark ? Colors.dark.text : Colors.light.text}
            ]}>
              {userData.fullName}
            </Text>
            
            <TouchableOpacity 
              style={styles.editButton}
              onPress={openEditProfile}
            >
              <Ionicons name="pencil" size={16} color={Colors.primary} />
              <Text style={styles.editButtonText}>Düzenle</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[
            styles.email,
            {color: isDark ? Colors.dark.icon : Colors.light.icon}
          ]}>
            @{userData.username}
          </Text>
          
          <Text style={[
            styles.email,
            {color: isDark ? Colors.dark.icon : Colors.light.icon}
          ]}>
            {userData.email}
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

        {/* Çizimler Bölümü */}
        <View style={styles.drawingsSection}>
          <Text style={[
            styles.sectionTitle,
            {color: isDark ? Colors.dark.text : Colors.light.text}
          ]}>
            Çizimlerim
          </Text>
          
          {isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : savedDrawings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="brush" size={50} color={Colors.primary} />
              <Text style={[styles.emptyText, {color: isDark ? Colors.dark.text : Colors.light.text}]}>
                Henüz kaydedilmiş çizim yok
              </Text>
              <TouchableOpacity 
                style={[styles.createButton, {backgroundColor: Colors.primary}]}
                onPress={() => router.push('/canvas')}
              >
                <Text style={styles.createButtonText}>Çizim Yap</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={savedDrawings}
              renderItem={renderDrawingItem}
              keyExtractor={item => item.id}
              horizontal={false}
              numColumns={2}
              columnWrapperStyle={styles.drawingColumnWrapper}
              style={styles.drawingsList}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false} // Ana ScrollView içinde olduğu için
            />
          )}
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

        <TouchableOpacity 
          style={[styles.logoutButton, {backgroundColor: `${Colors.error}20`}]}
          onPress={handleLogout}
        >
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
      
      {renderDrawingModal()}
      {renderEditProfileModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
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
  profileNameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
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
  // Çizimler bölümü
  drawingsSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  drawingsList: {
    marginTop: 10,
  },
  drawingColumnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  drawingItem: {
    width: (Dimensions.get('window').width - 50) / 2,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  drawingImage: {
    width: '100%',
    height: 120,
  },
  drawingInfo: {
    padding: 8,
  },
  drawingTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  drawingDate: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 15,
  },
  createButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  loader: {
    marginVertical: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  modalDate: {
    fontSize: 14,
    marginTop: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  modalButtonText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  // Eski stiller
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
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  textArea: {
    textAlignVertical: 'top',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
  },
  editButtonText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
}); 