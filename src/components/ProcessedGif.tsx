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
    case 'linear': return 'Linear Interpolation (Basic)';
    case 'weighted': return 'Weighted Interpolation (Improved)';
    case 'bilinear': return 'Bilinear Interpolation (Smooth)';
    case 'motion': return 'Motion Estimation (Advanced)';
    case 'opticalflow': return 'Optical Flow (Best Quality)';
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
    // Clear old metadata and fetch new metadata when the generated GIF URL updates
    if (interpolatedGif) {
      setInterpolatedMetadata({});
      fetchGifMetadata(interpolatedGif, setInterpolatedMetadata);
    }
  }, [interpolatedGif]);

  if (!isProcessing && !interpolatedGif) {
    return null;
  }
  
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', alignItems: 'stretch' }}>
      <div style={{ flex: 2, minWidth: '300px' }}>
        <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, p: 2 }}>
            <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 'medium', color: 'primary.main' }}>
              Interpolated GIF {isProcessing && 
                <Chip 
                  size="small" 
                  label="Processing..." 
                  color="primary" 
                  variant="outlined" 
                  sx={{ ml: 1, verticalAlign: 'middle' }} 
                />
              }
            </Typography>
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isProcessing && currentGif && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Preview (Processing: {currentProgress}/{totalFrames})
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
                      maxHeight: '500px'
                    }}
                  >
                    <Box 
                      component="img" 
                      src={currentGif} 
                      alt="Preview GIF" 
                      key={`preview-${currentProgress}`}
                      sx={{ width: '100%', height: 'auto', maxHeight: '480px', objectFit: 'contain', borderRadius: 1 }}
                    />
                  </Box>
                </Box>
              )}
              
              {!isProcessing && interpolatedGif && (
                <Box sx={{ width: '100%' }}>
                  <Box 
                    sx={{
                      border: '2px solid #e0e0e0',
                      borderRadius: 1,
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      maxHeight: '500px'
                    }}
                  >
                    <Box 
                      component="img" 
                      src={interpolatedGif} 
                      alt="Interpolated GIF" 
                      key={interpolatedGif}
                      sx={{ width: '100%', height: 'auto', maxHeight: '480px', objectFit: 'contain', borderRadius: 1 }}
                    />
                  </Box>
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
                      Download GIF
                    </Button>
                    
                    {algorithm === 'opticalflow' && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                          <WarningIcon fontSize="small" sx={{ mr: 0.5 }} />
                          Tip: If the result is not ideal, try other algorithms such as motion estimation or bilinear interpolation
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
        <div style={{ flex: 1, minWidth: '300px' }}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <InfoIcon sx={{ mr: 1 }} />
                Processed GIF Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div style={{ flex: '1 0 100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AspectRatioIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Dimensions:</Typography>
                    <Typography variant="body1">
                      {interpolatedMetadata.width || '?'} × {interpolatedMetadata.height || '?'} pixels
                    </Typography>
                  </Stack>
                </div>
                
                <div style={{ flex: '1 0 100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <MemoryIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">File Size:</Typography>
                    <Typography variant="body1">
                      {interpolatedMetadata.size || 'Unknown'}
                    </Typography>
                  </Stack>
                </div>
                
                <div style={{ flex: '1 0 100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PhotoIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Frames:</Typography>
                    <Typography variant="body1">
                      {interpolatedMetadata.frameCount || 'Unknown'} frames
                    </Typography>
                  </Stack>
                </div>
                
                <div style={{ flex: '1 0 100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <SpeedIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Frame Rate:</Typography>
                    <Typography variant="body1">
                      {interpolatedMetadata.avgDelay ? (100 / interpolatedMetadata.avgDelay).toFixed(2) : 'Unknown'} fps
                    </Typography>
                  </Stack>
                </div>
                
                <div style={{ flex: '1 0 100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AccessTimeIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Duration:</Typography>
                    <Typography variant="body1">
                      {interpolatedMetadata.duration != null
                        ? `${interpolatedMetadata.duration.toFixed(2)} s`
                        : 'Unknown'}
                    </Typography>
                  </Stack>
                </div>
                
                <div style={{ flex: '1 0 100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LayersIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Playback Mode:</Typography>
                    <Typography variant="body1" sx={{ fontSize: '0.9rem' }}>
                      {interpolatedMetadata.playbackMode || 'Multi-frame animation, blend mode'}
                    </Typography>
                  </Stack>
                </div>
                
                <div style={{ flex: '1 0 100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LoopIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Loop Count:</Typography>
                    <Typography variant="body1">
                      {interpolatedMetadata.loopCount === Infinity ? 'Infinite loop' : 
                        interpolatedMetadata.loopCount ? `${interpolatedMetadata.loopCount} times` : '1 time'}
                    </Typography>
                  </Stack>
                </div>
                
                <div style={{ flex: '1 0 100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PaletteIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Color Depth:</Typography>
                    <Typography variant="body1">
                      {interpolatedMetadata.colorDepth ? `${interpolatedMetadata.colorDepth} bit` : 'Unknown'}
                    </Typography>
                  </Stack>
                </div>
                
                <div style={{ flex: '1 0 100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <OpacityIcon color="primary" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Transparency:</Typography>
                    <Typography variant="body1">
                      {interpolatedMetadata.hasTransparency ? 'Supports transparency' : 'No transparency'}
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
                  label={`Inserted ${frameCount} frames between each original frame pair`} 
                  color="secondary" 
                  variant="outlined"
                  size="small"
                  sx={{ mb: 1 }}
                />
              </div>
              
              <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Potential Applications:
                </Typography>
                <List dense disablePadding>
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="Smoother motion"
                      primaryTypographyProps={{ fontSize: '13px' }}
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="Increased GIF playback duration"
                      primaryTypographyProps={{ fontSize: '13px' }}
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText 
                      primary="Reduced flickering effects"
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