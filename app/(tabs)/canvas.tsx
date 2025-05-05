import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  PanResponder,
  Dimensions,
  Platform,
  LayoutChangeEvent,
  GestureResponderEvent,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Ionicons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import { ref, set } from 'firebase/database';
import { rtdb, auth } from '../firebase';

interface Point {
  x: number;
  y: number;
}

interface Path {
  points: Point[];
  color: string;
  strokeWidth: number;
  type: 'freehand' | 'square' | 'circle' | 'triangle' | 'line';
  id: string; // Benzersiz kimlik ekledim
}

interface SavedDrawing {
  id: string;
  userId: string;
  imageData: string; // base64 formatında resim verisi
  title: string;
  createdAt: number;
}

type ToolType = 'pen' | 'square' | 'circle' | 'triangle' | 'line' | 'eraser';

export default function CanvasScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const canvasRef = useRef<View>(null);
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const canvasLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const startPoint = useRef<Point | null>(null);
  const isDrawing = useRef(false);
  const pathsRef = useRef<Path[]>([]);
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const [lastDrawTime, setLastDrawTime] = useState(0);
  const [canvasScale, setCanvasScale] = useState(1.0);
  const [tuvalHeight, setTuvalHeight] = useState(Dimensions.get('window').height * 0.6);
  const [isSaving, setIsSaving] = useState(false);
  const [drawingTitle, setDrawingTitle] = useState('');

  // pathsRef'i güncellemek için useEffect
  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  // Debug için koordinat bilgilerini logla (Mobil sorunları tespit için)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      console.log('Canvas Layout:', canvasLayout.current);
    }
  }, [canvasInitialized]);

  const colors = [
    '#000000', // Siyah
    '#FF0000', // Kırmızı
    '#0000FF', // Mavi
    '#00FF00', // Yeşil
    '#FFFF00', // Sarı
    '#FFA500', // Turuncu
    '#800080', // Mor
    Colors.primary, // Tema ana rengi
    Colors.accent  // Tema vurgu rengi
  ];

  const brushSizes = [2, 5, 10, 15, 20];

  const tools: Array<{ type: ToolType; icon: string; iconType: 'MaterialCommunityIcons' | 'Ionicons' | 'FontAwesome5' | 'AntDesign' }> = [
    { type: 'pen', icon: 'pencil', iconType: 'MaterialCommunityIcons' },
    { type: 'line', icon: 'minus', iconType: 'FontAwesome5' },
    { type: 'square', icon: 'square-outline', iconType: 'Ionicons' },
    { type: 'circle', icon: 'ellipse-outline', iconType: 'Ionicons' },
    { type: 'triangle', icon: 'triangle-outline', iconType: 'Ionicons' },
    { type: 'eraser', icon: 'eraser', iconType: 'MaterialCommunityIcons' }
  ];

  // Rastgele benzersiz id oluşturucu
  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const clearCanvas = useCallback(() => {
    setPaths([]);
  }, []);

  const undoLastPath = useCallback(() => {
    if (paths.length > 0) {
      setPaths(prevPaths => prevPaths.slice(0, -1));
    }
  }, [paths.length]);

  const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    canvasLayout.current = { x, y, width, height };
    console.log('Canvas onLayout:', { x, y, width, height });
    setCanvasInitialized(true);
  }, []);

  // Mobil için daha iyi çizim kalitesi - daha az nokta
  const smoothLine = useCallback((point1: Point, point2: Point): Point[] => {
    const distance = Math.sqrt(
      Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2)
    );
    
    // Noktalar çok yakınsa, sadece ikinci noktayı döndür
    if (distance < 4) return [point2];
    
    const points: Point[] = [];
    
    // Platform bazlı nokta sayısı optimizasyonu
    const maxSteps = Platform.OS === 'web' ? 4 : 2;
    const stepSize = Platform.OS === 'web' ? 8 : 12;
    
    const steps = Math.min(Math.floor(distance / stepSize), maxSteps);
    
    for (let i = 1; i <= steps; i++) {
      const t = i / (steps + 1);
      points.push({
        x: point1.x + (point2.x - point1.x) * t,
        y: point1.y + (point2.y - point1.y) * t
      });
    }
    
    points.push(point2);
    return points;
  }, []);

  const renderSegment = useCallback((start: Point, end: Point, color: string, width: number, key: string) => {
    const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
    const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    
    if (distance < 1) return null; // Çok kısa segmentleri atla
    
    return (
      <View
        key={key}
        style={{
          position: 'absolute',
          left: start.x,
          top: start.y,
          width: distance,
          height: width,
          backgroundColor: color,
          transform: [
            { rotate: `${angle}deg` },
            { translateX: 0 },
            { translateY: -width / 2 }
          ],
          borderRadius: width / 2,
        }}
      />
    );
  }, []);

  const renderShape = useCallback((path: Path, key: string) => {
    if (path.points.length < 2) return null;
    
    const { points, color, strokeWidth, type } = path;
    const start = points[0];
    const end = points[points.length - 1];
    
    const left = Math.min(start.x, end.x);
    const top = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    
    if (width < 1 || height < 1) return null;
    
    switch (type) {
      case 'square':
        return (
          <View
            key={key}
            style={{
              position: 'absolute',
              left: left,
              top: top,
              width: width,
              height: height,
              borderWidth: strokeWidth,
              borderColor: color,
              backgroundColor: 'transparent',
            }}
          />
        );
      case 'circle':
        return (
          <View
            key={key}
            style={{
              position: 'absolute',
              left: left,
              top: top,
              width: width,
              height: height,
              borderRadius: Math.max(width, height) / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              backgroundColor: 'transparent',
            }}
          />
        );
      case 'triangle':
        // Kare gibi basit üçgen
        return (
          <View
            key={key}
            style={{
              position: 'absolute',
              left: left,
              top: top,
              width: width,
              height: height,
            }}
          >
            {/* Alt çizgi */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: width,
                height: strokeWidth,
                backgroundColor: color,
              }}
            />
            
            {/* Sol çizgi */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: strokeWidth,
                height: height,
                backgroundColor: color,
              }}
            />
            
            {/* Çapraz çizgi */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: Math.sqrt(width*width + height*height),
                height: strokeWidth,
                backgroundColor: color,
                transformOrigin: 'left top',
                transform: [
                  { rotate: `${Math.atan2(height, width) * (180 / Math.PI)}deg` }
                ]
              }}
            />
          </View>
        );
      case 'line':
        // İlk basılan noktadan harekete doğru uzanan çizgi
        return renderSegment(start, end, color, strokeWidth, key);
      default:
        return null;
    }
  }, [renderSegment]);
  
  const renderPath = useCallback((path: Path, key: number | string) => {
    const { type } = path;
    
    // Şekiller için özel render fonksiyonu
    if (type !== 'freehand') {
      return renderShape(path, `shape-${path.id || key}`);
    }
    
    // Serbest çizim için segment render
    const segments = [];
    const { points, color, strokeWidth } = path;
    
    if (points.length < 2) return null;
    
    for (let i = 1; i < points.length; i++) {
      const start = points[i - 1];
      const end = points[i];
      
      segments.push(
        renderSegment(start, end, color, strokeWidth, `segment-${path.id || key}-${i}`)
      );
    }
    
    return segments;
  }, [renderSegment, renderShape]);

  const renderPaths = useCallback(() => {
    return (
      <>
        {paths.map((path, index) => renderPath(path, index))}
        {currentPath.length > 1 && renderPath({ 
          points: currentPath, 
          color: currentColor, 
          strokeWidth: brushSize,
          type: currentTool === 'eraser' ? 'freehand' : currentTool === 'pen' ? 'freehand' : currentTool,
          id: 'current'
        }, 'current')}
      </>
    );
  }, [paths, currentPath, currentColor, brushSize, currentTool, renderPath]);

  // Silgi fonksiyonu - kalem gibi basılan yerleri silecek şekilde basitleştirildi
  const eraseNearPoint = useCallback((point: Point) => {
    if (!point) return;
    
    // Silgi etkili alanı - silgi boyutu
    const eraserRadius = brushSize * 2;
    
    setPaths(prevPaths => {
      return prevPaths.filter(path => {
        // Şekil tipine göre kontrol
        if (path.type !== 'freehand') {
          // Şekil noktalarının hiçbiri silgiye değmiyorsa, şekli koru
          return !path.points.some(pathPoint => {
            const distance = Math.sqrt(
              Math.pow(pathPoint.x - point.x, 2) + Math.pow(pathPoint.y - point.y, 2)
            );
            return distance < eraserRadius;
          });
        } else {
          // Freehand çizimler için, silgiye yakın olan noktaları temizle
          const updatedPoints = path.points.filter(pathPoint => {
            const distance = Math.sqrt(
              Math.pow(pathPoint.x - point.x, 2) + Math.pow(pathPoint.y - point.y, 2)
            );
            return distance >= eraserRadius; // Silgi çapından uzak noktaları tut
          });
          
          // Eğer yeterli nokta kaldıysa, güncelle
          if (updatedPoints.length > 1) {
            path.points = updatedPoints;
            return true;
          }
          // Az sayıda nokta kaldıysa, bu yolu kaldır
          return false;
        }
      });
    });
  }, [brushSize]);

  // Mobil hassasiyeti için koordinat hesaplama
  const getCanvasCoordinates = useCallback((evt: GestureResponderEvent) => {
    const { nativeEvent } = evt;
    
    if (Platform.OS === 'web') {
      return { x: nativeEvent.locationX, y: nativeEvent.locationY };
    } else {
      try {
        const { pageX, pageY } = nativeEvent;
        
        if (!canvasRef.current) return null;
        
        const canvasX = canvasLayout.current.x || 0;
        const canvasY = canvasLayout.current.y || 0;
        
        // Daha hassas mobil offset hesaplaması
        const offsetY = 60;
        const offsetX = 0; // Yatay offset gerekirse
        
        const x = pageX - canvasX + offsetX;
        const y = pageY - canvasY - offsetY;
        
        // Canvas içinde mi kontrolü
        const isInsideCanvas = 
          x >= 0 && 
          y >= 0 && 
          x <= canvasLayout.current.width && 
          y <= canvasLayout.current.height;
          
        if (isInsideCanvas) {
          return { x, y };
        } 
        return null;
      } catch (error) {
        console.error('Koordinat hatası:', error);
        return null;
      }
    }
  }, []);

  // PanResponder - Çizgi çekme ve silgi iyileştirmeleri
  const panResponder = React.useMemo(() => PanResponder.create({
    // Dokunuşları yakalamak için
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    
    // Dokunuş başlangıcı
    onPanResponderGrant: (evt) => {
      const point = getCanvasCoordinates(evt);
      if (!point) return;
      
      // Çizim başlatıldı
      isDrawing.current = true;
      startPoint.current = point;
      
      // Silgiyse silmeye başla, değilse çizime başla
      if (currentTool === 'eraser') {
        eraseNearPoint(point);
        // Silgi izi göster
        setCurrentPath([point]);
      } else {
        setCurrentPath([point]);
      }
    },
    
    // Dokunuş hareketi
    onPanResponderMove: (evt, gestureState) => {
      if (!isDrawing.current || !startPoint.current) return;
      
      // Performans için throttling
      const now = Date.now();
      const throttleTime = Platform.OS === 'web' ? 16 : 48; // Web: 60fps, Mobil: ~20fps
      if (now - lastDrawTime < throttleTime) return;
      setLastDrawTime(now);
      
      const point = getCanvasCoordinates(evt);
      if (!point) return;
      
      if (currentTool === 'eraser') {
        // Silgi için işlem
        eraseNearPoint(point);
        setCurrentPath(prevPath => [...prevPath, point]);
      } 
      else if (currentTool === 'pen') {
        // Kalem için işlem - optimizasyon
        const skipFactor = Platform.OS === 'web' ? 1 : 3;
        const smoothPoints = smoothLine(startPoint.current, point);
        const pointsToAdd = smoothPoints.filter((_, i) => i % skipFactor === 0 || i === smoothPoints.length - 1);
        
        setCurrentPath(prevPoints => [...prevPoints, ...pointsToAdd]);
        startPoint.current = point;
      } 
      else {
        // Tüm şekiller için başlangıç-bitiş modeli
        setCurrentPath([startPoint.current, point]);
      }
    },
    
    // Dokunuş sonu
    onPanResponderRelease: (evt) => {
      if (!isDrawing.current) return;
      
      isDrawing.current = false;
      
      if (currentTool === 'eraser') {
        // Silgi izi temizle
        setCurrentPath([]);
        startPoint.current = null;
        return;
      }
      
      // Diğer araçlar için yolu ekle
      if (currentPath.length > 1) {
        const newPath: Path = {
          points: [...currentPath],
          color: currentColor,
          strokeWidth: brushSize,
          type: currentTool === 'pen' ? 'freehand' : currentTool,
          id: generateUniqueId()
        };
        
        // Yeni yolu ekle
        setPaths(prevPaths => [...prevPaths, newPath]);
        
        // Geçici çizim temizle
        setCurrentPath([]);
      }
      
      startPoint.current = null;
    },
    
    // İptal
    onPanResponderTerminate: () => {
      isDrawing.current = false;
      startPoint.current = null;
      setCurrentPath([]);
    }
  }), [
    currentTool, 
    currentColor, 
    brushSize, 
    currentPath, 
    getCanvasCoordinates, 
    smoothLine, 
    eraseNearPoint,
    lastDrawTime
  ]);

  // Tuvalin boyutunu ayarlama kontrolleri
  const zoomIn = useCallback(() => {
    if (canvasScale < 2.0) {
      setCanvasScale(prev => prev + 0.1);
      setTuvalHeight(prev => prev * 1.1);
    }
  }, [canvasScale]);

  const zoomOut = useCallback(() => {
    if (canvasScale > 0.5) {
      setCanvasScale(prev => prev - 0.1);
      setTuvalHeight(prev => prev / 1.1);
    }
  }, [canvasScale]);

  // Çizimi Base64 formatında kaydetme fonksiyonu
  const saveCanvasAsBase64 = async () => {
    if (!canvasRef.current) {
      Alert.alert('Hata', 'Canvas referansı bulunamadı.');
      return null;
    }

    try {
      // Canvas'ı görüntü olarak yakala
      const uri = await captureRef(canvasRef, {
        format: 'png',
        quality: 0.8,
      });

      // Görüntüyü base64'e dönüştür
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return `data:image/png;base64,${base64Data}`;
    } catch (error) {
      console.error('Canvas görüntü yakalama hatası:', error);
      Alert.alert('Hata', 'Çizim kaydedilemedi. Lütfen tekrar deneyin.');
      return null;
    }
  };

  // Çizimi Firebase'e kaydetme fonksiyonu
  const saveDrawingToFirebase = async () => {
    // Kullanıcı giriş yapmış mı kontrol et
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Oturum Hatası', 'Çizim kaydetmek için giriş yapmalısınız.');
      return;
    }

    // Eğer resim boş ise uyarı ver
    if (paths.length === 0) {
      Alert.alert('Uyarı', 'Kaydedilecek bir çizim bulunamadı. Lütfen önce bir şeyler çizin.');
      return;
    }

    try {
      setIsSaving(true);

      // Çizimi base64 olarak al
      const imageData = await saveCanvasAsBase64();
      if (!imageData) {
        setIsSaving(false);
        return;
      }

      // Çizim için otomatik başlık oluştur (isteğe bağlı olarak kullanıcıdan alınabilir)
      const drawingTitle = `Çizim_${new Date().toLocaleDateString()}`;

      // Yeni bir çizim verisi oluştur
      const newDrawing: SavedDrawing = {
        id: generateUniqueId(),
        userId: currentUser.uid,
        imageData: imageData,
        title: drawingTitle,
        createdAt: Date.now()
      };

      // Realtime Database'de referans oluştur
      const drawingRef = ref(rtdb, `drawings/${currentUser.uid}/${newDrawing.id}`);
      
      // Veriyi kaydet
      await set(drawingRef, newDrawing);

      Alert.alert('Başarılı', 'Çiziminiz başarıyla kaydedildi. Profil sayfanızdan görüntüleyebilirsiniz.');
      
      // İsteğe bağlı olarak canvas'ı temizle
      // clearCanvas();
    } catch (error) {
      console.error('Firebase kayıt hatası:', error);
      Alert.alert('Hata', 'Çizim kaydedilemedi. Lütfen tekrar deneyin.');
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
          Tuval
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={zoomIn} style={styles.headerButton}>
            <AntDesign name="plus" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={zoomOut} style={styles.headerButton}>
            <AntDesign name="minus" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={undoLastPath} style={styles.headerButton}>
            <Ionicons name="arrow-undo" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={clearCanvas} style={styles.headerButton}>
            <MaterialCommunityIcons name="delete-sweep" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={saveDrawingToFirebase}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <Ionicons name="save-outline" size={22} color={Colors.primary} />
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View 
        ref={canvasRef}
        style={[
          styles.canvas, 
          {
            backgroundColor: '#FFFFFF', // Tuval her zaman beyaz
            shadowColor: isDark ? '#1A202C' : '#000',
            height: tuvalHeight,
            transform: [{ scale: canvasScale }],
          }
        ]}
        onLayout={handleCanvasLayout}
        {...panResponder.panHandlers}
      >
        {renderPaths()}
        {paths.length === 0 && currentPath.length === 0 && (
          <View style={styles.emptyCanvasOverlay}>
            <MaterialCommunityIcons 
              name="gesture-swipe" 
              size={40} 
              color="rgba(0,0,0,0.1)" 
            />
            <Text style={[
              styles.emptyCanvasText,
              {color: 'rgba(0,0,0,0.3)'}
            ]}>
              Çizmeye başlamak için ekrana dokun
            </Text>
          </View>
        )}
      </View>

      <View style={styles.toolsContainer}>
        {/* Çizim Araçları */}
        <View style={styles.toolsHeader}>
          <Text style={[
            styles.toolsTitle,
            {color: isDark ? Colors.dark.text : Colors.light.text}
          ]}>
            Araçlar
          </Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.toolsScroll}
          contentContainerStyle={styles.toolsScrollContent}
        >
          {tools.map((tool, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.toolOption,
                currentTool === tool.type && styles.selectedTool
              ]}
              onPress={() => setCurrentTool(tool.type)}
            >
              {tool.iconType === 'MaterialCommunityIcons' && (
                <MaterialCommunityIcons name={tool.icon as any} size={22} color={currentTool === tool.type ? Colors.primary : '#555'} />
              )}
              {tool.iconType === 'Ionicons' && (
                <Ionicons name={tool.icon as any} size={22} color={currentTool === tool.type ? Colors.primary : '#555'} />
              )}
              {tool.iconType === 'FontAwesome5' && (
                <FontAwesome5 name={tool.icon as any} size={20} color={currentTool === tool.type ? Colors.primary : '#555'} />
              )}
              {tool.iconType === 'AntDesign' && (
                <AntDesign name={tool.icon as any} size={22} color={currentTool === tool.type ? Colors.primary : '#555'} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Renkler */}
        <View style={styles.toolsHeader}>
          <Text style={[
            styles.toolsTitle,
            {color: isDark ? Colors.dark.text : Colors.light.text}
          ]}>
            Renkler
          </Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.colorsContainer}
          contentContainerStyle={styles.colorsContentContainer}
        >
          {colors.map((color, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                currentColor === color && styles.selectedColor
              ]}
              onPress={() => setCurrentColor(color)}
            />
          ))}
        </ScrollView>

        {/* Fırça Boyutu */}
        <View style={styles.toolsHeader}>
          <Text style={[
            styles.toolsTitle,
            {color: isDark ? Colors.dark.text : Colors.light.text}
          ]}>
            Fırça Boyutu
          </Text>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.brushContainer}
          contentContainerStyle={styles.brushContentContainer}
        >
          {brushSizes.map((size, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.brushOption,
                brushSize === size && styles.selectedBrush
              ]}
              onPress={() => setBrushSize(size)}
            >
              <View style={[
                styles.brushPreview, 
                { 
                  width: size * 2, 
                  height: size * 2, 
                  backgroundColor: currentColor 
                }
              ]} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    marginLeft: 8,
  },
  canvas: {
    flex: 1,
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyCanvasOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCanvasText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  toolsContainer: {
    paddingBottom: 15,
  },
  toolsHeader: {
    paddingHorizontal: 20,
    marginBottom: 5,
    marginTop: 10,
  },
  toolsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  toolsScroll: {
    paddingHorizontal: 10,
  },
  toolsScrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  toolOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(240,240,240,0.5)',
  },
  selectedTool: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    transform: [{ scale: 1.1 }],
  },
  colorsContainer: {
    paddingHorizontal: 10,
  },
  colorsContentContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: Colors.primary,
    transform: [{ scale: 1.1 }],
  },
  brushContainer: {
    paddingHorizontal: 10,
  },
  brushContentContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  brushOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectedBrush: {
    borderWidth: 2,
    borderColor: Colors.primary,
    transform: [{ scale: 1.1 }],
  },
  brushPreview: {
    borderRadius: 10,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
}); 