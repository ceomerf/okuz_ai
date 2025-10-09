import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, TextField, Button, Select, MenuItem, Switch, FormControlLabel, Slider, Chip } from '@mui/material';
import { featureFlagsApi, FeatureFlag, RemoteConfigKey } from '../../services/featureFlagsApi';
import { useNotification } from '../../hooks/useNotification';

const envs = ['development', 'staging', 'production'] as const;

const FeatureFlagsPanel: React.FC = () => {
  const { showSuccess, showError, NotificationComponent } = useNotification();
  const [env, setEnv] = useState<typeof envs[number]>('development');
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [configs, setConfigs] = useState<RemoteConfigKey[]>([]);
  const [newConfig, setNewConfig] = useState<RemoteConfigKey>({ key: '', value: '', description: '' });

  const load = async () => {
    try {
      const [f, c] = await Promise.all([featureFlagsApi.getFlags(env), featureFlagsApi.getConfigs()]);
      if (f.success && f.data) setFlags(f.data);
      if (c.success && c.data) setConfigs(c.data);
    } catch (e) {
      showError('Feature/Config yüklenemedi');
    }
  };

  useEffect(() => { load(); }, [env]);

  const saveFlag = async () => {
    try {
      if (!editingFlag) return;
      const res = await featureFlagsApi.upsertFlag(editingFlag);
      if (res.success) {
        showSuccess('Feature güncellendi');
        setEditingFlag(null);
        load();
      }
    } catch (e) { showError('Feature kaydedilemedi'); }
  };

  const kill = async (key: string) => {
    try {
      const res = await featureFlagsApi.killSwitch(key, env);
      if (res.success) { showSuccess('Kill switch uygulandı'); load(); }
    } catch (e) { showError('Kill switch başarısız'); }
  };

  const saveConfig = async () => {
    try {
      if (!newConfig.key) return;
      const res = await featureFlagsApi.upsertConfig(newConfig);
      if (res.success) { showSuccess('Konfig kaydedildi'); setNewConfig({ key: '', value: '', description: '' }); load(); }
    } catch (e) { showError('Konfig kaydedilemedi'); }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Feature Flags & Konfig</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Select value={env} onChange={(e) => setEnv(e.target.value as any)}>
          {envs.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
        </Select>
        <Button variant="outlined" onClick={load}>Yenile</Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Features</Typography>
              {flags.map(flag => (
                <Box key={flag.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2">{flag.key}</Typography>
                    <Typography variant="caption" color="text.secondary">{flag.description}</Typography>
                  </Box>
                  <FormControlLabel control={<Switch checked={flag.enabled} onChange={(e) => setEditingFlag({ ...flag, enabled: e.target.checked })} />} label="Aktif" />
                  <Box sx={{ width: 180 }}>
                    <Typography variant="caption">Rollout %</Typography>
                    <Slider value={flag.rolloutPercent ?? 100} onChange={(_, v) => setEditingFlag({ ...flag, rolloutPercent: v as number })} step={5} min={0} max={100} />
                  </Box>
                  <Button variant="outlined" onClick={() => kill(flag.key)}>Kill Switch</Button>
                  <Button variant="contained" onClick={saveFlag} disabled={!editingFlag || editingFlag.id !== flag.id}>Kaydet</Button>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Remote Config</Typography>
              {configs.map(c => (
                <Box key={c.key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Chip label={c.key} />
                  <Typography variant="body2">{String(c.value)}</Typography>
                </Box>
              ))}
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <TextField label="Anahtar" value={newConfig.key} onChange={(e) => setNewConfig(prev => ({ ...prev, key: e.target.value }))} />
                <TextField label="Değer" value={String(newConfig.value)} onChange={(e) => setNewConfig(prev => ({ ...prev, value: e.target.value }))} />
                <Button variant="contained" onClick={saveConfig}>Kaydet</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <NotificationComponent />
    </Box>
  );
};

export default FeatureFlagsPanel;


