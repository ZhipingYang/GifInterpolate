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
  AccessTime as AccessTimeIcon,
  Opacity as OpacityIcon,
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
                Original GIF
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
                  <Typography>Click or drag a GIF file here</Typography>
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '32px', justifyContent: 'center', alignItems: 'stretch' }}>
      <div style={{ flex: 2, minWidth: '300px' }}>
        <Card elevation={3} sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main' }}>
              Original GIF
            </Typography>
            <Box
              sx={{
                border: '2px solid #e0e0e0',
                borderRadius: 1,
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                '&:hover .upload-overlay': { opacity: 1 },
                maxHeight: '500px'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClick}
            >
              <Box component="img" src={originalGif} alt="Original GIF"
                sx={{ width: '100%', height: 'auto', maxHeight: '480px', objectFit: 'contain', borderRadius: 1 }}
              />
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
                <Typography>Click or drag to change GIF</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </div>

      <div style={{ flex: 1, minWidth: '300px' }}>
        <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
            <Typography variant="h6" component="h3" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <InfoIcon sx={{ mr: 1 }} /> GIF Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: '1 0 100%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <AspectRatioIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">Dimensions:</Typography>
                  <Typography variant="body1">{originalMetadata.width || '?'} × {originalMetadata.height || '?'} pixels</Typography>
                </Stack>
              </div>
              <div style={{ flex: '1 0 100%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <MemoryIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">File Size:</Typography>
                  <Typography variant="body1">{originalMetadata.size || 'Unknown'}</Typography>
                </Stack>
              </div>
              <div style={{ flex: '1 0 100%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PhotoIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">Frames:</Typography>
                  <Typography variant="body1">{originalMetadata.frameCount != null ? originalMetadata.frameCount : 'Unknown'} frames</Typography>
                </Stack>
              </div>
              <div style={{ flex: '1 0 100%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SpeedIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">Frame Rate:</Typography>
                  <Typography variant="body1">{originalMetadata.avgDelay != null ? (100/originalMetadata.avgDelay).toFixed(2) : 'Unknown'} fps</Typography>
                </Stack>
              </div>
              <div style={{ flex: '1 0 100%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <AccessTimeIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">Duration:</Typography>
                  <Typography variant="body1">{originalMetadata.duration != null ? `${originalMetadata.duration.toFixed(2)} s` : 'Unknown'}</Typography>
                </Stack>
              </div>
              <div style={{ flex: '1 0 100%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LayersIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">Playback Mode:</Typography>
                  <Typography variant="body1" sx={{ fontSize: '0.9rem' }}>{originalMetadata.playbackMode || 'Multi-frame animation, blend mode'}</Typography>
                </Stack>
              </div>
              <div style={{ flex: '1 0 100%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LoopIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">Loop Count:</Typography>
                  <Typography variant="body1">{originalMetadata.loopCount === Infinity ? 'Infinite loop' : originalMetadata.loopCount ? `${originalMetadata.loopCount} times` : '1 time'}</Typography>
                </Stack>
              </div>
              <div style={{ flex: '1 0 100%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PaletteIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">Color Depth:</Typography>
                  <Typography variant="body1">{originalMetadata.colorDepth ? `${originalMetadata.colorDepth} bit` : 'Unknown'}</Typography>
                </Stack>
              </div>
              <div style={{ flex: '1 0 100%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <OpacityIcon color="primary" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">Transparency:</Typography>
                  <Typography variant="body1">{originalMetadata.hasTransparency ? 'Supports transparency' : 'No transparency'}</Typography>
                </Stack>
              </div>
            </div>
            <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon fontSize="small" color="warning" sx={{ mr: 1 }} /> GIF Processing Tips
              </Typography>
              <List dense disablePadding>
                <ListItem disableGutters>
                  <ListItemText primary="For complex GIFs, motion estimation interpolation algorithm works better" primaryTypographyProps={{ fontSize: '13px' }} />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText primary={`${originalMetadata.hasTransparency ? 'This GIF contains transparent areas' : 'This GIF has no transparent areas'}${originalMetadata.hasTransparency ? ', processing may affect transparency' : ''}`} primaryTypographyProps={{ fontSize: '13px' }} />
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