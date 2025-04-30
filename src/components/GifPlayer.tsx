import React, { useState, useEffect } from 'react';
import { parseGIF, decompressFrames } from 'gifuct-js';
import GIF from 'gif.js';
import {
  InterpolationAlgorithm,
  createInterpolatedFrames,
  checkMemoryUsage,
  drawFrameOnCanvas,
  adjustFrameTiming
} from '../utils/gifInterpolation';
import { Box, Container, Paper, SelectChangeEvent } from '@mui/material';
import OriginalGif from './OriginalGif';
import ProcessedGif from './ProcessedGif';
import logger from '../utils/logger';

// Import UI components
import ConfirmDialog from './ConfirmDialog';
import SettingsPanel from './SettingsPanel';
import ProgressBar from './ProgressBar';

interface Frame {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  delay: number;
  disposalType?: number;
  left?: number;
  top?: number;
}

const GifPlayer: React.FC = () => {
  // Patch gif.js library to use willReadFrequently for all canvas operations
  useEffect(() => {
    const patchGifLibrary = () => {
      // Override Canvas.prototype.getContext to always use willReadFrequently for 2d contexts
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(
        this: HTMLCanvasElement,
        contextType: string, 
        contextAttributes?: any
      ) {
        if (contextType === '2d') {
          contextAttributes = contextAttributes || {};
          contextAttributes.willReadFrequently = true;
        }
        return originalGetContext.call(this, contextType, contextAttributes);
      } as typeof HTMLCanvasElement.prototype.getContext;
      logger.info('Canvas getContext patched to use willReadFrequently');
    };
    
    patchGifLibrary();
  }, []);

  const [originalGif, setOriginalGif] = useState<string | null>(null);
  const [interpolatedGif, setInterpolatedGif] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [totalFrames, setTotalFrames] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [algorithm, setAlgorithm] = useState<InterpolationAlgorithm>('linear');
  const [frameCount, setFrameCount] = useState<number>(1); // Number of frames to insert between each pair
  const [currentGif, setCurrentGif] = useState<string | null>(null); // For progressive display
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // For displaying error messages
  const [processingStage, setProcessingStage] = useState<string>(''); // Current processing stage
  const [currentFile, setCurrentFile] = useState<File | null>(null); // Store the currently selected file for delayed processing
  
  // Add GIF playback configuration state
  const [loopCount, setLoopCount] = useState<number | null>(0); // 0 means infinite loop
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1 is normal speed
  const [disposalMethod, setDisposalMethod] = useState<number>(2); // Default to restore to background color mode
  
  // 确认对话框状态
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmCallback, setConfirmCallback] = useState<() => void>(() => {});
  const [cancelCallback, setCancelCallback] = useState<() => void>(() => {});
  
  // 自定义确认函数
  const showConfirmDialog = (message: string, onConfirm: () => void, onCancel: () => void) => {
    setConfirmMessage(message);
    setConfirmCallback(() => onConfirm);
    setCancelCallback(() => onCancel);
    setShowConfirm(true);
  };
  
  // 处理确认
  const handleConfirm = () => {
    setShowConfirm(false);
    confirmCallback();
  };
  
  // 处理取消
  const handleCancel = () => {
    setShowConfirm(false);
    cancelCallback();
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    handleFileSelected(file);
  };

  const handleFileDropped = (file: File) => {
    handleFileSelected(file);
  };
  
  const handleFileSelected = (file: File) => {
    try {
      setErrorMessage(null);
      setCurrentProgress(0);
      setTotalFrames(0);
      setCurrentGif(null);
      setInterpolatedGif(null);
      
      // 保存文件以供稍后处理，但不立即开始处理
      setCurrentFile(file);
      
      // 直接设置原始GIF的URL，以便用户可以看到上传的文件
      const url = URL.createObjectURL(file);
      setOriginalGif(url);
      logger.info(`File selected: ${file.name}`, { size: file.size, type: file.type });
    } catch (error: any) {
      console.error('Error handling file:', error);
      setErrorMessage(`File processing error: ${error.message}`);
      logger.error(`Error handling file: ${error.message}`, error);
    }
  };

  // Start GIF processing
  const startGifProcessing = async () => {
    if (!currentFile) {
      alert('Please upload a GIF file first');
      logger.warning('Attempted to start processing without a file');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStage('Reading GIF file...');
      logger.info('Starting GIF processing', { fileName: currentFile.name, fileSize: currentFile.size });
      
      // Check file size
      if (currentFile.size > 20 * 1024 * 1024) { // More than 20MB
        logger.warning(`Large file detected: ${(currentFile.size / (1024 * 1024)).toFixed(2)}MB`);
        showConfirmDialog(
          'File is larger than 20MB. Processing may be very slow and consume a lot of memory. Do you want to continue?',
          async () => {
            // Continue processing
            logger.info('User confirmed processing large file');
            await continueProcessing(currentFile);
          },
          () => {
            // Cancel processing
            setIsProcessing(false);
            logger.info('User cancelled processing large file');
          }
        );
        return;
      }
      
      await continueProcessing(currentFile);
    } catch (error: any) {
      console.error('Error processing GIF:', error);
      setErrorMessage(`GIF processing error: ${error.message}`);
      logger.error(`Error processing GIF: ${error.message}`, error);
      alert('Error processing GIF. Please try another file.');
    } finally {
      setProcessingStage('');
      if (isProcessing) {
        setIsProcessing(false);
      }
    }
  };
  
  // Continue processing file
  const continueProcessing = async (file: File) => {
    try {
      // Read original GIF file
      logger.info('Reading GIF file...');
      const arrayBuffer = await file.arrayBuffer();
      const gifData = parseGIF(arrayBuffer);
      const frames = decompressFrames(gifData, true);
      logger.info(`GIF parsed successfully. Found ${frames.length} frames.`, {
        width: frames[0].dims.width,
        height: frames[0].dims.height
      });
      
      // Check frame count
      if (frames.length > 100) { // More than 100 frames
        logger.warning(`High frame count detected: ${frames.length} frames`);
        showConfirmDialog(
          `This GIF contains ${frames.length} frames. Processing may take a long time. Do you want to continue?`,
          async () => {
            // Continue processing the GIF
            setProcessingStage('Processing GIF...');
            logger.info('User confirmed processing high frame count GIF');
            await processGif(frames);
          },
          () => {
            // Cancel processing
            setIsProcessing(false);
            logger.info('User cancelled processing high frame count GIF');
          }
        );
        return;
      }
      
      setProcessingStage('Processing GIF...');
      
      // Start processing the GIF
      await processGif(frames);
    } catch (error: any) {
      console.error('Error in continueProcessing:', error);
      setErrorMessage(`GIF processing error: ${error.message}`);
      logger.error(`Error in continueProcessing: ${error.message}`, error);
      setIsProcessing(false);
    }
  };
  
  const processGif = async (gifFrames: any[]) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        logger.error('Failed to get canvas context');
        return;
      }
      
      // 设置canvas尺寸
      const { width, height } = gifFrames[0].dims;
      canvas.width = width;
      canvas.height = height;
      logger.info(`Processing GIF with dimensions: ${width}x${height}`);
      
      // 防止大型GIF爆内存
      const totalPixels = width * height;
      const totalFrames = gifFrames.length;
      
      if (totalPixels > 1000000 || (totalPixels > 500000 && totalFrames > 20)) {
        // Use custom confirmation dialog instead of confirm
        logger.warning(`Large GIF detected: ${width}x${height}, ${totalPixels} pixels, ${totalFrames} frames`);
        showConfirmDialog(
          `This GIF is quite large (${width}x${height}, ${totalFrames} frames). Processing may consume a lot of memory and slow down your browser. Do you want to continue?`,
          () => {
            // Continue processing
            logger.info('User confirmed processing large GIF');
            continueGifProcessing(gifFrames, width, height, totalFrames);
          },
          () => {
            // Cancel processing
            setIsProcessing(false);
            logger.info('User cancelled processing large GIF');
          }
        );
        return;
      }
      
      await continueGifProcessing(gifFrames, width, height, totalFrames);
    } catch (error: any) {
      console.error('Error in GIF processing:', error);
      logger.error(`Error in GIF processing: ${error.message}`, error);
      alert(`GIF processing error: ${error.message}`);
      setIsProcessing(false);
    }
  };
  
  // 继续GIF处理
  const continueGifProcessing = async (
    gifFrames: any[],
    width: number,
    height: number,
    totalFrames: number
  ) => {
    try {
      // 计算原始GIF的总时长
      let originalTotalDuration = 0;
      gifFrames.forEach(frame => {
        originalTotalDuration += frame.delay;
      });
      
      const processedFrames: Frame[] = [];
      // 计算总帧数：原始帧 + 插入的中间帧
      let estimatedTotalFrames = gifFrames.length;
      
      // 根据GIF尺寸调整每对帧之间的插入帧数
      let adjustedFrameCount = frameCount;
      if (width * height > 500000) { // 大于50万像素
        adjustedFrameCount = Math.max(1, Math.floor(frameCount * 0.5)); // 减少一半插帧
        logger.warning(`Large GIF detected, reducing interpolation frames from ${frameCount} to ${adjustedFrameCount}`);
      }
      
      // 修正总帧数估计
      estimatedTotalFrames += (gifFrames.length - 1) * adjustedFrameCount;
      setTotalFrames(estimatedTotalFrames);
      logger.info(`Estimated total frames after interpolation: ${estimatedTotalFrames}`);
      logger.info(`Using interpolation algorithm: ${algorithm}`);
      
      // 创建累积画布，用于处理disposal methods
      const cumulativeCanvas = document.createElement('canvas');
      const cumulativeCtx = cumulativeCanvas.getContext('2d', { willReadFrequently: true });
      if (!cumulativeCtx) {
        logger.error('Failed to get cumulative canvas context');
        return;
      }
      cumulativeCanvas.width = width;
      cumulativeCanvas.height = height;
      
      // 创建背景画布（用于恢复透明背景）
      const bgCanvas = document.createElement('canvas');
      const bgCtx = bgCanvas.getContext('2d', { willReadFrequently: true });
      if (!bgCtx) {
        logger.error('Failed to get background canvas context');
        return;
      }
      bgCanvas.width = width;
      bgCanvas.height = height;
      
      // 填充透明背景
      cumulativeCtx.clearRect(0, 0, width, height);
      
      // 监控内存使用
      let lastMemoryCheck = Date.now();
      const checkMemory = () => {
        if (Date.now() - lastMemoryCheck > 5000) { // 每5秒检查一次
          lastMemoryCheck = Date.now();
          if (checkMemoryUsage()) {
            logger.warning('High memory usage detected, trying to clean up...');
            
            // 尝试手动触发垃圾回收
            if (typeof window.gc === 'function') {
              try {
                window.gc();
                logger.debug('Manual garbage collection triggered');
              } catch (e) {
                // 忽略错误
                logger.debug('Failed to trigger manual garbage collection', e);
              }
            }
          }
        }
      };
      
      // 分批处理帧以避免内存问题
      const batchSize = 5; // 每批处理的帧对数
      const framePairs = gifFrames.length - 1;
      const batches = Math.ceil(framePairs / batchSize);
      logger.info(`Processing ${framePairs} frame pairs in ${batches} batches of ${batchSize}`);
      
      for (let batch = 0; batch < batches; batch++) {
        const startIdx = batch * batchSize;
        const endIdx = Math.min(startIdx + batchSize, framePairs);
        logger.debug(`Processing batch ${batch+1}/${batches}, frames ${startIdx} to ${endIdx}`);
        
        // 处理当前批次的帧对
        for (let i = startIdx; i < endIdx; i++) {
          try {
            const frame1 = gifFrames[i];
            const frame2 = gifFrames[i + 1];
            
            // 处理当前帧的disposal method
            const disposalType = frame1.disposalMethod;
            logger.debug(`Processing frame ${i}, disposal method: ${disposalType}`);
            
            // 保存背景（用于disposal type 2）
            if (i === 0 || disposalType === 2) {
              bgCtx.clearRect(0, 0, width, height);
              bgCtx.drawImage(cumulativeCanvas, 0, 0);
            }
            
            // 绘制当前帧到累积画布
            drawFrameOnCanvas(frame1, cumulativeCanvas, cumulativeCtx);
            
            // 获取完整的当前帧图像
            const imageData1 = cumulativeCtx.getImageData(0, 0, width, height);
            
            // 添加原始帧
            processedFrames.push({
              width,
              height,
              data: new Uint8ClampedArray(imageData1.data),
              delay: frame1.delay,
              disposalType,
              left: 0,
              top: 0
            });
            setCurrentProgress(processedFrames.length);
            
            // 保存当前累积画布状态（用于disposal type 3）
            const prevFrameCanvas = document.createElement('canvas');
            const prevFrameCtx = prevFrameCanvas.getContext('2d', { willReadFrequently: true });
            if (!prevFrameCtx) {
              logger.error('Failed to get previous frame canvas context');
              continue;
            }
            prevFrameCanvas.width = width;
            prevFrameCanvas.height = height;
            prevFrameCtx.drawImage(cumulativeCanvas, 0, 0);
            
            // 临时画布用于创建下一帧的状态（不影响累积画布）
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            if (!tempCtx) {
              logger.error('Failed to get temporary canvas context');
              continue;
            }
            tempCanvas.width = width;
            tempCanvas.height = height;
            
            // 复制当前累积状态到临时画布
            tempCtx.drawImage(cumulativeCanvas, 0, 0);
            
            // 根据disposal method处理累积画布
            if (disposalType === 2) { // 恢复背景色
              // 清除当前帧区域，恢复为透明
              cumulativeCtx.clearRect(
                frame1.dims.left, 
                frame1.dims.top, 
                frame1.dims.width, 
                frame1.dims.height
              );
              // 恢复原背景
              cumulativeCtx.drawImage(bgCanvas, 0, 0);
            } else if (disposalType === 3) { // 恢复到上一帧
              // 会在下一帧开始时处理
            }
            
            // 在临时画布上绘制下一帧
            drawFrameOnCanvas(frame2, tempCanvas, tempCtx);
            
            // 获取包含下一帧的完整图像
            const imageData2 = tempCtx.getImageData(0, 0, width, height);
            
            // 创建中间帧
            if (i < gifFrames.length - 1) {
              checkMemory(); // 检查内存使用
              
              // 设置超时保护
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Interpolation timeout')), 30000); // 30秒超时
              });
              
              try {
                logger.debug(`Creating interpolated frames between frame ${i} and ${i+1} using ${algorithm} algorithm`);
                // 同时跑超时保护和插值计算
                const interpolatedFrames = await Promise.race([
                  createInterpolatedFrames(
                    imageData1, 
                    imageData2, 
                    width, 
                    height, 
                    frame1.delay, 
                    frame2.delay,
                    algorithm,
                    adjustedFrameCount
                  ),
                  timeoutPromise
                ]) as Frame[];
                
                logger.debug(`Created ${interpolatedFrames.length} interpolated frames`);
                
                // 添加插值帧，保持与原始帧相同的disposal type
                for (const frame of interpolatedFrames) {
                  frame.disposalType = disposalType;
                  processedFrames.push(frame);
                  setCurrentProgress(processedFrames.length);
                }
              } catch (error: any) {
                logger.error(`Error during frame interpolation: ${error.message}`, error);
                console.error('Error during frame interpolation:', error);
                alert(`Interpolation error: ${error.message}. Skipping complex frame interpolation.`);
                
                // 出错时跳过插帧，直接进入下一帧
                continue;
              }
            }
            
            // 如果disposal method是恢复到上一帧，则恢复
            if (disposalType === 3 && prevFrameCtx) {
              cumulativeCtx.clearRect(0, 0, width, height);
              cumulativeCtx.drawImage(prevFrameCanvas, 0, 0);
            }
            
            // 定期更新预览
            if (processedFrames.length % 10 === 0 || processedFrames.length === estimatedTotalFrames) {
              await createIntermediatePreview(processedFrames, width, height);
            }
            
            // 让出主线程，避免UI阻塞
            await new Promise(resolve => setTimeout(resolve, 0));
            
          } catch (e: any) {
            logger.error(`Error processing frame: ${e.message}`, e);
            console.error('Error processing frame:', e);
            // 继续处理下一帧
          }
        }
      }
      
      // 添加最后一帧
      const lastFrame = gifFrames[gifFrames.length - 1];
      drawFrameOnCanvas(lastFrame, cumulativeCanvas, cumulativeCtx);
      const lastImageData = cumulativeCtx.getImageData(0, 0, width, height);
      
      processedFrames.push({
        width,
        height,
        data: new Uint8ClampedArray(lastImageData.data),
        delay: lastFrame.delay,
        disposalType: lastFrame.disposalMethod,
        left: 0,
        top: 0
      });
      setCurrentProgress(processedFrames.length);
      logger.info(`All frames processed. Total: ${processedFrames.length} frames`);
      
      // 调整每帧延迟时间，保持总时长一致
      adjustFrameTiming(processedFrames, originalTotalDuration, gifFrames);
      logger.info('Frame timing adjusted to maintain original duration');
      
      // 最终更新预览
      await createIntermediatePreview(processedFrames, width, height);
      
      // 最后创建完整GIF
      await createFinalGif(processedFrames, width, height);
    } catch (error: any) {
      logger.error(`Error in GIF processing: ${error.message}`, error);
      console.error('Error in GIF processing:', error);
      alert(`GIF processing error: ${error.message}`);
      setIsProcessing(false);
    }
  };
  
  // 创建中间预览
  const createIntermediatePreview = async (
    processedFrames: Frame[],
    width: number,
    height: number
  ) => {
    logger.debug(`Creating intermediate preview with ${Math.min(30, processedFrames.length)} frames`);
    // 最多使用前30帧创建预览，避免过大
    const previewFrames = processedFrames.slice(0, Math.min(30, processedFrames.length));
    
    // 创建临时GIF
    const tempGif = new GIF({
      workers: 1,
      quality: 5, // 降低临时GIF的质量以加快生成速度
      width,
      height,
      workerScript: '/static/js/gif.worker.js',
      transparent: 'rgba(0,0,0,0)',
      background: 'rgba(0,0,0,0)'
    });
    
    // 创建临时渲染画布
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = width;
    renderCanvas.height = height;
    const renderCtx = renderCanvas.getContext('2d', { willReadFrequently: true });
    if (!renderCtx) {
      logger.error('Failed to get preview render canvas context');
      return;
    }
    
    // 添加帧
    for (const frame of previewFrames) {
      renderCtx.clearRect(0, 0, width, height);
      const imgData = new ImageData(frame.data, width, height);
      renderCtx.putImageData(imgData, 0, 0);
      
      tempGif.addFrame(renderCanvas, { 
        delay: Math.max(100, frame.delay), // 预览时使用较慢的帧率
        copy: true,
        dispose: 2
      });
    }
    
    // 生成预览
    return new Promise<void>((resolve) => {
      tempGif.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        setCurrentGif(url);
        logger.info(`Intermediate preview created: ${(blob.size / 1024).toFixed(2)}KB`);
        resolve();
      });
      
      tempGif.render();
    });
  };
  
  // 创建最终GIF
  const createFinalGif = async (
    processedFrames: Frame[],
    width: number, 
    height: number
  ) => {
    logger.info('Creating final GIF...');
    
    // 创建新的GIF
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width,
      height,
      workerScript: '/static/js/gif.worker.js',
      transparent: 'rgba(0,0,0,0)',
      background: 'rgba(0,0,0,0)',
      repeat: loopCount === null ? 0 : loopCount, // 应用循环次数设置，null转为0表示无限循环
    });
    
    // 创建渲染画布
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = width;
    renderCanvas.height = height;
    const renderCtx = renderCanvas.getContext('2d', { willReadFrequently: true });
    if (!renderCtx) {
      logger.error('Failed to get final render canvas context');
      return;
    }
    
    // 分批添加帧到GIF
    const batchSize = 20; // 每批处理的帧数
    const batches = Math.ceil(processedFrames.length / batchSize);
    logger.info(`Adding ${processedFrames.length} frames to final GIF in ${batches} batches`);
    
    for (let batch = 0; batch < batches; batch++) {
      const startIdx = batch * batchSize;
      const endIdx = Math.min(startIdx + batchSize, processedFrames.length);
      logger.debug(`Adding frames ${startIdx} to ${endIdx-1} to GIF (batch ${batch+1}/${batches})`);
      
      for (let i = startIdx; i < endIdx; i++) {
        const frame = processedFrames[i];
        
        // 清除画布
        renderCtx.clearRect(0, 0, width, height);
        
        // 绘制当前帧
        const imgData = new ImageData(frame.data, width, height);
        renderCtx.putImageData(imgData, 0, 0);
        
        // 计算应用播放速度后的延迟时间
        const adjustedDelay = Math.round(frame.delay / playbackSpeed);
        
        // 添加到GIF
        try {
          gif.addFrame(renderCanvas, { 
            delay: adjustedDelay,
            copy: true,
            dispose: disposalMethod
          } as any);
        } catch (e: any) {
          logger.error(`Error adding frame ${i} to GIF: ${e.message}`, e);
        }
        
        // 每帧更新进度
        setCurrentProgress(totalFrames - processedFrames.length + i + 1);
      }
      
      // 让出主线程，避免阻塞UI
      if (batch < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    // 生成最终GIF
    return new Promise<void>((resolve, reject) => {
      gif.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        setInterpolatedGif(url);
        setCurrentGif(null); // 清除临时预览
        setIsProcessing(false);
        logger.info(`GIF generation completed! Size: ${(blob.size / 1024).toFixed(2)}KB, Frames: ${processedFrames.length}`);
        resolve();
      });
      
      (gif as any).on('progress', (p: number) => {
        const percent = Math.round(p * 100);
        logger.debug(`GIF generation progress: ${percent}%`);
      });
      
      (gif as any).on('error', (error: any) => {
        logger.error(`GIF generation error: ${error}`, error);
        reject(error);
      });
      
      logger.info('Starting final GIF render...');
      gif.render();
    });
  };
  
  const handleAlgorithmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAlgorithm = e.target.value as InterpolationAlgorithm;
    
    if (newAlgorithm === 'opticalflow') {
      alert('Optical flow algorithm is computationally intensive and may cause browser lag or crashes when processing large GIFs. We recommend testing on small GIFs first.');
      logger.warning('User selected optical flow algorithm, which may be resource-intensive');
    }
    
    logger.info(`Interpolation algorithm changed to: ${newAlgorithm}`);
    setAlgorithm(newAlgorithm);
  };
  
  const handleFrameCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = parseInt(e.target.value);
    if (!isNaN(count) && count >= 1 && count <= 10) {
      logger.info(`Frame count changed to: ${count}`);
      setFrameCount(count);
    }
  };
  
  // 添加播放配置处理函数
  const handleLoopCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const count = parseInt(e.target.value);
    logger.info(`Loop count changed to: ${count}`);
    setLoopCount(count); // 使用数字，在createFinalGif中处理类型转换
  };
  
  const handlePlaybackSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const speed = parseFloat(e.target.value);
    if (!isNaN(speed) && speed >= 0.25 && speed <= 2) {
      logger.info(`Playback speed changed to: ${speed}x`);
      setPlaybackSpeed(speed);
    }
  };
  
  const handleDisposalMethodChange = (e: SelectChangeEvent<number>) => {
    const method = e.target.value as number;
    logger.info(`Disposal method changed to: ${method}`);
    setDisposalMethod(method);
  };
  
  // 取消当前处理
  const handleCancelProcessing = () => {
    showConfirmDialog(
      'Are you sure you want to cancel the current processing?',
      () => {
        setIsProcessing(false);
        setCurrentGif(null);
        setProcessingStage('Canceling...');
        logger.info('User cancelled GIF processing');
      },
      () => {
        // 不做任何事情，继续处理
        logger.debug('User chose to continue processing');
      }
    );
  };
  
  return (
    <Container maxWidth="lg" sx={{ mb: 4 }}>
      <Paper 
        elevation={2} 
        sx={{ 
          p: { xs: 2, md: 3 }, 
          borderRadius: 2, 
          overflow: 'hidden' 
        }}
      >
        <Box sx={{ mb: 4 }}>
          <OriginalGif
            originalGif={originalGif}
            totalFrames={totalFrames}
            isProcessing={isProcessing}
            onFileChange={handleFileChange}
            onFileDropped={handleFileDropped}
          />
        </Box>
        
        <Box sx={{ mb: 4 }}>
          <SettingsPanel
            algorithm={algorithm}
            frameCount={frameCount}
            isProcessing={isProcessing}
            hasOriginalGif={!!originalGif}
            loopCount={loopCount}
            playbackSpeed={playbackSpeed}
            disposalMethod={disposalMethod}
            onAlgorithmChange={handleAlgorithmChange}
            onFrameCountChange={handleFrameCountChange}
            onLoopCountChange={handleLoopCountChange}
            onPlaybackSpeedChange={handlePlaybackSpeedChange}
            onStartProcessing={startGifProcessing}
            onDisposalMethodChange={handleDisposalMethodChange}
          />
        </Box>
        
        <ProgressBar
          current={currentProgress}
          total={totalFrames}
          stage={processingStage}
          isProcessing={isProcessing}
          onCancel={handleCancelProcessing}
        />
        
        <ProcessedGif
          interpolatedGif={interpolatedGif}
          currentGif={currentGif}
          currentProgress={currentProgress}
          totalFrames={totalFrames}
          isProcessing={isProcessing}
          algorithm={algorithm}
          frameCount={frameCount}
        />
        
        <ConfirmDialog
          show={showConfirm}
          message={confirmMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
        
        {errorMessage && (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              mt: 2, 
              bgcolor: 'error.light', 
              color: 'error.contrastText',
              borderRadius: 1 
            }}
          >
            {errorMessage}
          </Paper>
        )}
      </Paper>
    </Container>
  );
};

declare global {
  interface Window {
    gc?: () => void;
    performance?: {
      memory?: {
        usedJSHeapSize?: number;
        jsHeapSizeLimit?: number;
      };
    };
  }
}

export default GifPlayer; 