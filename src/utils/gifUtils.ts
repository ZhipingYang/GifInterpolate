import React from 'react';

export interface GifMetadata {
  width?: number;
  height?: number;
  frameCount?: number;
  duration?: number;
  avgDelay?: number;
  disposalMethods?: number[];
  hasTransparency?: boolean;
  loopCount?: number;
  colorDepth?: number;
  backgroundColorIndex?: number;
  size?: string;
  playbackMode?: string;
}

// GIF解析工具函数
export const parseGifFrameData = (buffer: ArrayBuffer): { 
  frameCount: number, 
  avgDelay: number, 
  hasTransparency: boolean,
  disposalMethods: number[],
  loopCount: number,
  colorDepth: number,
  backgroundColorIndex: number
} | null => {
  try {
    const view = new DataView(buffer);
    
    // 检查GIF头部标识 ("GIF")
    const signature = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2));
    if (signature !== 'GIF') {
      return null;
    }
    
    // 获取基本信息
    const backgroundColorIndex = view.getUint8(11);
    const packedField = view.getUint8(10);
    const globalColorTableSize = packedField & 0x07;
    const colorDepth = ((packedField & 0x70) >> 4) + 1;
    
    let pos = 13; // 跳过 GIF 头部和逻辑屏幕描述符
    if (globalColorTableSize > 0) {
      pos += 3 * Math.pow(2, globalColorTableSize + 1); // 跳过全局颜色表
    }
    
    let frameCount = 0;
    let totalDelay = 0;
    let hasTransparency = false;
    let loopCount = 1; // 默认循环一次
    const disposalMethods: number[] = [];
    
    // 开始解析帧
    while (pos < buffer.byteLength) {
      const blockType = view.getUint8(pos);
      
      if (blockType === 0x21) { // 扩展块
        const extensionType = view.getUint8(pos + 1);
        
        if (extensionType === 0xF9) { // 图形控制扩展
          const packedField = view.getUint8(pos + 3);
          const transparentFlag = (packedField & 0x01) === 1;
          if (transparentFlag) {
            hasTransparency = true;
          }
          
          // 获取处理方式
          const disposalMethod = (packedField & 0x1C) >> 2;
          disposalMethods.push(disposalMethod);
          
          // 获取延迟时间（单位：1/100秒）
          const delay = view.getUint16(pos + 4, true);
          totalDelay += delay;
          frameCount++;
          
          // 跳过扩展块
          pos += 8;
        } else if (extensionType === 0xFF) { // 应用程序扩展
          pos += 2;
          let blockSize = view.getUint8(pos);
          if (blockSize === 11) { // NETSCAPE2.0 循环块
            pos += blockSize + 1;
            if (pos + 2 < buffer.byteLength) {
              const subBlockSize = view.getUint8(pos);
              if (subBlockSize === 3 && view.getUint8(pos + 1) === 1) {
                loopCount = view.getUint16(pos + 2, true);
                if (loopCount === 0) {
                  loopCount = Infinity; // 0表示无限循环
                }
              }
            }
            
            // 跳过子块结束标记
            while (pos < buffer.byteLength && view.getUint8(pos) !== 0) {
              pos += view.getUint8(pos) + 1;
            }
            pos++;
          } else {
            // 跳过其他应用程序扩展
            while (blockSize !== 0) {
              pos += blockSize + 1;
              blockSize = view.getUint8(pos);
            }
            pos++;
          }
        } else {
          // 跳过其他扩展块
          pos += 2;
          let blockSize = view.getUint8(pos);
          while (blockSize !== 0) {
            pos += blockSize + 1;
            blockSize = view.getUint8(pos);
          }
          pos++;
        }
      } else if (blockType === 0x2C) { // 图像描述符
        // 跳过图像描述符
        pos += 10;
        const localColorTableFlag = (view.getUint8(pos - 9) & 0x80) >>> 7;
        const localColorTableSize = view.getUint8(pos - 9) & 0x07;
        
        if (localColorTableFlag === 1) {
          pos += 3 * Math.pow(2, localColorTableSize + 1);
        }
        
        // 跳过LZW最小码长度
        pos++;
        
        // 跳过图像数据块
        let blockSize = view.getUint8(pos);
        while (blockSize !== 0) {
          pos += blockSize + 1;
          blockSize = view.getUint8(pos);
        }
        pos++;
      } else if (blockType === 0x3B) { // 文件终结器
        break;
      } else {
        // 未知的块类型，尝试往前移动
        pos++;
      }
    }
    
    return {
      frameCount,
      avgDelay: frameCount > 0 ? totalDelay / frameCount : 0,
      hasTransparency,
      disposalMethods,
      loopCount,
      colorDepth,
      backgroundColorIndex
    };
  } catch (error) {
    console.error('Error parsing GIF frame data:', error);
    return null;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  else return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

export const getDisposalMethodDescription = (method?: number): string => {
  switch(method) {
    case 0: return '未指定';
    case 1: return '不处理 (保留)';
    case 2: return '还原背景';
    case 3: return '还原上一帧';
    default: return '未知';
  }
};

export const fetchGifMetadata = async (gifUrl: string, setMetadata: React.Dispatch<React.SetStateAction<GifMetadata>>) => {
  try {
    const response = await fetch(gifUrl);
    const blob = await response.blob();
    const size = formatFileSize(blob.size);
    
    // 基本尺寸信息
    const img = new Image();
    img.onload = () => {
      setMetadata(prev => ({
        ...prev,
        width: img.width,
        height: img.height,
        size
      }));
    };
    img.src = gifUrl;
    
    // 使用 gifuct-js 方法提取更详细的 GIF 信息
    // 这里只是一个基础实现，建议使用实际的 GIF 解析库
    const arrayBuffer = await blob.arrayBuffer();
    const frameData = parseGifFrameData(arrayBuffer);
    
    if (frameData) {
      const { 
        frameCount, 
        avgDelay, 
        hasTransparency, 
        disposalMethods, 
        loopCount, 
        colorDepth, 
        backgroundColorIndex 
      } = frameData;
      
      // 根据帧数和处理方式确定播放模式
      let playbackMode = "单帧静态图像";
      if (frameCount > 1) {
        // 检查是否所有帧都使用相同的处理方式
        const uniqueDisposalMethods = Array.from(new Set(disposalMethods || []));
        if (uniqueDisposalMethods.includes(2)) {
          playbackMode = "多帧动画，背景恢复模式";
        } else if (uniqueDisposalMethods.includes(1)) {
          playbackMode = "多帧动画，混合模式";
        } else if (uniqueDisposalMethods.includes(3)) {
          playbackMode = "多帧动画，上一帧恢复模式";
        } else {
          playbackMode = "多帧动画，未指定模式";
        }
      }
      
      setMetadata(prev => ({
        ...prev,
        frameCount,
        avgDelay,
        hasTransparency,
        disposalMethods,
        loopCount,
        colorDepth,
        backgroundColorIndex,
        playbackMode
      }));
    }
  } catch (error) {
    console.error('Error fetching GIF metadata:', error);
  }
}; 