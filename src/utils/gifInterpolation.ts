// GIF Interpolation Utilities
import logger from './logger';

interface Frame {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  delay: number;
  disposalType?: number;
  left?: number;
  top?: number;
}

// 插帧算法类型
export type InterpolationAlgorithm = 'linear' | 'weighted' | 'motion' | 'bilinear' | 'opticalflow';

// 光流算法
export const estimateOpticalFlow = async (data1: Uint8ClampedArray, data2: Uint8ClampedArray, width: number, height: number): Promise<any[]> => {
  logger.info('Starting optical flow estimation', { dimensions: `${width}x${height}` });
  
  // 对大图像进行下采样以加速
  const maxDim = 200;
  const scale = maxDim / Math.max(width, height);
  const scaledWidth = Math.floor(width * scale);
  const scaledHeight = Math.floor(height * scale);
  
  logger.debug('Downsampling images for optical flow', { 
    originalDimensions: `${width}x${height}`,
    scaledDimensions: `${scaledWidth}x${scaledHeight}`,
    scale
  });
  
  // 创建下采样后的图像数据
  const scaledData1 = new Uint8ClampedArray(scaledWidth * scaledHeight * 4);
  const scaledData2 = new Uint8ClampedArray(scaledWidth * scaledHeight * 4);
  
  // 简单下采样
  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      const origX = Math.floor(x / scale);
      const origY = Math.floor(y / scale);
      const origIdx = (origY * width + origX) * 4;
      const scaledIdx = (y * scaledWidth + x) * 4;
      
      scaledData1[scaledIdx] = data1[origIdx];
      scaledData1[scaledIdx + 1] = data1[origIdx + 1];
      scaledData1[scaledIdx + 2] = data1[origIdx + 2];
      scaledData1[scaledIdx + 3] = data1[origIdx + 3];
      
      scaledData2[scaledIdx] = data2[origIdx];
      scaledData2[scaledIdx + 1] = data2[origIdx + 1];
      scaledData2[scaledIdx + 2] = data2[origIdx + 2];
      scaledData2[scaledIdx + 3] = data2[origIdx + 3];
    }
  }
  
  logger.debug('Downsampling completed');
  
  // 计算光流
  const displacements: { x: number, y: number }[] = new Array(width * height);
  
  // 定义块尺寸和搜索范围
  const blockSize = Math.max(8, Math.floor(scaledWidth / 30));
  const searchRange = Math.max(4, blockSize / 2);
  
  // 使用网格进行计算，而不是计算每个像素
  const gridSpacing = Math.max(4, blockSize / 2);
  
  logger.debug('Optical flow parameters', { blockSize, searchRange, gridSpacing });
  
  // 计算网格上的光流
  const gridDisplacements: {x: number, y: number, sx: number, sy: number}[] = [];
  
  logger.debug('Starting grid-based flow calculation');
  
  for (let y = blockSize; y < scaledHeight - blockSize; y += gridSpacing) {
    for (let x = blockSize; x < scaledWidth - blockSize; x += gridSpacing) {
      // 如果透明区域，跳过
      const centerIdx = (y * scaledWidth + x) * 4;
      if (scaledData1[centerIdx + 3] < 10 || scaledData2[centerIdx + 3] < 10) {
        continue;
      }
      
      let bestMatchX = x;
      let bestMatchY = y;
      let minDiff = Number.MAX_VALUE;
      
      // 在搜索范围内查找最佳匹配
      for (let sy = Math.max(blockSize, y - searchRange); sy < Math.min(scaledHeight - blockSize, y + searchRange); sy++) {
        for (let sx = Math.max(blockSize, x - searchRange); sx < Math.min(scaledWidth - blockSize, x + searchRange); sx++) {
          let diff = 0;
          
          // 计算块差异
          for (let by = -blockSize / 2; by < blockSize / 2; by++) {
            for (let bx = -blockSize / 2; bx < blockSize / 2; bx++) {
              const frame1Idx = ((y + by) * scaledWidth + (x + bx)) * 4;
              const frame2Idx = ((sy + by) * scaledWidth + (sx + bx)) * 4;
              
              // 计算RGB差异，带透明度权重
              const alpha1 = scaledData1[frame1Idx + 3] / 255;
              const alpha2 = scaledData2[frame2Idx + 3] / 255;
              
              if (alpha1 > 0.2 && alpha2 > 0.2) {
                diff += Math.abs(scaledData1[frame1Idx] - scaledData2[frame2Idx]) * alpha1 * alpha2;
                diff += Math.abs(scaledData1[frame1Idx + 1] - scaledData2[frame2Idx + 1]) * alpha1 * alpha2;
                diff += Math.abs(scaledData1[frame1Idx + 2] - scaledData2[frame2Idx + 2]) * alpha1 * alpha2;
              }
            }
          }
          
          if (diff < minDiff) {
            minDiff = diff;
            bestMatchX = sx;
            bestMatchY = sy;
          }
        }
      }
      
      // 保存该点的位移向量
      const dx = bestMatchX - x;
      const dy = bestMatchY - y;
      
      // 只保存明显的运动
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        gridDisplacements.push({
          x: dx,
          y: dy,
          sx: x / scale, // 存储原始坐标
          sy: y / scale
        });
      }
      
      // 定期让出线程
      if (gridDisplacements.length % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }
  
  logger.debug(`Generated ${gridDisplacements.length} displacement vectors`);
  
  // 插值到原始分辨率
  logger.debug('Interpolating displacement vectors to full resolution');
  
  // 使用反向坐标映射，从目标图像到源图像
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      // 查找最近的网格点进行插值
      let totalWeight = 0;
      let weightedSumX = 0;
      let weightedSumY = 0;
      
      // 处理网格点的影响
      for (const gd of gridDisplacements) {
        const dist = Math.sqrt(Math.pow(x - gd.sx, 2) + Math.pow(y - gd.sy, 2));
        const radius = 20; // 影响半径
        
        // 如果在影响半径内
        if (dist < radius) {
          // 基于距离的权重
          const weight = Math.pow(1 - dist / radius, 2);
          totalWeight += weight;
          weightedSumX += gd.x * weight;
          weightedSumY += gd.y * weight;
        }
      }
      
      // 如果有足够的网格点影响
      if (totalWeight > 0.01) {
        displacements[idx] = {
          x: weightedSumX / totalWeight,
          y: weightedSumY / totalWeight
        };
      } else {
        // 没有足够的网格点影响，默认没有位移
        displacements[idx] = { x: 0, y: 0 };
      }
    }
  }
  
  logger.info('Optical flow estimation completed');
  return displacements;
};

