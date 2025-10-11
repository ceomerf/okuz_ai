import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Select, MenuItem, Chip } from '@mui/material';
import { notificationsApi, Template, AudienceSegment } from '../../services/notificationsApi';
import { useNotification } from '../../hooks/useNotification';

const NotificationsPanel: React.FC = () => {
  const { showSuccess, showError, NotificationComponent } = useNotification();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [segments, setSegments] = useState<AudienceSegment[]>([]);
  const [editing, setEditing] = useState<Partial<Template>>({ channel: 'email', name: '', subject: '', content: '' });
  const [campaign, setCampaign] = useState<{ templateIdA: string; templateIdB?: string; segmentId: string; splitPercent?: number }>({ templateIdA: '', segmentId: '', splitPercent: 50 });
  const [report, setReport] = useState<any>(null);

  const load = async () => {
    try {
      const [t, s] = await Promise.all([notificationsApi.getTemplates(), notificationsApi.getSegments()]);
      if (t.success && t.data) setTemplates(t.data);
      if (s.success && s.data) setSegments(s.data);
    } catch (e) { showError('Bildirim verileri yüklenemedi'); }
  };

  useEffect(() => { load(); }, []);

  const saveTemplate = async () => {
    try {
      const res = await notificationsApi.upsertTemplate(editing);
      if (res.success) { showSuccess('Şablon kaydedildi'); setEditing({ channel: 'email', name: '', subject: '', content: '' }); load(); }
    } catch (e) { showError('Şablon kaydedilemedi'); }
  };

  const send = async () => {
    try {
      const res = await notificationsApi.sendCampaign(campaign);
      if (res.success && res.data) { showSuccess('Kampanya gönderildi'); setReport(res.data); }
    } catch (e) { showError('Kampanya gönderilemedi'); }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Bildirim & Şablon Yönetimi</Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ flex: '1 1 50%' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Şablonlar</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ flex: '1 1 40%' }}>
                    <Select fullWidth value={editing.channel as any} onChange={(e) => setEditing(prev => ({ ...prev, channel: e.target.value as any }))}>
                      <MenuItem value="email">E-posta</MenuItem>
                      <MenuItem value="inapp">In-App</MenuItem>
                      <MenuItem value="push">Push</MenuItem>
                    </Select>
                  </Box>
                  <Box sx={{ flex: '1 1 60%' }}>
                    <TextField fullWidth label="Ad" value={editing.name || ''} onChange={(e) => setEditing(prev => ({ ...prev, name: e.target.value }))} />
                  </Box>
                </Box>
                {editing.channel === 'email' && (
                  <Box>
                    <TextField fullWidth label="Konu" value={editing.subject || ''} onChange={(e) => setEditing(prev => ({ ...prev, subject: e.target.value }))} />
                  </Box>
                )}
                <Box>
                  <TextField multiline minRows={6} fullWidth label="İçerik" value={editing.content || ''} onChange={(e) => setEditing(prev => ({ ...prev, content: e.target.value }))} />
                </Box>
                <Box>
                  <Button variant="contained" onClick={saveTemplate}>Kaydet</Button>
                </Box>
              </Box>

              <Box sx={{ mt: 2 }}>
                {templates.map(t => (<Chip sx={{ mr: 1, mb: 1 }} key={t.id} label={`${t.channel} • ${t.name}`} />))}
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 50%' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Kampanya Gönderimi (A/B)</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Select fullWidth value={campaign.templateIdA} onChange={(e) => setCampaign(prev => ({ ...prev, templateIdA: e.target.value }))}>
                    {templates.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                  </Select>
                </Box>
                <Box sx={{ flex: '1 1 50%' }}>
                  <Select displayEmpty fullWidth value={campaign.templateIdB || ''} onChange={(e) => setCampaign(prev => ({ ...prev, templateIdB: e.target.value || undefined }))}>
                    <MenuItem value=""><em>B seçeneği yok</em></MenuItem>
                    {templates.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                  </Select>
                </Box>
                <Box sx={{ flex: '1 1 50%' }}>
                  <Select fullWidth value={campaign.segmentId} onChange={(e) => setCampaign(prev => ({ ...prev, segmentId: e.target.value }))}>
                    {segments.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </Box>
                <Box sx={{ flex: '1 1 50%' }}>
                  <TextField type="number" fullWidth label="A/B bölüş (%)" value={campaign.splitPercent || 50} onChange={(e) => setCampaign(prev => ({ ...prev, splitPercent: Number(e.target.value) }))} />
                </Box>
                <Box sx={{ width: '100%' }}>
                  <Button variant="contained" onClick={send}>Gönder</Button>
                </Box>
              </Box>

              {report && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1">Teslimat Raporu</Typography>
                  <Typography variant="body2">Gönderildi: {report.sent} • Ulaştı: {report.delivered} • Açıldı: {report.opened ?? '-'} • Tıklandı: {report.clicked ?? '-'} • Bounce: {report.bounced ?? '-'}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      <NotificationComponent />
    </Box>
  );
};

export default NotificationsPanel;


