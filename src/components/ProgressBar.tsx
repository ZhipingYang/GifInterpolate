import React from 'react';
import { 
  Box, 
  LinearProgress, 
  Typography, 
  Button, 
  Paper,
  Stack
} from '@mui/material';
import { Cancel as CancelIcon } from '@mui/icons-material';

interface ProgressBarProps {
  current: number;
  total: number;
  stage: string;
  isProcessing: boolean;
  onCancel: () => void;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  stage,
  isProcessing,
  onCancel
}) => {
  if (!isProcessing) return null;
  
  const progressPercentage = total > 0 ? Math.floor((current / total) * 100) : 0;
  
  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" color="primary.main">
            {stage || '处理中...'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {progressPercentage}% ({current}/{total} 帧)
          </Typography>
        </Box>
        
        <LinearProgress 
          variant="determinate" 
          value={progressPercentage} 
          sx={{ height: 8, borderRadius: 1 }}
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<CancelIcon />}
            onClick={onCancel}
            disabled={!isProcessing}
            size="small"
          >
            取消
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
};

export default ProgressBar; 