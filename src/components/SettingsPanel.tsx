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
  Stack
} from '@mui/material';
import { PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { InterpolationAlgorithm } from '../utils/gifInterpolation';

interface SettingsPanelProps {
  algorithm: InterpolationAlgorithm;
  frameCount: number;
  isProcessing: boolean;
  hasOriginalGif: boolean;
  onAlgorithmChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFrameCountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartProcessing: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  algorithm,
  frameCount,
  isProcessing,
  hasOriginalGif,
  onAlgorithmChange,
  onFrameCountChange,
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

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
      <Stack spacing={3}>
        <Typography variant="h6" color="primary" gutterBottom>
          插帧设置
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          gap: 3, 
          alignItems: { xs: 'stretch', md: 'center' },
          width: '100%'
        }}>
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center',
            width: { xs: '100%', md: 'auto' }
          }}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="algorithm-label">插帧算法</InputLabel>
              <Select
                labelId="algorithm-label"
                id="algorithm"
                value={algorithm}
                label="插帧算法"
                onChange={onAlgorithmChange as any}
                disabled={isProcessing}
              >
                <MenuItem value="linear">线性插值 (快速)</MenuItem>
                <MenuItem value="weighted">加权插值 (平衡)</MenuItem>
                <MenuItem value="bilinear">双线性插值 (平滑)</MenuItem>
                <MenuItem value="motion">运动估计插值 (较好)</MenuItem>
                <MenuItem value="opticalflow">光流插值 (高级，可能很慢)</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            width: { xs: '100%', md: 'auto' }
          }}>
            <Typography id="frame-count-slider" gutterBottom>
              插入帧数: {frameCount}
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
            />
            <Typography variant="caption" color="text.secondary">
              {frameCount === 1 ? '插入1帧' : `插入${frameCount}帧 (GIF将播放更慢)`}
            </Typography>
          </Box>
        </Box>
        
        {algorithm === 'opticalflow' && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            注意：光流算法计算量大，处理大型GIF可能会很慢
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={onStartProcessing}
            disabled={isProcessing || !hasOriginalGif}
            sx={{ minWidth: '200px' }}
          >
            开始生成插帧GIF
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
};

export default SettingsPanel; 