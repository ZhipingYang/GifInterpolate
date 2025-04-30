import React from 'react';
import { 
  Box, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Typography, 
  Slider, 
  Button, 
  Alert,
  Stack,
  SelectChangeEvent
} from '@mui/material';
import { PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { InterpolationAlgorithm } from '../utils/gifInterpolation';

interface SettingsPanelProps {
  algorithm: InterpolationAlgorithm;
  frameCount: number;
  isProcessing: boolean;
  hasOriginalGif: boolean;
  loopCount: number | null;
  playbackSpeed: number;
  disposalMethod: number;
  onAlgorithmChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFrameCountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoopCountChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onPlaybackSpeedChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDisposalMethodChange: (e: SelectChangeEvent<number>) => void;
  onStartProcessing: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  algorithm,
  frameCount,
  isProcessing,
  hasOriginalGif,
  loopCount,
  playbackSpeed,
  disposalMethod,
  onAlgorithmChange,
  onFrameCountChange,
  onLoopCountChange,
  onPlaybackSpeedChange,
  onDisposalMethodChange,
  onStartProcessing
}) => {
  // Convert onFrameCountChange to work with Slider
  const handleFrameCountChange = (event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    const syntheticEvent = {
      target: { value: value.toString() }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onFrameCountChange(syntheticEvent);
  };

  // Convert onPlaybackSpeedChange to work with Slider
  const handlePlaybackSpeedChange = (event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    const syntheticEvent = {
      target: { value: value.toString() }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onPlaybackSpeedChange(syntheticEvent);
  };

  return (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 0.5 }}>
          Interpolation Settings
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Horizontal layout for selects */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            {/* Algorithm selection */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel id="algorithm-label">Algorithm</InputLabel>
                <Select
                  labelId="algorithm-label"
                  id="algorithm"
                  value={algorithm}
                  label="Algorithm"
                  onChange={onAlgorithmChange as any}
                  disabled={isProcessing}
                >
                  <MenuItem value="linear">Linear Interpolation (Fast)</MenuItem>
                  <MenuItem value="weighted">Weighted Interpolation (Balanced)</MenuItem>
                  <MenuItem value="bilinear">Bilinear Interpolation (Smooth)</MenuItem>
                  <MenuItem value="motion">Motion Estimation (Better)</MenuItem>
                  <MenuItem value="opticalflow">Optical Flow (Advanced, may be slow)</MenuItem>
                </Select>
              </FormControl>
              
              {algorithm === 'opticalflow' && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Note: Optical flow algorithm is computationally intensive and may be slow for large GIFs
                </Alert>
              )}
            </Box>
            
            {/* Frame disposal method selection */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <FormControl fullWidth variant="outlined" size="small">
                <InputLabel id="disposal-method-label">Frame Disposal Method</InputLabel>
                <Select
                  labelId="disposal-method-label"
                  id="disposal-method"
                  value={disposalMethod}
                  label="Frame Disposal Method"
                  onChange={onDisposalMethodChange}
                  disabled={isProcessing}
                >
                  <MenuItem value={1}>Keep Previous Frame (Cumulative)</MenuItem>
                  <MenuItem value={2}>Restore Background (Standard)</MenuItem>
                  <MenuItem value={3}>Restore to Previous Frame (For Transparent Animations)</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Controls how canvas is handled after each frame is displayed
              </Typography>
            </Box>
          </Box>
          
          {/* Horizontal layout for sliders */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            {/* Frames to insert slider */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography id="frame-count-slider" variant="body2" gutterBottom>
                Frames to Insert: {frameCount}
              </Typography>
              <Slider
                value={frameCount}
                onChange={handleFrameCountChange}
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
                disabled={isProcessing}
                aria-labelledby="frame-count-slider"
                size="small"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {frameCount === 1 ? 'Insert 1 frame' : `Insert ${frameCount} frames (GIF will play slower)`}
              </Typography>
            </Box>
            
            {/* Playback speed slider */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography id="playback-speed-slider" variant="body2" gutterBottom>
                Playback Speed: {playbackSpeed}x
              </Typography>
              <Slider
                value={playbackSpeed}
                onChange={handlePlaybackSpeedChange}
                min={0.25}
                max={2}
                step={0.25}
                marks
                valueLabelDisplay="auto"
                disabled={isProcessing}
                aria-labelledby="playback-speed-slider"
                size="small"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {playbackSpeed < 1 ? 'Slower playback' : playbackSpeed > 1 ? 'Faster playback' : 'Normal speed'}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Button
            variant="contained"
            color="primary"
            size="medium"
            startIcon={<PlayArrowIcon />}
            onClick={onStartProcessing}
            disabled={isProcessing || !hasOriginalGif}
            sx={{ minWidth: '180px' }}
          >
            Generate Interpolated GIF
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
};

export default SettingsPanel; 