// 线性插值算法（用于光流算法失败时的备选）
export const createLinearInterpolatedFrames = async (
  frame1: ImageData, 
  frame2: ImageData, 
  width: number, 
  height: number,
  delay1: number,
  delay2: number,
  frameCount: number
): Promise<Frame[]> => {
  logger.info('Creating linear interpolated frames', { 
    dimensions: `${width}x${height}`, 
    frameCount 
  });
  
  const frames: Frame[] = [];
  const data1 = frame1.data;
  const data2 = frame2.data;
  
  // 计算平均延迟
  const avgDelay = Math.floor((delay1 + delay2) / (frameCount + 1));
  logger.debug('Using average delay', { delay1, delay2, avgDelay });
  
  for (let f = 1; f <= frameCount; f++) {
    const ratio = f / (frameCount + 1);
    const newFrame = new ImageData(width, height);
    
    logger.debug(`Creating interpolated frame ${f}/${frameCount} with ratio ${ratio.toFixed(2)}`);
    
    for (let i = 0; i < data1.length; i += 4) {
      // 线性插值
      newFrame.data[i] = Math.round(data1[i] * (1 - ratio) + data2[i] * ratio);
      newFrame.data[i + 1] = Math.round(data1[i + 1] * (1 - ratio) + data2[i + 1] * ratio);
      newFrame.data[i + 2] = Math.round(data1[i + 2] * (1 - ratio) + data2[i + 2] * ratio);
      
      // 特殊处理透明度
      if (data1[i + 3] === 0 && data2[i + 3] === 0) {
        newFrame.data[i + 3] = 0;
      } else if (data1[i + 3] === 0) {
        newFrame.data[i] = data2[i];
        newFrame.data[i + 1] = data2[i + 1];
        newFrame.data[i + 2] = data2[i + 2];
        newFrame.data[i + 3] = Math.round(data2[i + 3] * ratio);
      } else if (data2[i + 3] === 0) {
        newFrame.data[i]     = data1[i];
        newFrame.data[i + 1] = data1[i + 1];
        newFrame.data[i + 2] = data1[i + 2];
        newFrame.data[i + 3] = Math.round(data1[i + 3] * (1 - ratio));
      } else {
        newFrame.data[i]     = Math.round(data1[i]     * (1 - ratio) + data2[i]     * ratio);
        newFrame.data[i + 1] = Math.round(data1[i + 1] * (1 - ratio) + data2[i + 1] * ratio);
        newFrame.data[i + 2] = Math.round(data1[i + 2] * (1 - ratio) + data2[i + 2] * ratio);
        newFrame.data[i + 3] = Math.round(data1[i + 3] * (1 - ratio) + data2[i + 3] * ratio);
      }
    }
    
    frames.push({
      width,
      height,
      data: newFrame.data,
      delay: avgDelay,
      left: 0,
      top: 0
    });
  }
  
  logger.info(`Created ${frames.length} linear interpolated frames`);
  return frames;
};

