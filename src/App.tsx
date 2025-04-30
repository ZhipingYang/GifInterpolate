import React, { useState } from 'react';
import { 
  CssBaseline, 
  Container, 
  Typography, 
  AppBar, 
  Toolbar, 
  Box,
  Paper,
  ThemeProvider,
  createTheme,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  AutoFixHigh as AutoFixHighIcon,
  Terminal as TerminalIcon
} from '@mui/icons-material';
import GifPlayer from './components/GifPlayer';
import LogViewer from './components/LogViewer';

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5'
    }
  },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: {
      fontWeight: 600,
    }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

function App() {
  const [logViewerOpen, setLogViewerOpen] = useState(false);

  const toggleLogViewer = () => {
    setLogViewerOpen(!logViewerOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" elevation={2} sx={{ mb: 4 }}>
          <Toolbar>
            <AutoFixHighIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              GIF Frame Interpolator
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth="lg" sx={{ mb: 4, flex: 1 }}>          
          <GifPlayer />
        </Container>
        
        <Box 
          component="footer" 
          sx={{ 
            py: 3, 
            px: 2, 
            mt: 'auto',
            backgroundColor: (theme) => theme.palette.grey[100],
            textAlign: 'center',
            position: 'relative'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            GIF Frame Interpolator • Built with React and Material UI
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Last deployed: {process.env.REACT_APP_DEPLOY_TIMESTAMP || new Date().toLocaleString()}
          </Typography>
          <Box 
            sx={{ 
              position: 'absolute', 
              right: '16px', 
              bottom: '16px',
              opacity: 0.7,
              '&:hover': {
                opacity: 1
              }
            }}
          >
            <Tooltip title="View Logs">
              <IconButton 
                size="small" 
                onClick={toggleLogViewer}
                sx={{ 
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.1)'
                  }
                }}
              >
                <TerminalIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
      
      <LogViewer open={logViewerOpen} onClose={() => setLogViewerOpen(false)} />
    </ThemeProvider>
  );
}

export default App;
