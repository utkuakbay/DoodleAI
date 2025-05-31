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
  TextInput,
  Platform,
  Pressable
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth, rtdb, db } from '../firebase';
import { ref, onValue, remove, set } from 'firebase/database';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

// Test verilerini kullan
const mockUserData = {
  username: 'testuser',
  email: 'test@example.com',
  fullName: 'Test Kullanıcı',
  bio: 'Dijital sanat ve resim çizmeyi seviyorum. Yeni teknolojileri denemeyi ve yaratıcı işler üretmeyi seviyorum.',
  profileImage: 'https://picsum.photos/200',
  createdArtworks: 5,
  favoriteStyle: 'Empresyonizm',
};

const mockDrawings = [
  {
    id: '1',
    userId: '1',
    imageData: 'https://picsum.photos/200/300',
    title: 'Test Çizim 1',
    createdAt: Date.now() - 86400000
  },
  {
    id: '2',
    userId: '1',
    imageData: 'https://picsum.photos/200/300',
    title: 'Test Çizim 2',
    createdAt: Date.now()
  }
];

// Tip tanımlamalarını geri ekle
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

interface CommentType {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: any;
}

function ProfileScreen() {
  const colorScheme = useColorScheme() || 'light';
  const isDark = colorScheme === 'dark';
  const { theme, toggleTheme } = useTheme();
  const isDarkTheme = theme === 'dark';

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
  const [darkModeEnabled, setDarkModeEnabled] = useState(isDarkTheme);
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
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [sssModalVisible, setSssModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [favoritesModalVisible, setFavoritesModalVisible] = useState(false);
  const [favoriteImages, setFavoriteImages] = useState<any[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [stats, setStats] = useState([
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
      value: 0,
      icon: 'heart',
    },
  ]);
  const [producedCount, setProducedCount] = useState(0);
  const [drawnCount, setDrawnCount] = useState(0);
  const [drawingComments, setDrawingComments] = useState<CommentType[]>([]);
  const [drawingCommentsLoading, setDrawingCommentsLoading] = useState(false);

  useEffect(() => {
    setDarkModeEnabled(isDarkTheme);
  }, [isDarkTheme]);

  // Kullanıcı verilerini ve çizimlerini yükle
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setIsLoading(false);
          setIsUserDataLoading(false);
          return;
        }

        // Kullanıcı bilgilerini ayarla
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

  // Çizim sayısı değiştiğinde stats'ı güncelle
  useEffect(() => {
    setStats(prev => prev.map(stat =>
      stat.label === 'Çizim' ? { ...stat, value: userData.createdArtworks } : stat
    ));
  }, [userData.createdArtworks]);

  // Favori resimler güncellendiğinde stats'ı güncelle
  useEffect(() => {
    setStats(prev => prev.map(stat =>
      stat.label === 'Favori' ? { ...stat, value: favoriteImages.length } : stat
    ));
  }, [favoriteImages]);

  // Profil sayfası açıldığında favori resimleri de yükle
  useEffect(() => {
    fetchFavoriteImages();
  }, []);

  // Çizim ve üretilen (AI) resim sayılarını dinamik olarak güncelle
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const imagesRef = collection(db, 'images');
        // AI ile üretilenler
        const qGen = query(imagesRef, where('userId', '==', currentUser.uid), where('type', '==', 'generator'));
        const snapshotGen = await getDocs(qGen);
        setProducedCount(snapshotGen.size);
        // Manuel çizimler
        const qCanvas = query(imagesRef, where('userId', '==', currentUser.uid), where('type', '==', 'canvas'));
        const snapshotCanvas = await getDocs(qCanvas);
        setDrawnCount(snapshotCanvas.size);
      } catch (e) {
        setProducedCount(0);
        setDrawnCount(0);
      }
    };
    fetchCounts();
  }, []);

  // stats dizisini producedCount ve drawnCount ile güncelle
  useEffect(() => {
    setStats(prev => prev.map(stat =>
      stat.label === 'Üretilen' ? { ...stat, value: producedCount } :
      stat.label === 'Çizim' ? { ...stat, value: drawnCount } :
      stat
    ));
  }, [producedCount, drawnCount]);

  // Modal açıldığında yorumları çek
  useEffect(() => {
    if (showModal && selectedDrawing) {
      fetchDrawingComments(selectedDrawing.id);
    }
  }, [showModal, selectedDrawing]);

  const fetchDrawingComments = async (drawingId: any) => {
    setDrawingCommentsLoading(true);
    const q = query(
      collection(db, 'comments'),
      where('imageId', '==', drawingId),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    setDrawingComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommentType)));
    setDrawingCommentsLoading(false);
  };

  const menuItems = [
    {
      title: 'SSS',
      icon: 'help-circle',
      color: Colors.accent,
    },
    {
      title: 'Yardım',
      icon: 'help-buoy',
      color: Colors.primary,
    },
    {
      title: 'Hakkında',
      icon: 'information-circle',
      color: Colors.success,
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
      if (!currentUser) {
        Alert.alert('Oturum Hatası', 'Çizim silmek için tekrar giriş yapmalısınız.');
        return;
      }
      // Realtime Database'den sil
      try {
        const drawingRef = ref(rtdb, `drawings/${currentUser.uid}/${drawingId}`);
        await remove(drawingRef);
      } catch (err) {
        console.error('Realtime Database silme hatası:', err);
        Alert.alert('Hata', 'Realtime Database silme işlemi başarısız.');
      }
      // Firestore'dan da sil
      try {
        const imageDocRef = doc(db, 'images', drawingId);
        await deleteDoc(imageDocRef);
      } catch (err) {
        console.error('Firestore silme hatası:', err);
        Alert.alert('Hata', 'Firestore silme işlemi başarısız.');
      }
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
      await setDoc(userDocRef, updatedUserData, { merge: true });
      
      // Kullanıcı verilerini güncelle
      setUserData(updatedUserData);
      
      Alert.alert('Başarılı', 'Profil bilgileri başarıyla güncellendi.');
      setIsEditing(false);
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir sorun oluştu.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Profil fotoğrafı olarak ayarlama fonksiyonu
  const setAsProfilePhoto = async (imageUrl: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      // Firestore'da kullanıcı profilini güncelle
      const userDocRef = doc(db, 'users', currentUser.uid);
      await setDoc(userDocRef, { profileImage: imageUrl }, { merge: true });
      // Local state'i güncelle
      setUserData(prev => ({ ...prev, profileImage: imageUrl }));
      Alert.alert('Başarılı', 'Profil fotoğrafınız güncellendi.');
    } catch (error) {
      Alert.alert('Hata', 'Profil fotoğrafı güncellenemedi.');
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
          <View style={[styles.modalContent, {backgroundColor: isDarkTheme ? '#252A37' : 'white'}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: isDarkTheme ? 'white' : 'black'}]}>
                {selectedDrawing.title}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={isDarkTheme ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
            
            <Image 
              source={{uri: selectedDrawing.imageData}} 
              style={styles.modalImage}
              resizeMode="contain"
            />
            
            <Text style={[styles.modalDate, {color: isDarkTheme ? '#ddd' : '#666'}]}>
              {new Date(selectedDrawing.createdAt).toLocaleDateString()}
            </Text>
            
            <View style={styles.modalActions}>
              {Platform.OS === 'web' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onClick={() => {
                      deleteDrawing(selectedDrawing.id);
                      setShowModal(false);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    <Text style={{ color: Colors.error, marginLeft: 8 }}>Sil</Text>
                  </button>
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onClick={() => setAsProfilePhoto(selectedDrawing.imageData)}
                  >
                    <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
                    <Text style={{ color: Colors.primary, marginLeft: 8 }}>Profil Fotoğrafı Olarak Ayarla</Text>
                  </button>
                </div>
              ) : (
                <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 20 }}>
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
                  <TouchableOpacity
                    style={[styles.modalButton, {backgroundColor: Colors.primary + '20'}]}
                    onPress={() => setAsProfilePhoto(selectedDrawing.imageData)}
                  >
                    <Ionicons name="person-circle-outline" size={20} color={Colors.primary} />
                    <Text style={[styles.modalButtonText, {color: Colors.primary}]}>Profil Fotoğrafı Olarak Ayarla</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={{maxHeight: 200, marginTop: 10, width: '100%'}}>
              {drawingCommentsLoading ? <ActivityIndicator /> : (
                drawingComments.length === 0 ? (
                  <Text style={{color: isDarkTheme ? '#fff' : '#000', textAlign: 'center', marginTop: 10}}>Henüz yorum yok.</Text>
                ) : (
                  <FlatList
                    data={drawingComments}
                    keyExtractor={item => item.id}
                    renderItem={({item}) => (
                      <View style={{
                        backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.07)' : '#F5F8FF',
                        borderRadius: 10,
                        padding: 10,
                        marginBottom: 10,
                        shadowColor: '#000',
                        shadowOpacity: 0.04,
                        shadowRadius: 2,
                        elevation: 1,
                      }}>
                        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 2}}>
                          <Text style={{
                            fontWeight: 'bold',
                            color: isDarkTheme ? Colors.primary : Colors.primary,
                            fontSize: 15,
                            marginRight: 6
                          }}>{item.username}</Text>
                        </View>
                        <Text style={{
                          color: isDarkTheme ? '#fff' : '#222',
                          fontSize: 14,
                          lineHeight: 19
                        }}>{item.text}</Text>
                      </View>
                    )}
                  />
                )
              )}
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
          <View style={[styles.modalContent, {backgroundColor: isDarkTheme ? '#252A37' : 'white'}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: isDarkTheme ? 'white' : 'black'}]}>
                Profili Düzenle
              </Text>
              <TouchableOpacity onPress={closeEditProfile}>
                <Ionicons name="close" size={24} color={isDarkTheme ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, {color: isDarkTheme ? '#ddd' : '#666'}]}>
                Ad Soyad
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: isDarkTheme ? 'white' : 'black',
                    backgroundColor: isDarkTheme ? '#1A202C' : '#F7FAFC',
                    borderColor: isDarkTheme ? '#2D3748' : '#E2E8F0'
                  }
                ]}
                value={editedUserData.fullName}
                onChangeText={(text) => setEditedUserData(prev => ({...prev, fullName: text}))}
                placeholder="Adınız Soyadınız"
                placeholderTextColor={isDarkTheme ? '#718096' : '#A0AEC0'}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, {color: isDarkTheme ? '#ddd' : '#666'}]}>
                Biyografi
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: isDarkTheme ? 'white' : 'black',
                    backgroundColor: isDarkTheme ? '#1A202C' : '#F7FAFC',
                    borderColor: isDarkTheme ? '#2D3748' : '#E2E8F0',
                    textAlignVertical: 'top'
                  }
                ]}
                value={editedUserData.bio}
                onChangeText={(text) => setEditedUserData(prev => ({...prev, bio: text}))}
                placeholder="Kendinizi tanıtın"
                placeholderTextColor={isDarkTheme ? '#718096' : '#A0AEC0'}
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
      style={[styles.drawingItem, {backgroundColor: isDarkTheme ? '#252A37' : '#F5F8FF'}]}
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
          style={[styles.drawingTitle, {color: isDarkTheme ? 'white' : 'black'}]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={[styles.drawingDate, {color: isDarkTheme ? '#ddd' : '#666'}]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Karanlık mod switch'i için fonksiyon
  const handleDarkModeToggle = () => {
    toggleTheme();
  };

  // Favoriler modalı açıldığında kullanıcının beğendiği resimleri getir
  const fetchFavoriteImages = async () => {
    setFavoritesLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      // Kullanıcının like attığı vote'ları bul
      const votesRef = collection(db, 'votes');
      const userVotesQuery = query(
        votesRef,
        where('userId', '==', currentUser.uid),
        where('voteType', '==', 'up')
      );
      const votesSnapshot = await getDocs(userVotesQuery);
      const imageIds = votesSnapshot.docs.map(doc => doc.data().imageId);
      // İlgili resimleri getir
      const imagesRef = collection(db, 'images');
      const favoriteImagesArr = [];
      for (const imageId of imageIds) {
        const imageDoc = await getDoc(doc(imagesRef, imageId));
        if (imageDoc.exists()) {
          favoriteImagesArr.push({ id: imageId, ...imageDoc.data() });
        }
      }
      setFavoriteImages(favoriteImagesArr);
    } catch (error) {
      setFavoriteImages([]);
    } finally {
      setFavoritesLoading(false);
    }
  };

  // Favoriler butonuna basınca modalı aç ve verileri getir
  const handleOpenFavorites = () => {
    setFavoritesModalVisible(true);
    fetchFavoriteImages();
  };

  // Favori kutucuğuna tıklanınca modalı aç
  const handleStatPress = (statLabel: string) => {
    if (statLabel === 'Favori') {
      handleOpenFavorites();
    }
  };

  if (isUserDataLoading) {
    return (
      <SafeAreaView style={[
        styles.container,
        {backgroundColor: isDarkTheme ? Colors.dark.background : Colors.light.background}
      ]}>
        <StatusBar style={isDarkTheme ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, {color: isDarkTheme ? Colors.dark.text : Colors.light.text}]}>
            Profil Yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[
      styles.container,
      {backgroundColor: isDarkTheme ? Colors.dark.background : Colors.light.background}
    ]}>
      <StatusBar style={isDarkTheme ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={[
          styles.title,
          {color: isDarkTheme ? Colors.dark.text : Colors.light.text}
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
              {color: isDarkTheme ? Colors.dark.text : Colors.light.text}
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
            {color: isDarkTheme ? Colors.dark.icon : Colors.light.icon}
          ]}>
            @{userData.username}
          </Text>
          
          <Text style={[
            styles.email,
            {color: isDarkTheme ? Colors.dark.icon : Colors.light.icon}
          ]}>
            {userData.email}
          </Text>
          
          <Text style={[
            styles.bio,
            {color: isDarkTheme ? Colors.dark.text : Colors.light.text}
          ]}>
            {userData.bio}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.statItem,
                {backgroundColor: isDarkTheme ? '#252A37' : '#F5F8FF'}
              ]}
              onPress={() => handleStatPress(stat.label)}
              activeOpacity={stat.label === 'Favori' ? 0.7 : 1}
            >
              <MaterialCommunityIcons name={stat.icon as any} size={24} color={Colors.primary} />
              <Text style={[
                styles.statValue,
                {color: isDarkTheme ? Colors.dark.text : Colors.light.text}
              ]}>
                {stat.value}
              </Text>
              <Text style={[
                styles.statLabel,
                {color: isDarkTheme ? Colors.dark.icon : Colors.light.icon}
              ]}>
                {stat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Çizimler Bölümü */}
        <View style={styles.drawingsSection}>
          <Text style={[
            styles.sectionTitle,
            {color: isDarkTheme ? Colors.dark.text : Colors.light.text}
          ]}>
            Çizimlerim
          </Text>
          
          {isLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          ) : savedDrawings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="brush" size={50} color={Colors.primary} />
              <Text style={[styles.emptyText, {color: isDarkTheme ? Colors.dark.text : Colors.light.text}]}>
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
            {color: isDarkTheme ? Colors.dark.text : Colors.light.text}
          ]}>
            Tercihler
          </Text>
          
          <View style={[
            styles.settingItem, 
            {borderBottomColor: isDarkTheme ? '#2D3748' : '#E2E8F0'}
          ]}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={22} color={Colors.primary} />
              <Text style={[
                styles.settingText,
                {color: isDarkTheme ? Colors.dark.text : Colors.light.text}
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
                {color: isDarkTheme ? Colors.dark.text : Colors.light.text}
              ]}>
                Karanlık Mod
              </Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={handleDarkModeToggle}
              thumbColor={darkModeEnabled ? Colors.primary : '#F4F3F4'}
              trackColor={{ false: '#767577', true: `${Colors.primary}80` }}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={[
            styles.sectionTitle,
            {color: isDarkTheme ? Colors.dark.text : Colors.light.text}
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
                  borderBottomColor: isDarkTheme ? '#2D3748' : '#E2E8F0'
                }
              ]}
              onPress={() => {
                if (item.title === 'Hakkında') setAboutModalVisible(true);
                else if (item.title === 'SSS') setSssModalVisible(true);
                else if (item.title === 'Yardım') setHelpModalVisible(true);
              }}
            >
              <View style={styles.menuItemContent}>
                <View style={[styles.menuIconContainer, {backgroundColor: `${item.color}20`}]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <Text style={[
                  styles.menuItemText,
                  {color: isDarkTheme ? Colors.dark.text : Colors.light.text}
                ]}>
                  {item.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkTheme ? Colors.dark.icon : Colors.light.icon} />
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
            {color: isDarkTheme ? Colors.dark.icon : Colors.light.icon}
          ]}>
            ArtApp v1.0.0
          </Text>
        </View>
      </ScrollView>
      
      {renderDrawingModal()}
      {renderEditProfileModal()}

      {/* Hakkında Modalı */}
      <Modal
        visible={aboutModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, {backgroundColor: isDark ? '#252A37' : 'white'}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: isDark ? 'white' : 'black'}]}>Hakkında</Text>
              <TouchableOpacity onPress={() => setAboutModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDark ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{maxHeight: 350}}>
              <Text style={{color: isDark ? 'white' : 'black', fontWeight: 'bold', fontSize: 16, marginBottom: 8}}>DoodleAI Hakkında</Text>
              <Text style={{color: isDark ? 'white' : 'black', marginBottom: 16}}>
                DoodleAI, Uygulamanın temel amacı, dijital sanat üreticilerini özellikle illüstratörler, NFT tasarımcıları ve sanat meraklılarını bir araya getiren, çizim yapma, yapay zekâ destekli görsel üretimi gerçekleştirme ve bu içerikleri etkileşimli bir şekilde paylaşma imkânı sunan bütünleşik bir platform sağlamaktır. Platform, hem manuel çizim araçları hem de generatif yapay zekâ teknolojileriyle kullanıcı deneyimini zenginleştirmeyi hedeflemektedir.
              </Text>
              <Text style={{color: isDark ? 'white' : 'black', fontWeight: 'bold', fontSize: 16, marginBottom: 8}}>Gizlilik Politikası</Text>
              <Text style={{color: isDark ? 'white' : 'black'}}>
                DoodleAI, kullanıcı verilerinin gizliliğine önem verir. Kişisel bilgileriniz üçüncü şahıslarla paylaşılmaz ve sadece uygulama deneyimini geliştirmek için kullanılır. Daha fazla bilgi için lütfen destek ekibimizle iletişime geçin.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SSS Modalı */}
      <Modal
        visible={sssModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSssModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, {backgroundColor: isDarkTheme ? '#252A37' : 'white'}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: isDarkTheme ? 'white' : 'black'}]}>Sıkça Sorulan Sorular</Text>
              <TouchableOpacity onPress={() => setSssModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkTheme ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{maxHeight: 350}}>
              <Text style={{color: isDarkTheme ? 'white' : 'black', fontWeight: 'bold', fontSize: 16, marginBottom: 8}}>1. Uygulamayı kimler, neden kullanmalı?</Text>
              <Text style={{color: isDarkTheme ? 'white' : 'black', marginBottom: 16}}>Bu uygulama; manuel çizim, yapay zekâ destekli görsel üretimi ve paylaşım özelliklerini entegre bir yapıda sunarak, bu üç işlevi bir araya getiren bütüncül bir platform ihtiyacını karşılamak üzere geliştirilmiştir. Mevcut sistemlerde bu özellikler genellikle ayrı uygulamalarda sunulurken, bu platform tüm bu süreçleri uyumlu ve etkileşimli bir şekilde bir araya getirmektedir. Uygulamanın ana hedef kitlesi NFT sanatçıları ve dijital çizerlerle, bu eserleri pazarlamak isteyen içerik üreticileri ve pazarlamacılardır. Ancak, sunduğu esnek araçlar ve kullanıcı dostu arayüz sayesinde, görsel sanatlarla ilgilenen her seviyedeki kullanıcıya hitap eden çok yönlü bir platform olarak tasarlanmıştır.</Text>
              <Text style={{color: isDarkTheme ? 'white' : 'black', fontWeight: 'bold', fontSize: 16, marginBottom: 8}}>2. Uygulama Ücretsiz mi?</Text>
              <Text style={{color: isDarkTheme ? 'white' : 'black', marginBottom: 16}}>Evet, uygulama şu an için tüm kullanıcılar tarafından tamamen ücretsiz olarak kullanılabilmektedir. Gelecekte sunulabilecek premium özellikler hakkında bilgilendirme, kullanıcılarla önceden paylaşılacaktır.</Text>
              <Text style={{color: isDarkTheme ? 'white' : 'black', fontWeight: 'bold', fontSize: 16, marginBottom: 8}}>3. Çizimlerimi nasıl kaydedebilirim?</Text>
              <Text style={{color: isDarkTheme ? 'white' : 'black'}}>Çiziminizi tamamladıktan veya yapay zekâ destekli bir görsel ürettikten sonra, ekranda beliren "Kaydet" butonuna tıklayarak çalışmanızı profilinize kaydedebilirsiniz. Kayıt işlemi sonrasında çiziminiz profil sayfanızda görüntülenebilir ve dilediğiniz zaman erişilebilir olacaktır.</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Yardım Modalı */}
      <Modal
        visible={helpModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, {backgroundColor: isDarkTheme ? '#252A37' : 'white'}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: isDarkTheme ? 'white' : 'black'}]}>Yardım</Text>
              <TouchableOpacity onPress={() => setHelpModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkTheme ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{maxHeight: 350}}>
              <Text style={{color: isDarkTheme ? 'white' : 'black', fontSize: 16, marginBottom: 8}}>
                Uygulama ile ilgili yardım almak için aşağıdaki adımları izleyebilirsiniz:
              </Text>
              <Text style={{color: isDarkTheme ? 'white' : 'black', marginBottom: 8}}>
                • Profilinizi düzenlemek için üstteki "Düzenle" butonunu kullanabilirsiniz.
              </Text>
              <Text style={{color: isDarkTheme ? 'white' : 'black', marginBottom: 8}}>
                • Çizim yapmak için ana menüden "Çizim Yap" seçeneğine tıklayın.
              </Text>
              <Text style={{color: isDarkTheme ? 'white' : 'black', marginBottom: 8}}>
                • Sorun yaşarsanız veya destek almak isterseniz, uygulama geliştiricisiyle iletişime geçebilirsiniz.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Favoriler Modalı */}
      <Modal
        visible={favoritesModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFavoritesModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, {backgroundColor: isDarkTheme ? '#252A37' : 'white'}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: isDarkTheme ? 'white' : 'black'}]}>Favorilerim</Text>
              <TouchableOpacity onPress={() => setFavoritesModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkTheme ? 'white' : 'black'} />
              </TouchableOpacity>
            </View>
            {favoritesLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : favoriteImages.length === 0 ? (
              <Text style={{color: isDarkTheme ? 'white' : 'black', marginTop: 20}}>Henüz favori resminiz yok.</Text>
            ) : (
              <FlatList
                data={favoriteImages}
                keyExtractor={item => item.id}
                numColumns={2}
                contentContainerStyle={{padding: 8}}
                renderItem={({item}) => (
                  <View style={{flex: 1, margin: 6, alignItems: 'center'}}>
                    <Image source={{uri: item.imageURL || item.imageData}} style={{width: 120, height: 120, borderRadius: 12}} resizeMode="cover" />
                    <Text style={{color: isDarkTheme ? 'white' : 'black', marginTop: 6, fontSize: 13}} numberOfLines={1}>{item.title || 'İsimsiz'}</Text>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default ProfileScreen;

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