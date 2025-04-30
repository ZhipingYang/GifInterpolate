import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  Chip, 
  Button, 
  Paper,
  Stack
} from '@mui/material';
import { 
  CloudDownload as DownloadIcon, 
  Info as InfoIcon,
  Warning as WarningIcon,
  AspectRatio as AspectRatioIcon,
  Photo as PhotoIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Loop as LoopIcon,
  Palette as PaletteIcon,
  Layers as LayersIcon
} from '@mui/icons-material';
import { InterpolationAlgorithm } from '../utils/gifInterpolation';
import { GifMetadata, fetchGifMetadata } from '../utils/gifUtils';

interface ProcessedGifProps {
  interpolatedGif: string | null;
  currentGif: string | null;
  currentProgress: number;
  totalFrames: number;
  isProcessing: boolean;
  algorithm: InterpolationAlgorithm;
  frameCount: number;
}

const getAlgorithmLabel = (algo: InterpolationAlgorithm): string => {
  switch(algo) {
    case 'linear': return '线性插值 (基础)';
    case 'weighted': return '加权插值 (改进)';
    case 'bilinear': return '双线性插值 (平滑)';
    case 'motion': return '运动估计插值 (高级)';
    case 'opticalflow': return '光流插值 (最佳质量)';
    default: return algo;
  }
};

const ProcessedGif: React.FC<ProcessedGifProps> = ({
  interpolatedGif,
  currentGif,
  currentProgress,
  totalFrames,
  isProcessing,
  algorithm,
  frameCount
}) => {
  const [interpolatedMetadata, setInterpolatedMetadata] = useState<GifMetadata>({});

  useEffect(() => {
    if (interpolatedGif) {
      fetchGifMetadata(interpolatedGif, setInterpolatedMetadata);
    }
  }, [interpolatedGif]);

  if (!isProcessing && !interpolatedGif) {
    return null;
  }
  
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>
      <div style={{ flex: 1, minWidth: '300px', maxWidth: '500px' }}>
        <Card elevation={3}>
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main' }}>
              插帧后的GIF {isProcessing && 
                <Chip 
                  size="small" 
                  label="处理中..." 
                  color="primary" 
                  variant="outlined" 
                  sx={{ ml: 1, verticalAlign: 'middle' }} 
                />
              }
            </Typography>
            <Box sx={{ minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {isProcessing && currentGif && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    预览（处理中: {currentProgress}/{totalFrames}）
                  </Typography>
                  <Box 
                    component="img" 
                    src={currentGif} 
                    alt="Preview GIF" 
                    key={`preview-${currentProgress}`}
                    sx={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 1 }}
                  />
                </Box>
              )}
              
              {!isProcessing && interpolatedGif && (
                <Box sx={{ width: '100%' }}>
                  <Box 
                    component="img" 
                    src={interpolatedGif} 
                    alt="Interpolated GIF" 
                    key={interpolatedGif}
                    sx={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 1 }}
                  />
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<DownloadIcon />}
                      component="a"
                      href={interpolatedGif}
                      download={`interpolated_${algorithm}_${frameCount}x.gif`}
                      sx={{ textTransform: 'none' }}
                    >
                      下载GIF
                    </Button>
                    
                    {algorithm === 'opticalflow' && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                          <WarningIcon fontSize="small" sx={{ mr: 0.5 }} />
                          提示: 如果结果不理想，可以尝试其他算法，如运动估计插值或双线性插值
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </div>
      
      {interpolatedGif && (
        <div style={{ flex: 1, minWidth: '300px', maxWidth: '500px' }}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <InfoIcon sx={{ mr: 1 }} />
                处理后GIF信息
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: '1 0 40%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AspectRatioIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">尺寸:</Typography>
                    <Typography variant="body1">
                      {interpolatedMetadata.width || '?'} × {interpolatedMetadata.height || '?'} 像素
                    </Typography>
                  </Stack>
                </div>
                
                <div style={{ flex: '1 0 40%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <MemoryIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">文件大小:</Typography>
                    <Typography variant="body1">
                      {interpolatedMetadata.size || '未知'}
                    </Typography>
                  </Stack>
                </div>
              
                <div style={{ flex: '1 0 40%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PhotoIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">帧数:</Typography>
                    <Typography variant="body1">
                      {interpolatedMetadata.frameCount || '未知'} 帧
                    </Typography>
                  </Stack>
                </div>
                
                <div style={{ flex: '1 0 40%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SpeedIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">帧率:</Typography>
                    <Typography variant="body1">
                      {interpolatedMetadata.avgDelay ? (100 / interpolatedMetadata.avgDelay).toFixed(2) : '未知'} fps
                    </Typography>
                  </Stack>
                </div>
                
                <div style={{ flex: '1 0 40%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LayersIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">播放方式:</Typography>
                    <Typography variant="body1" sx={{ fontSize: '0.9rem' }}>
                      {interpolatedMetadata.playbackMode || '多帧动画，混合模式'}
                    </Typography>
                  </Stack>
                </div>
                
                <div style={{ flex: '1 0 40%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LoopIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">循环次数:</Typography>
                    <Typography variant="body1">
                      {interpolatedMetadata.loopCount === Infinity ? '无限循环' : 
                        interpolatedMetadata.loopCount ? `${interpolatedMetadata.loopCount} 次` : '1 次'}
                    </Typography>
                  </Stack>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                <Chip 
                  label={getAlgorithmLabel(algorithm)} 
                  color="primary" 
                  variant="outlined"
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Chip 
                  label={`每对原始帧间插入 ${frameCount} 帧`} 
                  color="secondary" 
                  variant="outlined"
                  size="small"
                  sx={{ mb: 1 }}
                />
              </div>
              
              <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom>
                  可能的应用:
                </Typography>
                <List dense disablePadding>
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="使运动更加平滑"
                      primaryTypographyProps={{ fontSize: '13px' }}
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="增加GIF播放时长"
                      primaryTypographyProps={{ fontSize: '13px' }}
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="减少闪烁效果"
                      primaryTypographyProps={{ fontSize: '13px' }}
                    />
                  </ListItem>
                </List>
              </Paper>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProcessedGif; 