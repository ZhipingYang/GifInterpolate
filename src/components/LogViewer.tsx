import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Fade,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  DeleteSweep as ClearIcon,
  BugReport as DebugIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import logger, { LogEntry, LogLevel } from '../utils/logger';

interface LogViewerProps {
  open: boolean;
  onClose: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ open, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<LogLevel[]>(['info', 'warning', 'error', 'debug']);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to log updates
    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    // Get initial logs
    setLogs(logger.getLogs());

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new logs are added or drawer opens
    if (open && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, open]);

  const handleLevelToggle = (
    event: React.MouseEvent<HTMLElement>,
    newLevels: LogLevel[]
  ) => {
    if (newLevels.length) {
      setSelectedLevels(newLevels);
    }
  };

  const handleClearLogs = () => {
    logger.clearLogs();
  };

  const getLogLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'info':
        return <InfoIcon fontSize="small" color="info" />;
      case 'warning':
        return <WarningIcon fontSize="small" color="warning" />;
      case 'error':
        return <ErrorIcon fontSize="small" color="error" />;
      case 'debug':
        return <DebugIcon fontSize="small" color="disabled" />;
      default:
        return <InfoIcon fontSize="small" />;
    }
  };

  const getLogItemStyle = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return { borderLeft: '4px solid #f44336' };
      case 'warning':
        return { borderLeft: '4px solid #ff9800' };
      case 'info':
        return { borderLeft: '4px solid #2196f3' };
      case 'debug':
        return { borderLeft: '4px solid #9e9e9e' };
      default:
        return {};
    }
  };

  const filteredLogs = logs.filter(log => selectedLevels.includes(log.level));

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          height: '50vh',
          maxHeight: '80vh'
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ 
          p: 1, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: 1, 
          borderColor: 'divider'
        }}>
          <Typography variant="h6" component="div">
            Application Logs
          </Typography>
          <Box>
            <ToggleButtonGroup
              size="small"
              value={selectedLevels}
              onChange={handleLevelToggle}
              aria-label="log levels"
              sx={{ mr: 1 }}
            >
              <ToggleButton value="error" aria-label="error logs">
                <Tooltip title="Error">
                  <ErrorIcon fontSize="small" color="error" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="warning" aria-label="warning logs">
                <Tooltip title="Warning">
                  <WarningIcon fontSize="small" color="warning" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="info" aria-label="info logs">
                <Tooltip title="Info">
                  <InfoIcon fontSize="small" color="info" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="debug" aria-label="debug logs">
                <Tooltip title="Debug">
                  <DebugIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
            <Tooltip title="Clear logs">
              <IconButton size="small" onClick={handleClearLogs} edge="end">
                <ClearIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton size="small" onClick={onClose} edge="end">
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <List
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto', 
            p: 0,
            '& .MuiListItem-root': {
              py: 0.5,
            }
          }}
        >
          {filteredLogs.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">No logs to display</Typography>
            </Box>
          ) : (
            filteredLogs.map((log) => (
              <React.Fragment key={log.id}>
                <ListItem sx={getLogItemStyle(log.level)}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                    <Box sx={{ pr: 1, pt: 0.5 }}>
                      {getLogLevelIcon(log.level)}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'baseline'
                      }}>
                        <Typography variant="body2" component="div" fontWeight="medium">
                          {log.message}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ ml: 2, whiteSpace: 'nowrap' }}
                        >
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </Typography>
                      </Box>
                      {log.details && (
                        <Typography 
                          variant="body2" 
                          component="pre" 
                          color="text.secondary"
                          sx={{ 
                            mt: 0.5, 
                            p: 1, 
                            backgroundColor: 'grey.100', 
                            borderRadius: 1,
                            overflow: 'auto',
                            fontSize: '0.75rem',
                            maxHeight: '100px'
                          }}
                        >
                          {typeof log.details === 'object' 
                            ? JSON.stringify(log.details, null, 2) 
                            : String(log.details)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))
          )}
          <div ref={logEndRef} />
        </List>
      </Box>
    </Drawer>
  );
};

export default LogViewer; 