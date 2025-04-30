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
            textAlign: 'center'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            GIF Frame Interpolator • Built with React and Material UI
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
