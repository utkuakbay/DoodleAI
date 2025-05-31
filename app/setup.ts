import { db, auth, rtdb } from './firebase';
import { collection, doc, setDoc, getDocs, query, limit, getFirestore, writeBatch, getDoc } from 'firebase/firestore';
import { ref, set, get } from 'firebase/database';
import { Alert } from 'react-native';

// Firestore koleksiyonlarını kurulumu
export async function setupFirestoreCollections() {
  try {
    // Kullanıcı giriş yapmış mı kontrol et
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('Firestore kurulumu için kullanıcı girişi gerekli');
      return false;
    }

    console.log('Firestore koleksiyonları kontrol ediliyor...');
    
    // RTDB'den resimleri kontrol et ve Firestore'a aktarılacak mı bak
    try {
      // Kullanıcının RTDB'deki çizimlerini kontrol et
      const rtdbDrawingsRef = ref(rtdb, `drawings/${currentUser.uid}`);
      const rtdbSnapshot = await get(rtdbDrawingsRef);
      
      if (rtdbSnapshot.exists()) {
        // RTDB'de resimler var, Firestore koleksiyonunda da var mı kontrol et
        try {
          const imagesRef = collection(db, 'images');
          const imagesQuery = query(imagesRef, limit(1));
          const imagesSnapshot = await getDocs(imagesQuery);
          
          // Eğer Firestore'da images koleksiyonu yoksa veya boşsa, RTDB'den verileri taşı
          if (imagesSnapshot.empty) {
            console.log('Realtime DB resimleri Firestore images koleksiyonuna taşınıyor...');
            
            try {
              let batch = writeBatch(db);
              const rtdbData = rtdbSnapshot.val();
              let migratedCount = 0;
              
              // RTDB'deki her resmi Firestore'a ekle
              for (const key in rtdbData) {
                const drawing = rtdbData[key];
                
                // Resim verilerini oluştur
                const imageData = {
                  id: drawing.id,
                  userId: currentUser.uid,
                  imageData: drawing.imageData,
                  imageURL: drawing.imageData, // Base64 verisi URL olarak da kullanılır
                  title: drawing.title || `Çizim_${new Date().toLocaleDateString()}`,
                  type: 'canvas',
                  createdAt: drawing.createdAt || Date.now(),
                  upvotes: 0,
                  downvotes: 0
                };
                
                // Firestore'a ekle
                const imageRef = doc(db, 'images', drawing.id);
                batch.set(imageRef, imageData);
                migratedCount++;
                
                // 500 belge sınırına ulaşıldığında batch'i commit et
                if (migratedCount % 500 === 0) {
                  await batch.commit();
                  console.log(`${migratedCount} resim taşındı...`);
                  // Yeni batch başlat
                  batch = writeBatch(db);
                }
              }
              
              // Kalan belgeleri commit et
              if (migratedCount % 500 !== 0) {
                await batch.commit();
              }
              
              console.log(`Toplam ${migratedCount} resim başarıyla Firestore'a taşındı`);
            } catch (batchError) {
              console.error('Resim taşıma batch işlemi hatası:', batchError);
              // Taşıma hatası durumunda bile devam et
            }
          } else {
            console.log('Firestore images koleksiyonu zaten var, veri taşıma işlemi yapılmadı');
          }
        } catch (imagesQueryError) {
          console.error('Images koleksiyonu sorgulama hatası:', imagesQueryError);
          // Sorgu hatası olsa bile devam et
        }
      }
    } catch (rtdbError) {
      console.error('RTDB erişim hatası:', rtdbError);
      // RTDB hatası olsa bile kuruluma devam et
    }

    // Images koleksiyonunu kontrol et, boşsa örnek veri ekle
    try {
      const imagesRef = collection(db, 'images');
      const imagesQuery = query(imagesRef, limit(1));
      const imagesSnapshot = await getDocs(imagesQuery);

      if (imagesSnapshot.empty) {
        console.log('Images koleksiyonu boş, örnek resim ekleniyor...');
        
        try {
          // Örnek resim verisi
          const demoImageId = `demo-image-${Date.now()}`;
          await setDoc(doc(db, 'images', demoImageId), {
            id: demoImageId,
            userId: currentUser.uid,
            title: 'Örnek Çizim',
            imageURL: 'https://picsum.photos/400/300', // Örnek bir resim URL'i
            type: 'canvas',
            createdAt: Date.now(),
            upvotes: 0,
            downvotes: 0
          });
          
          console.log('Örnek resim verisi başarıyla eklendi');
        } catch (demoImageError) {
          console.error('Örnek resim ekleme hatası:', demoImageError);
          // Örnek resim ekleme hatası olsa bile devam et
        }
      } else {
        console.log('Images koleksiyonunda resimler mevcut, örnek veri eklenmedi');
      }
    } catch (imagesCheckError) {
      console.error('Images koleksiyonu kontrol hatası:', imagesCheckError);
      // Images kontrolü hatası olsa bile devam et
    }

    // Votes koleksiyonunu oluştur (eğer yoksa)
    try {
      // Votes koleksiyonunu kontrol et
      const votesRef = collection(db, 'votes');
      await getDocs(query(votesRef, limit(1)));
      console.log('Votes koleksiyonu mevcut');
    } catch (votesError) {
      console.log('Votes koleksiyonu henüz oluşturulmamış, ilk oy verildiğinde otomatik oluşturulacak');
      // Votes koleksiyonu oluşturmayı dene
      try {
        // Boş bir doküman oluşturarak koleksiyonu başlat
        const votesRef = collection(db, 'votes');
        await setDoc(doc(votesRef, 'init'), {
          init: true,
          createdAt: Date.now()
        });
        console.log('Votes koleksiyonu başarıyla oluşturuldu');
      } catch (createVotesError) {
        console.error('Votes koleksiyonu oluşturma hatası:', createVotesError);
        // Oluşturma hatası olsa bile devam et
      }
    }

    // Users koleksiyonunu kontrol et
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        console.log('Kullanıcı profil verisi oluşturuluyor...');
        
        try {
          // Temel kullanıcı verisi
          const userData = {
            username: currentUser.displayName?.toLowerCase().replace(/\s+/g, '') || 'kullanıcı',
            email: currentUser.email || '',
            fullName: currentUser.displayName || 'İsimsiz Kullanıcı',
            bio: 'Dijital sanat ve resim çizmeyi seviyorum. Yeni teknolojileri denemeyi ve yaratıcı işler üretmeyi seviyorum.',
            profileImage: currentUser.photoURL || 'https://picsum.photos/200',
            createdArtworks: 0,
            favoriteStyle: 'Empresyonizm',
          };
          
          await setDoc(userDocRef, userData);
          console.log('Kullanıcı profil verisi başarıyla oluşturuldu');
        } catch (userCreateError) {
          console.error('Kullanıcı profil verisi oluşturma hatası:', userCreateError);
          // Kullanıcı oluşturma hatası olsa bile devam et
        }
      } else {
        console.log('Kullanıcı profil verisi zaten mevcut');
      }
    } catch (userError) {
      console.error('Kullanıcı profil verisi kontrol hatası:', userError);
      // Kullanıcı kontrolü hatası olsa bile devam et
    }

    console.log('Firestore koleksiyonları kurulumu başarılı!');
    return true;
  } catch (error) {
    console.error('Firestore koleksiyonları kurulumu genel hatası:', error);
    return false;
  }
} 