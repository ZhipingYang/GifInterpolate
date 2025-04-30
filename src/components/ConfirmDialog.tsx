import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  Button 
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';

interface ConfirmDialogProps {
  show: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  show, 
  message, 
  onConfirm, 
  onCancel 
}) => {
  return (
    <Dialog
      open={show}
      onClose={onCancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title" sx={{ display: 'flex', alignItems: 'center' }}>
        <WarningIcon color="warning" sx={{ mr: 1 }} />
        确认
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="primary">
          取消
        </Button>
        <Button onClick={onConfirm} color="primary" variant="contained" autoFocus>
          确定
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog; 