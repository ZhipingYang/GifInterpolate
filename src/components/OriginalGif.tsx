import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  Stack,
  Container,
  Paper
} from '@mui/material';
import { 
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
import { GifMetadata, fetchGifMetadata } from '../utils/gifUtils';

interface OriginalGifProps {
  originalGif: string | null;
  totalFrames: number;
  isProcessing: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDropped: (file: File) => void;
}

const OriginalGif: React.FC<OriginalGifProps> = ({
  originalGif,
  totalFrames,
  isProcessing,
  onFileChange,
  onFileDropped
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [originalMetadata, setOriginalMetadata] = useState<GifMetadata>({});

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'image/gif') {
        onFileDropped(file);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // 获取GIF元数据
  useEffect(() => {
    if (originalGif) {
      fetchGifMetadata(originalGif, setOriginalMetadata);
    }
  }, [originalGif]);

  if (!originalGif) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <div style={{ maxWidth: '500px', width: '100%' }}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main' }}>
                原始GIF
              </Typography>
              <Box
                sx={{
                  border: isDragging ? '2px dashed #4caf50' : '2px dashed #ccc',
                  borderRadius: 1,
                  backgroundColor: isDragging ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
                  p: 1,
                  minHeight: '200px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleClick}
              >
                <Box sx={{ textAlign: 'center', color: '#666' }}>
                  <PhotoIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography>点击或拖拽GIF文件到此处</Typography>
                </Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".gif"
                  onChange={onFileChange}
                  disabled={isProcessing}
                  style={{ display: 'none' }}
                  title="Upload GIF"
                />
              </Box>
            </CardContent>
          </Card>
        </div>
      </Container>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '32px', justifyContent: 'center' }}>
      <div style={{ flex: '1 0 300px', maxWidth: '500px' }}>
        <Card elevation={3}>
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main' }}>
              原始GIF
            </Typography>
            <Box
              sx={{
                border: '2px solid #e0e0e0',
                borderRadius: 1,
                p: 1,
                minHeight: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                '&:hover .upload-overlay': {
                  opacity: 1
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClick}
            >
              <Box component="img" src={originalGif} alt="Original GIF" 
                sx={{ maxWidth: '100%', maxHeight: '300px', borderRadius: 1 }} />
              <input
                ref={fileInputRef}
                type="file"
                accept=".gif"
                onChange={onFileChange}
                disabled={isProcessing}
                style={{ display: 'none' }}
                title="Upload GIF"
              />
              <Box
                className="upload-overlay"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  opacity: 0,
                  transition: 'opacity 0.3s'
                }}
              >
                <Typography>点击或拖拽更换GIF</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </div>

      <div style={{ flex: '1 0 300px', maxWidth: '500px' }}>
        <Card elevation={3}>
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <InfoIcon sx={{ mr: 1 }} />
              GIF 信息
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: '1 0 40%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <AspectRatioIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">尺寸:</Typography>
                  <Typography variant="body1">
                    {originalMetadata.width || '?'} × {originalMetadata.height || '?'} 像素
                  </Typography>
                </Stack>
              </div>
              
              <div style={{ flex: '1 0 40%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <MemoryIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">文件大小:</Typography>
                  <Typography variant="body1">
                    {originalMetadata.size || '未知'}
                  </Typography>
                </Stack>
              </div>
            
              <div style={{ flex: '1 0 40%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PhotoIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">帧数:</Typography>
                  <Typography variant="body1">
                    {originalMetadata.frameCount || totalFrames > 0 ? totalFrames : '未知'} 帧
                  </Typography>
                </Stack>
              </div>
              
              <div style={{ flex: '1 0 40%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SpeedIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">帧率:</Typography>
                  <Typography variant="body1">
                    {originalMetadata.avgDelay ? (100 / originalMetadata.avgDelay).toFixed(2) : '未知'} fps
                  </Typography>
                </Stack>
              </div>
              
              <div style={{ flex: '1 0 40%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LayersIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">播放方式:</Typography>
                  <Typography variant="body1" sx={{ fontSize: '0.9rem' }}>
                    {originalMetadata.playbackMode || '多帧动画，混合模式'}
                  </Typography>
                </Stack>
              </div>
              
              <div style={{ flex: '1 0 40%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LoopIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">循环次数:</Typography>
                  <Typography variant="body1">
                    {originalMetadata.loopCount === Infinity ? '无限循环' : 
                      originalMetadata.loopCount ? `${originalMetadata.loopCount} 次` : '1 次'}
                  </Typography>
                </Stack>
              </div>
            
              <div style={{ flex: '1 0 40%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PaletteIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">颜色深度:</Typography>
                  <Typography variant="body1">
                    {originalMetadata.colorDepth ? `${originalMetadata.colorDepth} 位` : '未知'}
                  </Typography>
                </Stack>
              </div>
              
              <div style={{ flex: '1 0 40%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">透明处理:</Typography>
                  <Typography variant="body1">
                    {originalMetadata.hasTransparency ? '支持透明' : '不支持透明'}
                  </Typography>
                </Stack>
              </div>
            </div>
            
            <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon fontSize="small" color="warning" sx={{ mr: 1 }} />
                GIF 处理提示
              </Typography>
              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="对于复杂GIF，使用运动估计插值算法效果更好"
                    primaryTypographyProps={{ fontSize: '13px' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText 
                    primary={`${originalMetadata.hasTransparency ? '该GIF包含透明区域' : '该GIF不包含透明区域'}，${originalMetadata.hasTransparency ? '处理可能会影响透明度' : ''}`}
                    primaryTypographyProps={{ fontSize: '13px' }}
                  />
                </ListItem>
              </List>
            </Paper>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OriginalGif; 