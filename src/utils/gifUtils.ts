import React from 'react';
import { parseGIF, decompressFrames } from 'gifuct-js';

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
    case 0: return 'Not specified';
    case 1: return 'No disposal (Keep)';
    case 2: return 'Restore background';
    case 3: return 'Restore previous frame';
    default: return 'Unknown';
  }
};

export const fetchGifMetadata = async (gifUrl: string, setMetadata: React.Dispatch<React.SetStateAction<GifMetadata>>) => {
  try {
    const response = await fetch(gifUrl);
    const blob = await response.blob();
    const size = formatFileSize(blob.size);

    // 更新文件大小
    setMetadata(prev => ({ ...prev, size }));

    // 获取基本尺寸
    const img = new Image();
    img.onload = () => {
      setMetadata(prev => ({ ...prev, width: img.width, height: img.height }));
    };
    img.src = gifUrl;

    // 使用 gifuct-js 精确解析帧
    const arrayBuffer = await blob.arrayBuffer();
    const gif = parseGIF(arrayBuffer);
    const frames = decompressFrames(gif, true);
    const accurateFrameCount = frames.length;
    // 计算基于 decompressFrames 的平均延迟（单位：1/100秒）
    const totalDelay = frames.reduce((sum, f) => sum + (f.delay || 0), 0);
    const fallbackAvgDelay = accurateFrameCount > 0 ? totalDelay / accurateFrameCount : 0;
    // 使用 parseGifFrameData 提取的 avgDelay（如果可用），否则使用 fallback
    const simpleDataForDelay = parseGifFrameData(arrayBuffer);
    const avgDelay = simpleDataForDelay?.avgDelay ?? fallbackAvgDelay;
    // 计算一次循环的总时长（秒）：使用解析出的 avgDelay 和准确帧数
    const duration = accurateFrameCount > 0 ? (avgDelay * accurateFrameCount) / 100 : 0;

    // 使用 parseGifFrameData 提取循环等信息作为补充
    const simpleData = simpleDataForDelay; // reuse parsed data
    const loopCount = simpleData?.loopCount ?? 1;
    const colorDepth = simpleData?.colorDepth;
    const backgroundColorIndex = simpleData?.backgroundColorIndex;

    // 提取每帧的处理方式，若不存在则回退到 simpleData 中的首个值
    const disposalMethods = frames.map(f =>
      f.disposalType != null
        ? f.disposalType
        : simpleData?.disposalMethods?.[0] ?? 0
    );

    // 检查透明度
    const hasTransparency = frames.some(f =>
      (f.patch as Uint8ClampedArray).some((v, idx) => (idx + 1) % 4 === 0 && v < 255)
    );

    // 确定播放模式
    let playbackMode = 'Single-frame static image';
    if (accurateFrameCount > 1) {
      const uniqueD = Array.from(new Set(disposalMethods));
      if (uniqueD.includes(2)) playbackMode = 'Multi-frame animation, background restore mode';
      else if (uniqueD.includes(1)) playbackMode = 'Multi-frame animation, blend mode';
      else if (uniqueD.includes(3)) playbackMode = 'Multi-frame animation, previous frame restore mode';
      else playbackMode = 'Multi-frame animation, unspecified mode';
    }

    // 更新完整元数据
    setMetadata(prev => ({
      ...prev,
      frameCount: accurateFrameCount,
      avgDelay,
      duration,
      hasTransparency,
      disposalMethods,
      loopCount,
      colorDepth,
      backgroundColorIndex,
      playbackMode
    }));
  } catch (error) {
    console.error('Error fetching GIF metadata:', error);
  }
}; 