// 主要插帧函数
export const createInterpolatedFrames = async (
  frame1: ImageData, 
  frame2: ImageData, 
  width: number, 
  height: number,
  delay1: number,
  delay2: number,
  algorithm: InterpolationAlgorithm,
  frameCount: number
): Promise<Frame[]> => {
  logger.info(`Starting frame interpolation using ${algorithm} algorithm`, {
    dimensions: `${width}x${height}`,
    requestedFrameCount: frameCount
  });
  
  const frames: Frame[] = [];
  const data1 = frame1.data;
  const data2 = frame2.data;
  
  // 对于大尺寸GIF，限制帧数
  const maxPixels = 500000; // 500k像素阈值
  const pixels = width * height;
  
  let actualFrameCount = frameCount;
  if (pixels > maxPixels) {
    // 根据尺寸降低插帧数量
    const reductionFactor = Math.min(1, maxPixels / pixels);
    actualFrameCount = Math.max(1, Math.floor(frameCount * reductionFactor));
    if (actualFrameCount < frameCount) {
      logger.warning(`Image size ${width}x${height} (${pixels} pixels) is large, reducing frame count from ${frameCount} to ${actualFrameCount}`, {
        width,
        height,
        pixels,
        originalFrameCount: frameCount,
        reducedFrameCount: actualFrameCount,
        reductionFactor
      });
    }
  }
  
  // 计算平均延迟
  const avgDelay = Math.floor((delay1 + delay2) / (actualFrameCount + 1));
  logger.debug('Frame timing', { delay1, delay2, avgDelay });
  
  // 根据不同算法执行不同的处理逻辑
  switch (algorithm) {
    case 'opticalflow':
      // 光流算法
      try {
        // 显示状态更新
        logger.info('Computing optical flow...');
        
        // 计算光流场
        const displacements = await estimateOpticalFlow(data1, data2, width, height);
        
        logger.info('Creating interpolated frames with optical flow...');
        
        // 分批创建中间帧以避免UI阻塞
        for (let f = 1; f <= actualFrameCount; f++) {
          // 定期让出主线程
          if (f % 2 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          
          // 插值比例
          const ratio = f / (actualFrameCount + 1);
          logger.debug(`Creating optical flow frame ${f}/${actualFrameCount} at ratio ${ratio.toFixed(2)}`);
          
          // 创建新帧
          const newFrame = new ImageData(width, height);
          
          // 分批处理像素，避免一次性处理太多
          const batchSize = 10000;
          const totalPixels = width * height;
          const batches = Math.ceil(totalPixels / batchSize);
          logger.debug(`Processing in ${batches} batches of ${batchSize} pixels`);
          
          for (let batch = 0; batch < batches; batch++) {
            const startIdx = batch * batchSize;
            const endIdx = Math.min(startIdx + batchSize, totalPixels);
            
            for (let pixelIdx = startIdx; pixelIdx < endIdx; pixelIdx++) {
              const x = pixelIdx % width;
              const y = Math.floor(pixelIdx / width);
              const idx = pixelIdx * 4;
              
              // 获取该像素的位移向量
              const displacement = displacements[pixelIdx];
              
              if (!displacement) {
                // 安全处理，如果没有位移数据就使用原位置
                newFrame.data[idx] = data1[idx];
                newFrame.data[idx + 1] = data1[idx + 1];
                newFrame.data[idx + 2] = data1[idx + 2];
                newFrame.data[idx + 3] = data1[idx + 3];
                continue;
              }
              
              // 根据光流方向计算原始位置和目标位置
              const sourceX = Math.round(x - displacement.x * (1 - ratio));
              const sourceY = Math.round(y - displacement.y * (1 - ratio));
              const targetX = Math.round(x + displacement.x * ratio);
              const targetY = Math.round(y + displacement.y * ratio);
              
              // 确保坐标在图像范围内
              const validSourceX = Math.max(0, Math.min(width - 1, sourceX));
              const validSourceY = Math.max(0, Math.min(height - 1, sourceY));
              const validTargetX = Math.max(0, Math.min(width - 1, targetX));
              const validTargetY = Math.max(0, Math.min(height - 1, targetY));
              
              // 获取源和目标位置的像素值
              const sourceIdx = (validSourceY * width + validSourceX) * 4;
              const targetIdx = (validTargetY * width + validTargetX) * 4;
              
              // 特殊处理透明度
              if (data1[sourceIdx + 3] === 0 && data2[targetIdx + 3] === 0) {
                newFrame.data[idx] = 0;
                newFrame.data[idx + 1] = 0;
                newFrame.data[idx + 2] = 0;
                newFrame.data[idx + 3] = 0;
              } else if (data1[sourceIdx + 3] === 0) {
                newFrame.data[idx] = data2[targetIdx];
                newFrame.data[idx + 1] = data2[targetIdx + 1];
                newFrame.data[idx + 2] = data2[targetIdx + 2];
                newFrame.data[idx + 3] = Math.round(data2[targetIdx + 3] * ratio);
              } else if (data2[targetIdx + 3] === 0) {
                newFrame.data[idx] = data1[sourceIdx];
                newFrame.data[idx + 1] = data1[sourceIdx + 1];
                newFrame.data[idx + 2] = data1[sourceIdx + 2];
                newFrame.data[idx + 3] = Math.round(data1[sourceIdx + 3] * (1 - ratio));
              } else {
                // 带权重的混合
                newFrame.data[idx] = Math.round(data1[sourceIdx] * (1 - ratio) + data2[targetIdx] * ratio);
                newFrame.data[idx + 1] = Math.round(data1[sourceIdx + 1] * (1 - ratio) + data2[targetIdx + 1] * ratio);
                newFrame.data[idx + 2] = Math.round(data1[sourceIdx + 2] * (1 - ratio) + data2[targetIdx + 2] * ratio);
                newFrame.data[idx + 3] = Math.round(data1[sourceIdx + 3] * (1 - ratio) + data2[targetIdx + 3] * ratio);
              }
            }
            
            // 每批次后让出主线程
            if (batch < batches - 1) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
          
          frames.push({
            width,
            height,
            data: newFrame.data,
            delay: avgDelay,
            left: 0,
            top: 0
          });
          
          logger.debug(`Created optical flow frame ${f}/${actualFrameCount}`);
        }
        
        logger.info(`Completed optical flow interpolation with ${frames.length} frames`);
        
      } catch (error: any) {
        // 光流算法失败时回退到线性插值
        logger.error('Error in optical flow calculation - falling back to linear interpolation', {
          error: error.message,
          stack: error.stack
        });
        
        // 使用线性插值作为备选
        return await createLinearInterpolatedFrames(frame1, frame2, width, height, delay1, delay2, actualFrameCount);
      }
      break;
      
    case 'linear':
      // 线性插值
      logger.info('Using linear interpolation algorithm');
      for (let f = 1; f <= actualFrameCount; f++) {
        const ratio = f / (actualFrameCount + 1);
        logger.debug(`Creating linear frame ${f}/${actualFrameCount} at ratio ${ratio.toFixed(2)}`);
        
        const newFrame = new ImageData(width, height);
        
        // 分批处理以避免UI阻塞
        const batchSize = 50000;
        const totalPixels = data1.length / 4;
        const batches = Math.ceil(totalPixels / batchSize);
        
        for (let batch = 0; batch < batches; batch++) {
          const startIdx = batch * batchSize * 4;
          const endIdx = Math.min(startIdx + batchSize * 4, data1.length);
          
          for (let i = startIdx; i < endIdx; i += 4) {
            // 线性插值（简单平均）
            newFrame.data[i] = Math.round(data1[i] * (1 - ratio) + data2[i] * ratio);     // R
            newFrame.data[i + 1] = Math.round(data1[i + 1] * (1 - ratio) + data2[i + 1] * ratio); // G
            newFrame.data[i + 2] = Math.round(data1[i + 2] * (1 - ratio) + data2[i + 2] * ratio); // B
            
            // 特殊处理透明度，避免黑边
            if (data1[i + 3] === 0 && data2[i + 3] === 0) {
              newFrame.data[i + 3] = 0; // 两边都透明，保持透明
            } else if (data1[i + 3] === 0) {
              // 第一帧透明，第二帧不透明
              newFrame.data[i] = data2[i];
              newFrame.data[i + 1] = data2[i + 1];
              newFrame.data[i + 2] = data2[i + 2];
              newFrame.data[i + 3] = Math.round(data2[i + 3] * ratio);
            } else if (data2[i + 3] === 0) {
              // 第一帧不透明，第二帧透明
              newFrame.data[i] = data1[i];
              newFrame.data[i + 1] = data1[i + 1];
              newFrame.data[i + 2] = data1[i + 2];
              newFrame.data[i + 3] = Math.round(data1[i + 3] * (1 - ratio));
            } else {
              // 两帧都不透明
              newFrame.data[i]     = Math.round(data1[i]     * (1 - ratio) + data2[i]     * ratio);
              newFrame.data[i + 1] = Math.round(data1[i + 1] * (1 - ratio) + data2[i + 1] * ratio);
              newFrame.data[i + 2] = Math.round(data1[i + 2] * (1 - ratio) + data2[i + 2] * ratio);
              newFrame.data[i + 3] = Math.round(data1[i + 3] * (1 - ratio) + data2[i + 3] * ratio);
            }
          }
          
          // 每批次处理后让出主线程
          if (batch < batches - 1) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        frames.push({
          width,
          height,
          data: newFrame.data,
          delay: avgDelay,
          left: 0,
          top: 0
        });
      }
      
      logger.info(`Completed linear interpolation with ${frames.length} frames`);
      break;
      
    case 'weighted':
      // 加权插值（基于时间）
      logger.info('Using weighted interpolation algorithm');
      for (let f = 1; f <= actualFrameCount; f++) {
        const ratio = f / (actualFrameCount + 1);
        const newFrame = new ImageData(width, height);
        const timeRatio = delay1 / (delay1 + delay2);
        
        logger.debug(`Creating weighted frame ${f}/${actualFrameCount} with ratio ${ratio.toFixed(2)}, timeRatio ${timeRatio.toFixed(2)}`);
        
        // 分批处理
        const batchSize = 50000;
        const totalPixels = data1.length / 4;
        const batches = Math.ceil(totalPixels / batchSize);
        
        for (let batch = 0; batch < batches; batch++) {
          const startIdx = batch * batchSize * 4;
          const endIdx = Math.min(startIdx + batchSize * 4, data1.length);
          
          for (let i = startIdx; i < endIdx; i += 4) {
            const weight = (1 - ratio) * (1 - timeRatio) + ratio * timeRatio;
            
            // 特殊处理透明度，避免黑边
            if (data1[i + 3] === 0 && data2[i + 3] === 0) {
              newFrame.data[i] = 0;
              newFrame.data[i + 1] = 0;
              newFrame.data[i + 2] = 0;
              newFrame.data[i + 3] = 0;
            } else if (data1[i + 3] === 0) {
              newFrame.data[i] = data2[i];
              newFrame.data[i + 1] = data2[i + 1];
              newFrame.data[i + 2] = data2[i + 2];
              newFrame.data[i + 3] = Math.round(data2[i + 3] * weight);
            } else if (data2[i + 3] === 0) {
              newFrame.data[i] = data1[i];
              newFrame.data[i + 1] = data1[i + 1];
              newFrame.data[i + 2] = data1[i + 2];
              newFrame.data[i + 3] = Math.round(data1[i + 3] * (1 - weight));
            } else {
              newFrame.data[i] = Math.round(data1[i] * (1 - weight) + data2[i] * weight);
              newFrame.data[i + 1] = Math.round(data1[i + 1] * (1 - weight) + data2[i + 1] * weight);
              newFrame.data[i + 2] = Math.round(data1[i + 2] * (1 - weight) + data2[i + 2] * weight);
              newFrame.data[i + 3] = Math.round(data1[i + 3] * (1 - weight) + data2[i + 3] * weight);
            }
          }
          
          if (batch < batches - 1) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
        
        frames.push({
          width,
          height,
          data: newFrame.data,
          delay: avgDelay,
          left: 0,
          top: 0
        });
      }
      
      logger.info(`Completed weighted interpolation with ${frames.length} frames`);
      break;
      
    case 'bilinear':
      // 双线性插值
      logger.info('Using bilinear interpolation algorithm');
      for (let f = 1; f <= actualFrameCount; f++) {
        const ratio = f / (actualFrameCount + 1);
        const newFrame = new ImageData(width, height);
        
        logger.debug(`Creating bilinear frame ${f}/${actualFrameCount} with ratio ${ratio.toFixed(2)}`);
        
        // 分批处理像素
        for (let y = 0; y < height; y++) {
          // 每行处理后让出主线程
          if (y % 20 === 0 && y > 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            // 应用平滑函数，使过渡更自然
            const smoothRatio = 0.5 - 0.5 * Math.cos(ratio * Math.PI);
            
            // 特殊处理透明度
            if (data1[idx + 3] === 0 && data2[idx + 3] === 0) {
              newFrame.data[idx] = 0;
              newFrame.data[idx + 1] = 0;
              newFrame.data[idx + 2] = 0;
              newFrame.data[idx + 3] = 0;
            } else if (data1[idx + 3] === 0) {
              newFrame.data[idx] = data2[idx];
              newFrame.data[idx + 1] = data2[idx + 1];
              newFrame.data[idx + 2] = data2[idx + 2];
              newFrame.data[idx + 3] = Math.round(data2[idx + 3] * smoothRatio);
            } else if (data2[idx + 3] === 0) {
              newFrame.data[idx] = data1[idx];
              newFrame.data[idx + 1] = data1[idx + 1];
              newFrame.data[idx + 2] = data1[idx + 2];
              newFrame.data[idx + 3] = Math.round(data1[idx + 3] * (1 - smoothRatio));
            } else {
              newFrame.data[idx] = Math.round(data1[idx] * (1 - smoothRatio) + data2[idx] * smoothRatio);
              newFrame.data[idx+1] = Math.round(data1[idx+1] * (1 - smoothRatio) + data2[idx+1] * smoothRatio);
              newFrame.data[idx+2] = Math.round(data1[idx+2] * (1 - smoothRatio) + data2[idx+2] * smoothRatio);
              newFrame.data[idx+3] = Math.round(data1[idx+3] * (1 - smoothRatio) + data2[idx+3] * smoothRatio);
            }
          }
        }
        
        frames.push({
          width,
          height,
          data: newFrame.data,
          delay: avgDelay,
          left: 0,
          top: 0
        });
      }
      
      logger.info(`Completed bilinear interpolation with ${frames.length} frames`);
      break;
      
    case 'motion':
      // 简化的运动估计插值
      logger.info('Using motion estimation interpolation algorithm');
      for (let f = 1; f <= actualFrameCount; f++) {
        const ratio = f / (actualFrameCount + 1);
        const newFrame = new ImageData(width, height);
        
        logger.debug(`Creating motion estimation frame ${f}/${actualFrameCount} with ratio ${ratio.toFixed(2)}`);
        
        // 分批处理行
        for (let y = 0; y < height; y++) {
          // 每10行让出主线程
          if (y % 10 === 0 && y > 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
          
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            // 尝试检测像素移动方向（简化版）
            let bestMatch = idx;
            let minDiff = 255 * 4;
            
            // 在5x5区域内查找最匹配的像素
            const searchSize = 5;
            for (let sy = Math.max(0, y - searchSize); sy < Math.min(height, y + searchSize); sy++) {
              for (let sx = Math.max(0, x - searchSize); sx < Math.min(width, x + searchSize); sx++) {
                const searchIdx = (sy * width + sx) * 4;
                
                // 只在不透明像素间计算差异
                if (data1[idx + 3] > 0 && data2[searchIdx + 3] > 0) {
                  // 计算像素差异
                  const diff = Math.abs(data1[idx] - data2[searchIdx]) +
                              Math.abs(data1[idx+1] - data2[searchIdx+1]) +
                              Math.abs(data1[idx+2] - data2[searchIdx+2]);
                  
                  if (diff < minDiff) {
                    minDiff = diff;
                    bestMatch = searchIdx;
                  }
                }
              }
            }
            
            // 特殊处理透明度
            if (data1[idx + 3] === 0 && data2[bestMatch + 3] === 0) {
              newFrame.data[idx] = 0;
              newFrame.data[idx + 1] = 0;
              newFrame.data[idx + 2] = 0;
              newFrame.data[idx + 3] = 0;
            } else if (data1[idx + 3] === 0) {
              newFrame.data[idx] = data2[bestMatch];
              newFrame.data[idx + 1] = data2[bestMatch + 1];
              newFrame.data[idx + 2] = data2[bestMatch + 2];
              newFrame.data[idx + 3] = Math.round(data2[bestMatch + 3] * ratio);
            } else if (data2[bestMatch + 3] === 0) {
              newFrame.data[idx] = data1[idx];
              newFrame.data[idx + 1] = data1[idx + 1];
              newFrame.data[idx + 2] = data1[idx + 2];
              newFrame.data[idx + 3] = Math.round(data1[idx + 3] * (1 - ratio));
            } else {
              // 根据找到的运动方向进行插值
              newFrame.data[idx] = Math.round(data1[idx] * (1 - ratio) + data2[bestMatch] * ratio);
              newFrame.data[idx+1] = Math.round(data1[idx+1] * (1 - ratio) + data2[bestMatch+1] * ratio);
              newFrame.data[idx+2] = Math.round(data1[idx+2] * (1 - ratio) + data2[bestMatch+2] * ratio);
              newFrame.data[idx+3] = Math.round(data1[idx+3] * (1 - ratio) + data2[bestMatch+3] * ratio);
            }
          }
        }
        
        frames.push({
          width,
          height,
          data: newFrame.data,
          delay: avgDelay,
          left: 0,
          top: 0
        });
      }
      
      logger.info(`Completed motion estimation interpolation with ${frames.length} frames`);
      break;
  }
  
  return frames;
};

// 修复memory类型错误
// 将内存监控相关代码修改为安全的检查
export const checkMemoryUsage = (): boolean => {
  try {
    // @ts-ignore - 类型忽略，兼容不同浏览器
    if (performance && performance.memory && performance.memory.usedJSHeapSize) {
      // @ts-ignore
      const usedHeapSize = performance.memory.usedJSHeapSize / (1024 * 1024); // MB
      const maxHeapSize = 
        // @ts-ignore
        (performance.memory.jsHeapSizeLimit || 2048 * 1024 * 1024) / (1024 * 1024); // MB
      
      logger.debug(`Memory usage: ${usedHeapSize.toFixed(2)}MB / ${maxHeapSize.toFixed(2)}MB`);
      
      // 如果内存使用超过80%，警告
      if (usedHeapSize > maxHeapSize * 0.8) {
        logger.warning(`High memory usage detected: ${usedHeapSize.toFixed(2)}MB / ${maxHeapSize.toFixed(2)}MB (${Math.round(usedHeapSize/maxHeapSize*100)}%)`);
        return true;
      }
    }
  } catch (e: any) {
    logger.warning('Memory API not available', { error: e.message });
  }
  return false;
};

// Utility function for drawing a frame to canvas
export const drawFrameOnCanvas = (
  frame: any, 
  canvas: HTMLCanvasElement, 
  ctx: CanvasRenderingContext2D
) => {
  try {
    // 绘制当前帧到canvas
    const imgData = ctx.createImageData(frame.dims.width, frame.dims.height);
    imgData.data.set(frame.patch);
    ctx.putImageData(imgData, frame.dims.left, frame.dims.top);
  } catch (e: any) {
    logger.error(`Error drawing frame to canvas: ${e.message}`, {
      frameWidth: frame.dims?.width,
      frameHeight: frame.dims?.height,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      error: e.message
    });
  }
};

// 调整帧时间
export const adjustFrameTiming = (
  processedFrames: Frame[], 
  originalTotalDuration: number,
  originalFrames: any[]
) => {
  logger.info('Adjusting frame timing', {
    frameCount: processedFrames.length,
    originalTotalDuration
  });
  
  const newTotalFrames = processedFrames.length;
  const frameTimeRatio = originalTotalDuration / newTotalFrames;
  
  logger.debug('Frame timing calculations', {
    newTotalFrames,
    frameTimeRatio: frameTimeRatio.toFixed(2)
  });
  
  // 两种方案处理时间
  if (frameTimeRatio >= 20) {
    // 如果平均帧时间够长，平均分配
    const adjustedDelay = Math.max(20, Math.round(frameTimeRatio));
    logger.debug(`Using average distribution with ${adjustedDelay}ms per frame`);
    
    processedFrames.forEach(frame => {
      frame.delay = adjustedDelay;
    });
  } else {
    // 如果平均帧时间太短，保持原帧时间不变，缩短插值帧时间
    let remainingTime = originalTotalDuration;
    let originalFrameIndexes = [];
    
    // 找出原始帧的索引
    let originalIndex = 0;
    for (let i = 0; i < processedFrames.length; i++) {
      if (i === 0 || i === processedFrames.length - 1 || 
          (i - originalIndex) % (originalFrames.length + 1) === 0) {
        originalFrameIndexes.push(i);
        originalIndex = i;
      }
    }
    
    logger.debug(`Identified ${originalFrameIndexes.length} original frames at indexes: ${originalFrameIndexes.slice(0, 5).join(', ')}${originalFrameIndexes.length > 5 ? '...' : ''}`);
    
    // 设置原始帧的时间
    for (let i = 0; i < originalFrameIndexes.length; i++) {
      const frameIndex = originalFrameIndexes[i];
      const origTime = i < originalFrames.length ? originalFrames[i].delay : 0;
      processedFrames[frameIndex].delay = origTime;
      remainingTime -= origTime;
    }
    
    // 计算插值帧的平均时间
    const interpolatedFrameCount = processedFrames.length - originalFrameIndexes.length;
    const avgInterpolatedTime = interpolatedFrameCount > 0 ? 
      Math.max(10, Math.floor(remainingTime / interpolatedFrameCount)) : 0;
    
    logger.debug('Interpolated frame timing', {
      interpolatedFrameCount,
      remainingTime,
      avgInterpolatedTime
    });
    
    // 设置插值帧的时间
    for (let i = 0; i < processedFrames.length; i++) {
      if (!originalFrameIndexes.includes(i)) {
        processedFrames[i].delay = avgInterpolatedTime;
      }
    }
  }
  
  logger.info('Frame timing adjustment completed');
};

export default {
  estimateOpticalFlow,
  createLinearInterpolatedFrames,
  createInterpolatedFrames,
  checkMemoryUsage,
  drawFrameOnCanvas,
  adjustFrameTiming
}; 