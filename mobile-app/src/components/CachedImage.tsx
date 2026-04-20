import React, { useState, useEffect } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

interface CachedImageProps {
  uri: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch';
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

// Bitta joyga yig'uvchi keshlash papkasi
const CACHE_FOLDER = (FileSystem.cacheDirectory || FileSystem.documentDirectory || '') + 'images/';

export const CachedImage = ({ uri, style, resizeMode = 'cover', onLoadStart, onLoadEnd }: CachedImageProps) => {
  const [localUri, setLocalUri] = useState<string | null>(null);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchImage = async () => {
      try {
        if (!uri) return;
        
        // Agar bu BASE64 rasm bo'lsa, keshga tortib o'tirmaymiz (skip caching for data uris)
        if (uri.startsWith('data:')) {
            if (isMounted) setLocalUri(uri);
            return;
        }
        
        // Hashing / fayl ismini yaratish
        const filename = uri.split('/').pop()?.split('?')[0] || 'file.jpg';
        const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileUri = `${CACHE_FOLDER}${safeName}`;
        
        // Papka bormi tekshirish
        const folderInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
        if (!folderInfo.exists) {
          await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
        }
        
        // Agar fayl keshda bo'lsa uni ishlatamiz (OFFLINE FIRST ⚡)
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists && isMounted) {
          setLocalUri(fileUri);
          return;
        }
        
        // Yo'q bo'lsa orqa fonda serverdan tortamiz va keshga saqlaymiz
        if (onLoadStart) onLoadStart();
        const downloaded = await FileSystem.downloadAsync(uri, fileUri);
        
        if (isMounted) {
          setLocalUri(downloaded.uri);
          if (onLoadEnd) onLoadEnd();
        }
      } catch (error) {
        console.error("CachedImage error:", error);
        // Fallback qilib internetdagi o'zini berib yuboramiz
        if (isMounted) {
            setLocalUri(uri);
            if (onLoadEnd) onLoadEnd();
        }
      }
    };
    
    fetchImage();
    
    return () => {
      isMounted = false;
    };
  }, [uri]);

  if (!localUri) {
    return <Image source={{ uri }} style={style} resizeMode={resizeMode} onLoadStart={onLoadStart} onLoadEnd={onLoadEnd} />;
  }

  return (
    <Image source={{ uri: localUri }} style={style} resizeMode={resizeMode} onLoadStart={onLoadStart} onLoadEnd={onLoadEnd} />
  );
};
