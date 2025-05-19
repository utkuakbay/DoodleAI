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
  LogBox
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
  getFirestore
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { setupFirestoreCollections } from '../setup';

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

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('popular');
  const screenWidth = Dimensions.get('window').width;
  const numColumns = 2;
  const tileSize = screenWidth / numColumns - 20;
  const [initialSetupDone, setInitialSetupDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
    fetchImages();
  }, [sortBy, initialSetupDone]);
  
const fetchImages = async () => {
  try {
    setLoading(true);
    setError(null);
    console.log('Keşfet sayfası: Resimler yükleniyor...');

    if (!initialSetupDone && auth.currentUser) {
      try {
        await setupFirestoreCollections();
        setInitialSetupDone(true);
      } catch (error) {
        console.error('Firestore kurulum hatası:', error);
      }
    }

    const imagesRef = collection(db, 'images');
    let q;

    try {
      q = query(
        imagesRef,
        sortBy === 'popular' ? orderBy('upvotes', 'desc') : orderBy('createdAt', 'desc'),
        limit(50)
      );
    } catch (queryError) {
      console.error('Sorgu oluşturma hatası:', queryError);
      q = query(imagesRef, limit(50));
    }

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty && auth.currentUser) {
      console.log('Veri bulunamadı, örnek veri ekleniyor...');
      const demoImageId = `demo-image-${Date.now()}`;
      await setDoc(doc(db, 'images', demoImageId), {
        id: demoImageId,
        userId: auth.currentUser.uid,
        title: 'Örnek Çizim',
        imageURL: 'https://picsum.photos/400/300',
        type: 'canvas',
        createdAt: Date.now(),
        upvotes: 0,
        downvotes: 0
      });
      // Tekrar deneme
      const retrySnapshot = await getDocs(q);
      if (retrySnapshot.empty) {
        setError('Resim verisi bulunamadı.');
        setImages([]);
        return;
      }
    }

    const currentUser = auth.currentUser;
    let userVotes: { [key: string]: 'up' | 'down' } = {};

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
        console.warn('Oy verileri alınamadı:', votesError);
      }
    }

    const processedImages: ImageItem[] = [];
    for (const docSnap of querySnapshot.docs) {
      const imageData = docSnap.data();
      let username = 'Kullanıcı';

      try {
        const userDoc = await getDoc(doc(db, 'users', imageData.userId || 'unknown'));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          username = userData.username || userData.fullName || 'Kullanıcı';
        }
      } catch (userError) {
        console.warn('Kullanıcı bilgisi alınamadı:', userError);
      }

      const imageURL = imageData.imageURL || imageData.imageData || 'https://picsum.photos/400/300';

      processedImages.push({
        id: docSnap.id,
        userId: imageData.userId || 'unknown',
        imageURL,
        title: imageData.title || 'İsimsiz Resim',
        createdAt: imageData.createdAt || 0,
        type: imageData.type || 'canvas',
        username,
        upvotes: imageData.upvotes || 0,
        downvotes: imageData.downvotes || 0,
        userVote: currentUser ? userVotes[docSnap.id] || null : null
      });
    }

    setImages(processedImages);
    setError(null);
  } catch (firestoreError) {
    console.error('Resim verileri alınırken hata oluştu:', firestoreError);
    setError('Resim verileri alınırken bir hata oluştu.');
    setImages([]);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

        }
        
        // Resim verilerini düzenle
        const processedImages: ImageItem[] = [];
        
        for (const document of querySnapshot.docs) {
          try {
            const imageData = document.data();
            
            // Kullanıcı bilgilerini getir
            let username = 'Kullanıcı';
            try {
              const userDocRef = doc(db, 'users', imageData.userId || 'unknown');
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const userData = userDoc.data();
                username = userData.username || userData.fullName || 'Kullanıcı';
              }
            } catch (userError) {
              console.log('Kullanıcı bilgisi alınamadı:', userError);
              // Kullanıcı bilgisi yoksa devam et, varsayılan değerleri kullan
            }
            
            // Base64 mi URL mi kontrol et
            const imageURL = imageData.imageURL || imageData.imageData || 'https://picsum.photos/400/300';
            
            processedImages.push({
              id: document.id,
              userId: imageData.userId || 'unknown',
              imageURL: imageURL,
              title: imageData.title || 'İsimsiz Resim',
              createdAt: imageData.createdAt || 0,
              type: imageData.type || 'canvas',
              username,
              upvotes: imageData.upvotes || 0,
              downvotes: imageData.downvotes || 0,
              userVote: currentUser ? userVotes[document.id] || null : null
            });
          } catch (docError) {
            console.error('Belge işleme hatası:', docError);
            // Bir belge işlenirken hata oluşursa diğer belgelere devam et
            continue;
          }
        }
        
        imagesData = processedImages;
        console.log('Keşfet sayfası: Toplam işlenen resim sayısı:', imagesData.length);
      } catch (firestoreError) {
        console.error('Keşfet sayfası: Firestore veri çekme hatası:', firestoreError);
        setError('Resimler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        // Firestore hatası, boş diziyi göster
      }
      
      setImages(imagesData);
    } catch (error) {
      console.error('Keşfet sayfası: Genel hata:', error);
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Kullanıcı oyunu kaydet
  const handleVote = async (imageId: string, voteType: 'up' | 'down') => {
    // Kullanıcı giriş yapmamışsa uyarı göster ve oturum açma sayfasına yönlendir
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
      console.log('Oy veriliyor:', imageId, voteType);
      
      // Önce votes koleksiyonunu kontrol et
      try {
        const votesRef = collection(db, 'votes');
        const votesCheck = query(votesRef, limit(1));
        await getDocs(votesCheck);
      } catch (votesError) {
        console.log('Votes koleksiyonu oluşturuluyor...');
        // Koleksiyon henüz yok, ilk dokümanı oluştur
        const votesRef = collection(db, 'votes');
        await setDoc(doc(votesRef, 'init'), {
          init: true,
          createdAt: Date.now()
        });
      }
      
      // Önce resmin mevcut olduğunu kontrol et
      const imageRef = doc(db, 'images', imageId);
      const imageDoc = await getDoc(imageRef);
      
      if (!imageDoc.exists()) {
        Alert.alert('Hata', 'Resim bulunamadı.');
        return;
      }
      
      // Resim verilerini al
      const imageData = imageDoc.data();
      let upvotes = imageData.upvotes || 0;
      let downvotes = imageData.downvotes || 0;
      
      // Kullanıcının daha önce bu resme oy verip vermediğini kontrol et
      const votesRef = collection(db, 'votes');
      const q = query(
        votesRef,
        where('imageId', '==', imageId),
        where('userId', '==', currentUser.uid)
      );
      
      const votesSnapshot = await getDocs(q);
      
      // Oy işlemini yap
      if (!votesSnapshot.empty) {
        // Kullanıcı daha önce oy vermiş
        const voteDoc = votesSnapshot.docs[0];
        const voteData = voteDoc.data() as Vote;
        
        if (voteData.voteType === voteType) {
          // Aynı tip oy vermişse, oyu kaldır
          await deleteDoc(voteDoc.ref);
          
          if (voteType === 'up') {
            upvotes = Math.max(0, upvotes - 1);
          } else {
            downvotes = Math.max(0, downvotes - 1);
          }
          
          // Resim güncellemelerini yap
          await updateDoc(imageRef, {
            upvotes,
            downvotes
          });
          
          // UI güncellemesi
          setImages(prevImages => 
            prevImages.map(img => 
              img.id === imageId 
                ? { 
                    ...img, 
                    upvotes: voteType === 'up' ? Math.max(0, img.upvotes - 1) : img.upvotes,
                    downvotes: voteType === 'down' ? Math.max(0, img.downvotes - 1) : img.downvotes,
                    userVote: null 
                  } 
                : img
            )
          );
        } else {
          // Farklı tip oy vermişse, oy tipini değiştir
          await updateDoc(voteDoc.ref, {
            voteType,
            createdAt: Date.now()
          });
          
          if (voteType === 'up') {
            upvotes++;
            downvotes = Math.max(0, downvotes - 1);
          } else {
            downvotes++;
            upvotes = Math.max(0, upvotes - 1);
          }
          
          // Resim güncellemelerini yap
          await updateDoc(imageRef, {
            upvotes,
            downvotes
          });
          
          // UI güncellemesi
          setImages(prevImages => 
            prevImages.map(img => 
              img.id === imageId 
                ? { 
                    ...img, 
                    upvotes: voteType === 'up' ? img.upvotes + 1 : Math.max(0, img.upvotes - 1),
                    downvotes: voteType === 'down' ? img.downvotes + 1 : Math.max(0, img.downvotes - 1),
                    userVote: voteType 
                  } 
                : img
            )
          );
        }
      } else {
        // Kullanıcı daha önce oy vermemiş, yeni oy ekle
        try {
          const newVote: Vote = {
            imageId,
            userId: currentUser.uid,
            voteType,
            createdAt: Date.now()
          };
          
          await addDoc(collection(db, 'votes'), newVote);
          
          if (voteType === 'up') {
            upvotes++;
          } else {
            downvotes++;
          }
          
          // Resim güncellemelerini yap
          await updateDoc(imageRef, {
            upvotes,
            downvotes
          });
          
          // UI güncellemesi
          setImages(prevImages => 
            prevImages.map(img => 
              img.id === imageId 
                ? { 
                    ...img, 
                    upvotes: voteType === 'up' ? img.upvotes + 1 : img.upvotes,
                    downvotes: voteType === 'down' ? img.downvotes + 1 : img.downvotes,
                    userVote: voteType 
                  } 
                : img
            )
          );
        } catch (addError) {
          console.error('Yeni oy eklenirken hata:', addError);
          Alert.alert('Hata', 'Oy kaydedilemedi. Lütfen tekrar deneyin.');
        }
      }
      
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
    // Base64 veri kontrolü
    const imageSource = { uri: item.imageURL };
    
    return (
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
            @{item.username}
          </Text>
          
          <View style={styles.votingContainer}>
            <TouchableOpacity 
              style={[
                styles.voteButton,
                item.userVote === 'up' && styles.activeUpvote
              ]} 
              onPress={() => handleVote(item.id, 'up')}
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
    );
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
