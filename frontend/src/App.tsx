import React, { useState } from 'react';
import { ThemeProvider, CssBaseline, Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemText, ListItemButton, Divider } from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import theme from './theme';
import ControlsPage from './pages/Controls';

const drawerWidth = 240;

type Page = 'dashboard' | 'controls' | 'resources' | 'remediation';

function App() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', backgroundColor: 'background.default' }}>
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
              backgroundColor: 'secondary.main',
              color: 'white',
            },
          }}
        >
          <Toolbar>
            <SecurityIcon sx={{ mr: 1, color: 'info.main' }} />
            <Typography variant="h6" noWrap component="div">
              NIST-800 Compliance
            </Typography>
          </Toolbar>
          <Divider sx={{ bgcolor: 'divider', my: 1 }} />
          <List>
            <ListItem disablePadding>
              <ListItemButton selected={page === 'dashboard'} onClick={() => setPage('dashboard')}>
                <ListItemText primary="Dashboard" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton selected={page === 'controls'} onClick={() => setPage('controls')}>
                <ListItemText primary="Controls" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton selected={page === 'resources'} onClick={() => setPage('resources')}>
                <ListItemText primary="Resources" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton selected={page === 'remediation'} onClick={() => setPage('remediation')}>
                <ListItemText primary="Remediation" />
              </ListItemButton>
            </ListItem>
          </List>
        </Drawer>

        {/* Main Content */}
        <Box 
          component="main"
          sx={{ 
            flexGrow: 1, 
            width: `calc(100% - ${drawerWidth}px)`,
            ml: `${drawerWidth}px`
          }}
        >
          <AppBar 
            position="fixed" 
            sx={{ 
              width: `calc(100% - ${drawerWidth}px)`, 
              ml: `${drawerWidth}px`, 
              backgroundColor: 'primary.main', 
              boxShadow: 0,
              zIndex: (theme) => theme.zIndex.drawer + 1 
            }}
          >
            <Toolbar>
              <Typography variant="h5" color="inherit" noWrap sx={{ fontWeight: 700 }}>
                Compliance Dashboard
              </Typography>
            </Toolbar>
          </AppBar>
          <Toolbar /> {/* This creates space for the fixed AppBar */}
          <Box sx={{ p: 4, overflow: 'auto' }}>
            {/* Conditional page rendering */}
            {page === 'dashboard' && (
              <>
                <Typography variant="h4" gutterBottom>
                  Welcome to your NIST-800 Compliance Dashboard
                </Typography>
                <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
                  Visualize, track, and remediate your AWS compliance posture with real-time controls, resource mapping, and actionable remediation guidance.
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {/* Example card placeholder */}
                  <Box sx={{ bgcolor: 'background.paper', p: 3, borderRadius: 3, minWidth: 320, boxShadow: 1 }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Compliance Score
                    </Typography>
                    <Typography variant="h2" color="error.main" fontWeight={700}>0%</Typography>
                    <Typography variant="body2" color="text.secondary">Compliant Controls</Typography>
                  </Box>
                  <Box sx={{ bgcolor: 'background.paper', p: 3, borderRadius: 3, minWidth: 320, boxShadow: 1 }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Controls Needing Attention
                    </Typography>
                    <Typography variant="h2" color="warning.main" fontWeight={700}>2</Typography>
                    <Typography variant="body2" color="text.secondary">Pending Remediation</Typography>
                  </Box>
                  <Box sx={{ bgcolor: 'background.paper', p: 3, borderRadius: 3, minWidth: 320, boxShadow: 1 }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Total Failing Resources
                    </Typography>
                    <Typography variant="h2" color="error.main" fontWeight={700}>6</Typography>
                    <Typography variant="body2" color="text.secondary">Resources Non-compliant</Typography>
                  </Box>
                </Box>
              </>
            )}
            {page === 'controls' && <ControlsPage />}
            {page === 'resources' && (
              <Typography variant="h4">Resources (Coming Soon)</Typography>
            )}
            {page === 'remediation' && (
              <Typography variant="h4">Remediation (Coming Soon)</Typography>
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
