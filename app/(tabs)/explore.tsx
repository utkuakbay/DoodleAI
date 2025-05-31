import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Image,
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Dimensions,
  Alert,
  SafeAreaView,
  RefreshControl,
  LogBox,
  Modal,
  TextInput
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  getDoc, 
  setDoc,
  Firestore,
  DocumentData,
  getFirestore,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { setupFirestoreCollections } from '../setup';
import { useTheme } from '../../context/ThemeContext';

// Bazı Firebase uyarılarını görmezden gel
LogBox.ignoreLogs(['AsyncStorage has been extracted from react-native core and will be removed in a future release', '@firebase/firestore']);

// Arayüz tanımlamaları
interface ImageItem {
  id: string;
  userId: string;
  imageURL: string;
  title: string;
  createdAt: number;
  type: 'canvas' | 'generator'; // Resmin kaynağı
  username?: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null; // Mevcut kullanıcının oyu
}

interface Vote {
  id?: string;
  imageId: string;
  userId: string;
  voteType: 'up' | 'down';
  createdAt: number;
}

interface CommentType {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: any;
}

export default function ExploreScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('popular');
  const screenWidth = Dimensions.get('window').width;
  const numColumns = 2;
  const tileSize = screenWidth / numColumns - 20;
  const [initialSetupDone, setInitialSetupDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  
  // Kullanıcı giriş yapınca koleksiyonlar kontrol edilsin
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Kullanıcı oturum açmış mı kontrol et
        const user = auth.currentUser;
        if (user && !initialSetupDone) {
          console.log('Keşfet sayfası: Firebase koleksiyonları kontrol ediliyor...');
          const setupSuccess = await setupFirestoreCollections();
          setInitialSetupDone(true);
          
          if (!setupSuccess) {
            console.warn('Firestore koleksiyonları kurulumu tamamlanamamış olabilir');
          }
        }
      } catch (error) {
        console.error('Firebase kurulum hatası:', error);
        setError('Firebase ayarları sırasında bir hata oluştu. Lütfen tekrar deneyin.');
      }
    };

    checkAuth();
  }, [initialSetupDone]);
  
  // Resimleri Firestore'dan getir
  useEffect(() => {
    if (!initialSetupDone) return;
    
    setLoading(true);
    setError(null);
    
    const imagesRef = collection(db, 'images');
    let q = query(
      imagesRef,
      sortBy === 'popular' ? orderBy('upvotes', 'desc') : orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    // Gerçek zamanlı dinleme
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      try {
        const currentUser = auth.currentUser;
        
        // Kullanıcı oylarını getir
        let userVotes: {[key: string]: 'up' | 'down'} = {};
        
        if (currentUser) {
          try {
            const votesRef = collection(db, 'votes');
            const userVotesQuery = query(
              votesRef,
              where('userId', '==', currentUser.uid)
            );
            
            const votesSnapshot = await getDocs(userVotesQuery);
            votesSnapshot.forEach((voteDoc) => {
              const voteData = voteDoc.data() as Vote;
              userVotes[voteData.imageId] = voteData.voteType;
            });
          } catch (votesError) {
            console.log('Oylar yüklenemedi:', votesError);
          }
        }
        
        // Resim verilerini işle
        const imagesData: ImageItem[] = [];
        
        for (const docSnap of querySnapshot.docs) {
          try {
            const imageData = docSnap.data();
            
            // Kullanıcı bilgilerini getir
            let username = 'Kullanıcı';
            try {
              const userDocRef = doc(db, 'users', imageData.userId || 'unknown');
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const userData = userDoc.data() as any;
                username = userData.username || userData.fullName || 'Kullanıcı';
              }
            } catch (userError) {
              console.log('Kullanıcı bilgisi alınamadı:', userError);
            }
            
            const imageURL = imageData.imageURL || imageData.imageData || 'https://picsum.photos/400/300';
            
            imagesData.push({
              id: docSnap.id,
              userId: imageData.userId || 'unknown',
              imageURL: imageURL,
              title: imageData.title || 'İsimsiz Resim',
              createdAt: imageData.createdAt || 0,
              type: imageData.type || 'canvas',
              username,
              upvotes: imageData.upvotes || 0,
              downvotes: imageData.downvotes || 0,
              userVote: currentUser ? userVotes[docSnap.id] || null : null
            });
          } catch (docError) {
            console.error('Belge işleme hatası:', docError);
            continue;
          }
        }
        
        setImages(imagesData);
        setLoading(false);
      } catch (error) {
        console.error('Snapshot işleme hatası:', error);
        setError('Resimler yüklenirken hata oluştu.');
        setLoading(false);
      }
    }, (error) => {
      console.error('Firestore dinleme hatası:', error);
      setError('Resimler yüklenirken hata oluştu.');
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [sortBy, initialSetupDone]);
  
  const fetchImages = async () => {
    try {
      setLoading(true);
      setError(null);
      // Sadece refresh için kullanılıyor, veri yükleme useEffect ile gerçek zamanlı
    } catch (error) {
      console.error('Fetch images hatası:', error);
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Kullanıcı oyunu kaydet
  const handleVote = async (imageId: string, voteType: 'up' | 'down') => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert(
        'Giriş Gerekli', 
        'Oy vermek için giriş yapmalısınız.', 
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }
    
    try {
      // Çift tıklamayı önlemek için geçici olarak buton deaktif et
      const targetImage = images.find(img => img.id === imageId);
      if (!targetImage) return;
      
      // Önce votes koleksiyonunu kontrol et
      try {
        const votesRef = collection(db, 'votes');
        const votesCheck = query(votesRef, limit(1));
        await getDocs(votesCheck);
      } catch (votesError) {
        const votesRef = collection(db, 'votes');
        await setDoc(doc(votesRef, 'init'), {
          init: true,
          createdAt: Date.now()
        });
      }
      
      // Resim dokümanını kontrol et
      const imageRef = doc(db, 'images', imageId);
      const imageDoc = await getDoc(imageRef);
      
      if (!imageDoc.exists()) {
        Alert.alert('Hata', 'Resim bulunamadı.');
        return;
      }
      
      // Kullanıcının mevcut oyunu kontrol et
      const votesRef = collection(db, 'votes');
      const userVoteQuery = query(
        votesRef,
        where('imageId', '==', imageId),
        where('userId', '==', currentUser.uid)
      );
      
      const votesSnapshot = await getDocs(userVoteQuery);
      const currentImageData = imageDoc.data();
      
      let newUpvotes = currentImageData.upvotes || 0;
      let newDownvotes = currentImageData.downvotes || 0;
      let newUserVote: 'up' | 'down' | null = null;
      
      if (!votesSnapshot.empty) {
        // Kullanıcı daha önce oy vermiş
        const voteDoc = votesSnapshot.docs[0];
        const voteData = voteDoc.data() as Vote;
        
        if (voteData.voteType === voteType) {
          // Aynı oyu veriyorsa, oyu kaldır
          await deleteDoc(voteDoc.ref);
          
          if (voteType === 'up') {
            newUpvotes = Math.max(0, newUpvotes - 1);
          } else {
            newDownvotes = Math.max(0, newDownvotes - 1);
          }
          newUserVote = null;
        } else {
          // Farklı oy veriyorsa, oyu değiştir
          await updateDoc(voteDoc.ref, {
            voteType,
            createdAt: Date.now()
          });
          
          if (voteType === 'up') {
            newUpvotes = newUpvotes + 1;
            newDownvotes = Math.max(0, newDownvotes - 1);
          } else {
            newDownvotes = newDownvotes + 1;
            newUpvotes = Math.max(0, newUpvotes - 1);
          }
          newUserVote = voteType;
        }
      } else {
        // Yeni oy ekle
        const newVote: Vote = {
          imageId,
          userId: currentUser.uid,
          voteType,
          createdAt: Date.now()
        };
        
        await addDoc(collection(db, 'votes'), newVote);
        
        if (voteType === 'up') {
          newUpvotes = newUpvotes + 1;
        } else {
          newDownvotes = newDownvotes + 1;
        }
        newUserVote = voteType;
      }
      
      // Resim dokümanını güncelle
      await updateDoc(imageRef, {
        upvotes: newUpvotes,
        downvotes: newDownvotes
      });
      
      console.log('Oy başarıyla kaydedildi');
    } catch (error) {
      console.error('Oy verme hatası:', error);
      Alert.alert('Hata', 'Oy verilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchImages();
  };
  
  const renderImageItem = ({ item }: { item: ImageItem }) => {
    const imageSource = { uri: item.imageURL };
    
    return (
      <TouchableOpacity onPress={() => { setSelectedImage(item); setShowModal(true); }}>
        <View style={[
          styles.imageTile, 
          { 
            width: tileSize, 
            height: tileSize * 1.4,
            backgroundColor: isDark ? '#252A37' : '#F5F8FF'
          }
        ]}>
          <Image 
            source={imageSource} 
            style={styles.tileImage}
            resizeMode="cover"
          />
          
          <View style={styles.tileFooter}>
            <Text style={[
              styles.imageTitle,
              { color: isDark ? Colors.dark.text : Colors.light.text }
            ]} numberOfLines={1}>
              {item.title}
            </Text>
            
            <Text style={[
              styles.imageAuthor,
              { color: isDark ? Colors.dark.icon : Colors.light.icon }
            ]} numberOfLines={1}>
              Yapan: @{item.username}
            </Text>
            
            <View style={styles.votingContainer}>
              <TouchableOpacity 
                style={[
                  styles.voteButton,
                  item.userVote === 'up' && styles.activeUpvote
                ]} 
                onPress={() => handleVote(item.id, 'up')}
                disabled={loading} // Yüklenme sırasında deaktif et
              >
                <AntDesign 
                  name="like2" 
                  size={18} 
                  color={item.userVote === 'up' ? 'white' : isDark ? Colors.dark.text : Colors.light.text} 
                />
                <Text style={[
                  styles.voteCount,
                  { color: item.userVote === 'up' ? 'white' : isDark ? Colors.dark.text : Colors.light.text }
                ]}>
                  {item.upvotes}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.voteButton,
                  item.userVote === 'down' && styles.activeDownvote
                ]} 
                onPress={() => handleVote(item.id, 'down')}
                disabled={loading} // Yüklenme sırasında deaktif et
              >
                <AntDesign 
                  name="dislike2" 
                  size={18} 
                  color={item.userVote === 'down' ? 'white' : isDark ? Colors.dark.text : Colors.light.text} 
                />
                <Text style={[
                  styles.voteCount,
                  { color: item.userVote === 'down' ? 'white' : isDark ? Colors.dark.text : Colors.light.text }
                ]}>
                  {item.downvotes}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  useEffect(() => {
    const updateUsernames = async () => {
      const updatedImages = await Promise.all(images.map(async (img) => {
        if (!img.username || img.username === '' || img.username === 'Kullanıcı') {
          try {
            const userDocRef = doc(db, 'users', img.userId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return { ...img, username: userData.username || userData.fullName || 'Kullanıcı' };
            }
          } catch {}
        }
        return img;
      }));
      setImages(updatedImages);
    };
    if (images.some(img => !img.username || img.username === '' || img.username === 'Kullanıcı')) {
      updateUsernames();
    }
  }, [images]);
  
  // Modal açıldığında yorumları çek
  useEffect(() => {
    if (showModal && selectedImage) {
      fetchComments(selectedImage.id);
    }
  }, [showModal, selectedImage]);

  const fetchComments = async (imageId: any) => {
    setCommentLoading(true);
    const q = query(
      collection(db, 'comments'),
      where('imageId', '==', imageId),
      orderBy('createdAt', 'asc')
    );
    const snapshot = await getDocs(q);
    setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommentType)));
    setCommentLoading(false);
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || commentText.length > 200) return;
    const currentUser = auth.currentUser;
    if (!currentUser || !selectedImage) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const username = userDoc.exists() ? (userDoc.data().username || 'Kullanıcı') : 'Kullanıcı';
      await addDoc(collection(db, 'comments'), {
        imageId: selectedImage.id,
        userId: currentUser.uid,
        username,
        text: commentText.trim(),
        createdAt: serverTimestamp()
      });
      setCommentText('');
      fetchComments(selectedImage.id);
    } catch (e) {
      Alert.alert('Hata', 'Yorum eklenemedi. Lütfen tekrar deneyin.');
    }
  };
  
  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }
    ]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={[
          styles.title,
          { color: isDark ? Colors.dark.text : Colors.light.text }
        ]}>
          Keşfet
        </Text>
        
        <View style={styles.sortOptions}>
          <TouchableOpacity 
            style={[
              styles.sortButton,
              sortBy === 'popular' && styles.activeSortButton
            ]}
            onPress={() => setSortBy('popular')}
          >
            <Text style={[
              styles.sortButtonText,
              { color: sortBy === 'popular' ? Colors.primary : isDark ? Colors.dark.icon : Colors.light.icon }
            ]}>
              Popüler
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.sortButton,
              sortBy === 'newest' && styles.activeSortButton
            ]}
            onPress={() => setSortBy('newest')}
          >
            <Text style={[
              styles.sortButtonText,
              { color: sortBy === 'newest' ? Colors.primary : isDark ? Colors.dark.icon : Colors.light.icon }
            ]}>
              En Yeni
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {error && (
        <TouchableOpacity 
          style={styles.errorContainer}
          onPress={() => {
            setError(null);
            fetchImages();
          }}
        >
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>Yenilemek için dokunun</Text>
        </TouchableOpacity>
      )}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[
            styles.loadingText,
            { color: isDark ? Colors.dark.text : Colors.light.text }
          ]}>
            Resimler yükleniyor...
          </Text>
        </View>
      ) : images.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="image-search" size={60} color={Colors.primary} />
          <Text style={[
            styles.emptyText,
            { color: isDark ? Colors.dark.text : Colors.light.text }
          ]}>
            Henüz resim yok
          </Text>
          <Text style={[
            styles.emptySubtext,
            { color: isDark ? Colors.dark.icon : Colors.light.icon }
          ]}>
            İlk resmi yükleyen sen ol!
          </Text>
          
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/canvas')}
          >
            <Text style={styles.createButtonText}>Çizim Yap</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderImageItem}
          keyExtractor={item => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.imageGrid}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        />
      )}
      
      <Modal
        visible={showModal && !!selectedImage}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          {selectedImage && (
            <View style={{ backgroundColor: isDark ? Colors.dark.background : Colors.light.background, borderRadius: 16, padding: 0, width: '90%', alignItems: 'center', overflow: 'hidden' }}>
              <View style={{ width: '100%', alignItems: 'flex-end', zIndex: 2, position: 'absolute', top: 10, right: 10 }}>
                <TouchableOpacity onPress={() => setShowModal(false)} style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: 4 }}>
                  <Ionicons name="close" size={28} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
              </View>
              <Image source={{ uri: selectedImage.imageURL }} style={{ width: '100%', height: 300, borderTopLeftRadius: 16, borderTopRightRadius: 16, marginBottom: 0 }} resizeMode="contain" />
              <View style={{ width: '100%', padding: 20, alignItems: 'center' }}>
                <Text style={{ color: isDark ? Colors.dark.text : Colors.light.text, fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>{selectedImage.title}</Text>
                <Text style={{ color: isDark ? Colors.dark.icon : Colors.light.icon, marginBottom: 8 }}>Yapan: @{selectedImage.username}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => handleVote(selectedImage.id, 'up')} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                    <AntDesign name="like2" size={20} color={selectedImage.userVote === 'up' ? Colors.success : isDark ? Colors.dark.text : Colors.light.text} />
                    <Text style={{ color: isDark ? Colors.dark.text : Colors.light.text, marginLeft: 4 }}>{selectedImage.upvotes}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleVote(selectedImage.id, 'down')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AntDesign name="dislike2" size={20} color={selectedImage.userVote === 'down' ? Colors.error : isDark ? Colors.dark.text : Colors.light.text} />
                    <Text style={{ color: isDark ? Colors.dark.text : Colors.light.text, marginLeft: 4 }}>{selectedImage.downvotes}</Text>
                  </TouchableOpacity>
                </View>
                {/* Yorumlar */}
                <View style={{maxHeight: 200, marginTop: 10, width: '100%'}}>
                  {commentLoading ? <ActivityIndicator /> : (
                    comments.length === 0 ? (
                      <Text style={{color: isDark ? '#fff' : '#000', textAlign: 'center', marginTop: 10}}>Henüz yorum yok.</Text>
                    ) : (
                      <FlatList
                        data={comments}
                        keyExtractor={item => item.id}
                        renderItem={({item}) => (
                          <View style={{
                            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F5F8FF',
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
                                color: isDark ? Colors.primary : Colors.primary,
                                fontSize: 15,
                                marginRight: 6
                              }}>{item.username}</Text>
                            </View>
                            <Text style={{
                              color: isDark ? '#fff' : '#222',
                              fontSize: 14,
                              lineHeight: 19
                            }}>{item.text}</Text>
                          </View>
                        )}
                      />
                    )
                  )}
                </View>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10}}>
                  <TextInput
                    value={commentText}
                    onChangeText={setCommentText}
                    maxLength={200}
                    placeholder='Yorum ekle...'
                    placeholderTextColor={isDark ? '#aaa' : '#888'}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: isDark ? Colors.primary : '#ccc',
                      borderRadius: 20,
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      color: isDark ? '#fff' : '#222',
                      backgroundColor: isDark ? '#23243a' : '#fff'
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleAddComment}
                    style={{
                      marginLeft: 8,
                      backgroundColor: Colors.primary,
                      borderRadius: 20,
                      paddingVertical: 8,
                      paddingHorizontal: 16
                    }}
                  >
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>Gönder</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sortOptions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 20,
  },
  activeSortButton: {
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  errorContainer: {
    marginHorizontal: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 120, 120, 0.1)',
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  errorText: {
    color: '#d63031',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#d63031',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    marginBottom: 30,
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  imageGrid: {
    padding: 10,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  imageTile: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  tileImage: {
    width: '100%',
    height: '65%',
  },
  tileFooter: {
    padding: 10,
    flex: 1,
  },
  imageTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  imageAuthor: {
    fontSize: 12,
    marginBottom: 8,
  },
  votingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 10,
  },
  activeUpvote: {
    backgroundColor: Colors.success,
  },
  activeDownvote: {
    backgroundColor: Colors.error,
  },
  voteCount: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
});
