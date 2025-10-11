import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Chip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { auditLogApi, AuditLog } from '../../services/auditLogApi';
import { useNotification } from '../../hooks/useNotification';

const AuditLogPanel: React.FC = () => {
  const { showSuccess, showError, NotificationComponent } = useNotification();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState<{ actorUserId?: string; actionType?: string; targetEntity?: string; from?: string; to?: string }>({});
  const [diffOpen, setDiffOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [relatedOpen, setRelatedOpen] = useState(false);
  const [related, setRelated] = useState<AuditLog[]>([]);

  const load = async () => {
    try {
      const res = await auditLogApi.getLogs(page, limit, filters);
      if (res.success && res.data) setLogs(res.data.data);
    } catch (e) {
      showError('Loglar yüklenemedi');
    }
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, JSON.stringify(filters)]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const blob = await auditLogApi.exportLogs(format, filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showSuccess('Loglar indirildi');
    } catch (e) {
      showError('Dışa aktarma başarısız');
    }
  };

  const openDiff = (log: AuditLog) => {
    setSelectedLog(log);
    setDiffOpen(true);
  };

  const openRelated = async (log: AuditLog) => {
    try {
      if (!log.correlationId) return;
      const res = await auditLogApi.getRelated(log.correlationId);
      if (res.success && res.data) setRelated(res.data);
      setRelatedOpen(true);
    } catch (e) {
      showError('İlişkili olaylar yüklenemedi');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Denetim Kayıtları</Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField label="Kullanıcı ID" fullWidth value={filters.actorUserId || ''} onChange={(e) => setFilters(prev => ({ ...prev, actorUserId: e.target.value || undefined }))} />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField label="Aksiyon" fullWidth value={filters.actionType || ''} onChange={(e) => setFilters(prev => ({ ...prev, actionType: e.target.value || undefined }))} />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField label="Varlık" fullWidth value={filters.targetEntity || ''} onChange={(e) => setFilters(prev => ({ ...prev, targetEntity: e.target.value || undefined }))} />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField type="date" label="Başlangıç" InputLabelProps={{ shrink: true }} fullWidth value={filters.from || ''} onChange={(e) => setFilters(prev => ({ ...prev, from: e.target.value || undefined }))} />
            </Box>
            <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
              <TextField type="date" label="Bitiş" InputLabelProps={{ shrink: true }} fullWidth value={filters.to || ''} onChange={(e) => setFilters(prev => ({ ...prev, to: e.target.value || undefined }))} />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button variant="outlined" onClick={() => setPage(1)}>Filtrele</Button>
              <Button variant="contained" onClick={() => handleExport('csv')}>CSV</Button>
              <Button variant="contained" onClick={() => handleExport('json')}>JSON</Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Zaman</TableCell>
                <TableCell>Kullanıcı</TableCell>
                <TableCell>Aksiyon</TableCell>
                <TableCell>Hedef</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id} hover>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{log.actorUserId}</TableCell>
                  <TableCell><Chip label={log.actionType} /></TableCell>
                  <TableCell>{log.targetEntity}{log.targetId ? `:${log.targetId}` : ''}</TableCell>
                  <TableCell>
                    <Button onClick={() => openDiff(log)}>Diff</Button>
                    {log.correlationId && <Button onClick={() => openRelated(log)}>Zincir</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Diff Dialog */}
      <Dialog open={diffOpen} onClose={() => setDiffOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Değişiklik Diff</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1">Önceki</Typography>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(selectedLog?.prev || {}, null, 2)}</pre>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1">Sonraki</Typography>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(selectedLog?.next || {}, null, 2)}</pre>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiffOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Related Dialog */}
      <Dialog open={relatedOpen} onClose={() => setRelatedOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>İlişkili Olay Zinciri</DialogTitle>
        <DialogContent>
          {related.map(r => (
            <Box key={r.id} sx={{ mb: 1 }}>
              <Typography variant="body2">{new Date(r.timestamp).toLocaleString()} • {r.actionType} • {r.targetEntity}{r.targetId ? `:${r.targetId}` : ''}</Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRelatedOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      <NotificationComponent />
    </Box>
  );
};

export default AuditLogPanel;


