import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Drawer,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';

export default function ControlsPage() {

// --- RemediationScriptsSection component ---
type RemediationScriptsSectionProps = {
  resource: any;
  controlName?: string;
};

function RemediationScriptsSection({ resource, controlName }: RemediationScriptsSectionProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [scripts, setScripts] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (!resource) return;
    setLoading(true);
    setError(null);
    setScripts(null);
    window
      .fetch('/api/config/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: resource.resourceId,
          resourceType: resource.resourceType,
          annotation: resource.annotation,
          controlName,
        }),
      })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || 'Failed to generate remediation scripts');
        return res.json();
      })
      .then((data) => {
        setScripts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to generate remediation scripts');
        setLoading(false);
      });
    // Only refetch when resource changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.resourceId, resource?.resourceType, resource?.annotation, controlName]);

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={600} mb={1}>Remediation Scripts</Typography>
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} />
          <Typography>Generating scripts...</Typography>
        </Box>
      )}
      {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
      {scripts && (
        <>
          {scripts.terraform && (
            <Box sx={{ my: 2 }}>
              <Typography variant="body2" fontWeight={500}>Terraform</Typography>
              <pre style={{ background: '#f7f7fa', padding: 12, borderRadius: 6, fontSize: 13, overflowX: 'auto' }}>{scripts.terraform}</pre>
            </Box>
          )}
          {scripts.cloudformation && (
            <Box sx={{ my: 2 }}>
              <Typography variant="body2" fontWeight={500}>CloudFormation</Typography>
              <pre style={{ background: '#f7f7fa', padding: 12, borderRadius: 6, fontSize: 13, overflowX: 'auto' }}>{scripts.cloudformation}</pre>
            </Box>
          )}
          {scripts.aws_cli && (
            <Box sx={{ my: 2 }}>
              <Typography variant="body2" fontWeight={500}>AWS CLI</Typography>
              <pre style={{ background: '#f7f7fa', padding: 12, borderRadius: 6, fontSize: 13, overflowX: 'auto' }}>{scripts.aws_cli}</pre>
            </Box>
          )}
          {scripts.error && (
            <Alert severity="warning" sx={{ my: 2 }}>{scripts.error}</Alert>
          )}
        </>
      )}
    </Box>
  );
}

  const [controls, setControls] = useState<any[]>([]);
  const [controlsLoading, setControlsLoading] = useState(true);
  const [controlsError, setControlsError] = useState<string | null>(null);
  const [controlsNextToken, setControlsNextToken] = useState<string | null>(null);
  const [controlsLoadMore, setControlsLoadMore] = useState(false);
  const [expanded, setExpanded] = useState<string | false>(false);
  const [resources, setResources] = useState<{ [ruleName: string]: any[] }>({});
  const [resourcesLoading, setResourcesLoading] = useState<{ [ruleName: string]: boolean }>({});
  const [resourcesError, setResourcesError] = useState<{ [ruleName: string]: string | null }>({});
  const [resourcesNextToken, setResourcesNextToken] = useState<{ [ruleName: string]: string | null }>({});
  const [resourcesLoadMore, setResourcesLoadMore] = useState<{ [ruleName: string]: boolean }>({});
  const [drawer, setDrawer] = useState<{ open: boolean; resource: any | null }>({ open: false, resource: null });

  useEffect(() => {
    setControlsLoading(true);
    setControlsError(null);
    axios.get('/api/config/rules')
      .then(res => {
        setControls(res.data.controls);
        setControlsNextToken(res.data.nextToken || null);
        setControlsLoading(false);
      })
      .catch(err => {
        setControlsError(err.response?.data?.error || err.message || 'Failed to fetch controls');
        setControlsLoading(false);
      });
  }, []);

  const handleControlsLoadMore = () => {
    if (!controlsNextToken) return;
    setControlsLoadMore(true);
    axios.get('/api/config/rules', { params: { nextToken: controlsNextToken } })
      .then(res => {
        setControls(prev => [...prev, ...res.data.controls]);
        setControlsNextToken(res.data.nextToken || null);
        setControlsLoadMore(false);
      })
      .catch(err => {
        setControlsError(err.response?.data?.error || err.message || 'Failed to fetch more controls');
        setControlsLoadMore(false);
      });
  };

  const handleAccordionChange = (ruleName: string) => (_event: any, isExpanded: boolean) => {
    setExpanded(isExpanded ? ruleName : false);
    if (isExpanded && !resources[ruleName] && !resourcesLoading[ruleName]) {
      setResourcesLoading(r => ({ ...r, [ruleName]: true }));
      setResourcesError(e => ({ ...e, [ruleName]: null }));
      axios.get(`/api/config/noncompliant/${encodeURIComponent(ruleName)}`, { params: { limit: 5 } })
        .then(res => {
          setResources(r => ({ ...r, [ruleName]: res.data.resources }));
          setResourcesNextToken(t => ({ ...t, [ruleName]: res.data.nextToken || null }));
          setResourcesLoading(l => ({ ...l, [ruleName]: false }));
        })
        .catch(err => {
          setResourcesError(e => ({ ...e, [ruleName]: err.response?.data?.error || err.message || 'Failed to fetch resources' }));
          setResourcesLoading(l => ({ ...l, [ruleName]: false }));
        });
    }
  };

  const handleResourcesLoadMore = (ruleName: string) => {
    if (!resourcesNextToken[ruleName]) return;
    setResourcesLoadMore(l => ({ ...l, [ruleName]: true }));
    axios.get(`/api/config/noncompliant/${encodeURIComponent(ruleName)}`, { params: { nextToken: resourcesNextToken[ruleName], limit: 5 } })
      .then(res => {
        setResources(r => ({ ...r, [ruleName]: [...(r[ruleName] || []), ...res.data.resources] }));
        setResourcesNextToken(t => ({ ...t, [ruleName]: res.data.nextToken || null }));
        setResourcesLoadMore(l => ({ ...l, [ruleName]: false }));
      })
      .catch(err => {
        setResourcesError(e => ({ ...e, [ruleName]: err.response?.data?.error || err.message || 'Failed to fetch more resources' }));
        setResourcesLoadMore(l => ({ ...l, [ruleName]: false }));
      });
  };


  const handleResourceClick = (resource: any) => {
    setDrawer({ open: true, resource });
  };
  const handleDrawerClose = () => {
    setDrawer({ open: false, resource: null });
  };

  return (
    <Box>
      <Typography variant="h3" mb={3} fontWeight={700}>NIST-800 Controls</Typography>
      {controlsLoading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={24} />
          <Typography>Loading controls...</Typography>
        </Box>
      ) : controlsError ? (
        <Alert severity="error">{controlsError}</Alert>
      ) : controls.length === 0 ? (
        <Alert severity="info">No controls found.</Alert>
      ) : (
        <>
          {controls.map(control => (
            <Accordion
              key={control.name}
              expanded={expanded === control.name}
              onChange={handleAccordionChange(control.name)}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Typography variant="h6" sx={{ flex: 1 }}>{control.name}</Typography>
                  <Chip label="AWS Config" color="info" sx={{ ml: 2, fontWeight: 600 }} />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {resourcesLoading[control.name] ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CircularProgress size={24} />
                    <Typography>Loading non-compliant resources...</Typography>
                  </Box>
                ) : resourcesError[control.name] ? (
                  <Alert severity="error">{resourcesError[control.name]}</Alert>
                ) : !resources[control.name] ? (
                  <Typography variant="body2" color="text.secondary">Expand to load resources.</Typography>
                ) : resources[control.name].length === 0 ? (
                  <Alert severity="success">All resources are compliant!</Alert>
                ) : (
                  <>
                    <List>
                      {resources[control.name].map(resource => (
                        <ListItem disablePadding key={resource.resourceId}>
                          <ListItemButton onClick={() => handleResourceClick(resource)}>
                            <ListItemText
                              primary={resource.resourceId}
                              secondary={<>
                                <Typography component="span" variant="body2" color="text.secondary">
                                  {resource.resourceType} | Last evaluated: {new Date(resource.complianceTime).toLocaleString()}
                                </Typography>
                                {resource.annotation && (
                                  <Typography component="span" variant="body2" color="error.main" display="block">
                                    {resource.annotation}
                                  </Typography>
                                )}
                              </>}
                            />
                            <IconButton edge="end" size="small" sx={{ ml: 1 }}>
                              <InfoIcon />
                            </IconButton>
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                    {resourcesNextToken[control.name] && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <button
                          onClick={() => handleResourcesLoadMore(control.name)}
                          disabled={resourcesLoadMore[control.name]}
                          style={{ padding: '8px 20px', borderRadius: 4, border: '1px solid #1976d2', background: resourcesLoadMore[control.name] ? '#eee' : '#1976d2', color: resourcesLoadMore[control.name] ? '#888' : '#fff', fontWeight: 600, cursor: resourcesLoadMore[control.name] ? 'not-allowed' : 'pointer' }}
                        >
                          {resourcesLoadMore[control.name] ? 'Loading...' : 'Load More'}
                        </button>
                      </Box>
                    )}
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
          {controlsNextToken && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <button
                onClick={handleControlsLoadMore}
                disabled={controlsLoadMore}
                style={{ padding: '8px 20px', borderRadius: 4, border: '1px solid #1976d2', background: controlsLoadMore ? '#eee' : '#1976d2', color: controlsLoadMore ? '#888' : '#fff', fontWeight: 600, cursor: controlsLoadMore ? 'not-allowed' : 'pointer' }}
              >
                {controlsLoadMore ? 'Loading...' : 'Load More Controls'}
              </button>
            </Box>
          )}
        </>
      )}

      {/* Resource detail drawer */}
      <Drawer
        anchor="right"
        open={drawer.open}
        onClose={handleDrawerClose}
        PaperProps={{ 
          sx: { 
            width: 900, 
            maxWidth: '100vw', 
            p: 2,
            zIndex: (theme) => theme.zIndex.drawer + 2 
          } 
        }}
      >
        <Box sx={{ p: 3, pt: 8 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>Resource Details</Typography>
            <IconButton onClick={handleDrawerClose}><CloseIcon /></IconButton>
          </Box>
          {drawer.resource && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" fontWeight={700}>{drawer.resource.resourceId}</Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>{drawer.resource.resourceType}</Typography>
              <Typography variant="body2" mb={2}><b>Last Evaluated:</b> {new Date(drawer.resource.complianceTime).toLocaleString()}</Typography>
              {drawer.resource.annotation && (
                <Alert severity="error" sx={{ mb: 2 }}>{drawer.resource.annotation}</Alert>
              )}
              <Divider sx={{ my: 2 }} />
              <RemediationScriptsSection resource={drawer.resource} controlName={expanded || undefined} />
            </>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}
