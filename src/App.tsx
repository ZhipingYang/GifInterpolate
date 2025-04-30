import React from 'react';
import { 
  CssBaseline, 
  Container, 
  Typography, 
  AppBar, 
  Toolbar, 
  Box,
  Paper,
  ThemeProvider,
  createTheme
} from '@mui/material';
import { 
  AutoFixHigh as AutoFixHighIcon 
} from '@mui/icons-material';
import GifPlayer from './components/GifPlayer';

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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="static" elevation={2} sx={{ mb: 4 }}>
          <Toolbar>
            <AutoFixHighIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              GIF 插帧处理器
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth="lg" sx={{ mb: 4, flex: 1 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              mb: 4, 
              borderRadius: 2, 
              textAlign: 'center',
              background: 'linear-gradient(45deg, #3f51b5 30%, #7986cb 90%)',
              color: 'white'
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom>
              提升您的GIF动画质量
            </Typography>
            <Typography variant="subtitle1">
              使用先进插帧算法，让您的GIF更加流畅自然
            </Typography>
          </Paper>
          
          <GifPlayer />
        </Container>
        
        <Box 
          component="footer" 
          sx={{ 
            py: 3, 
            px: 2, 
            mt: 'auto',
            backgroundColor: (theme) => theme.palette.grey[100],
            textAlign: 'center'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            GIF 插帧处理器 • 使用 React 和 Material UI 构建
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
