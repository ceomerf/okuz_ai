import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Chip, Table, TableHead, TableRow, TableCell, TableBody, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { rbacManagementApi, Role, Permission } from '../../services/rbacManagementApi';
import { useNotification } from '../../hooks/useNotification';
import ConfirmDialog from '../Shared/ConfirmDialog';

const RbacManagementPanel: React.FC = () => {
  const { showSuccess, showError, showInfo, NotificationComponent } = useNotification();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [simRoleIds, setSimRoleIds] = useState<string[]>([]);
  const [simulationResult, setSimulationResult] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [r, p] = await Promise.all([rbacManagementApi.getRoles(), rbacManagementApi.getPermissions()]);
        if (r.success && r.data) setRoles(r.data);
        if (p.success && p.data) setPermissions(p.data);
      } catch (e) {
        showError('RBAC verileri yüklenemedi');
      }
    })();
  }, [showError]);

  const permissionMap = useMemo(() => {
    const map: Record<string, Permission> = {};
    permissions.forEach(p => (map[p.id] = p));
    return map;
  }, [permissions]);

  const togglePermission = (permId: string) => {
    setRolePermissions(prev => ({ ...prev, [permId]: !prev[permId] }));
  };

  const handleAssign = async () => {
    try {
      if (!selectedRole) return;
      const selectedPermIds = Object.entries(rolePermissions).filter(([, v]) => v).map(([k]) => k);
      const res = await rbacManagementApi.assignRolePermissions(selectedRole.id, selectedPermIds);
      if (res.success) showSuccess('İzinler role atandı');
    } catch (e) {
      showError('İzin atama başarısız');
    }
  };

  const handleCreateRole = async () => {
    try {
      if (!newRoleName.trim()) return;
      const res = await rbacManagementApi.createRole({ name: newRoleName.trim() });
      if (res.success && res.data) {
        setRoles(prev => [res.data!, ...prev]);
        setCreateRoleOpen(false);
        setNewRoleName('');
        showSuccess('Rol oluşturuldu');
      }
    } catch (e) {
      showError('Rol oluşturulamadı');
    }
  };

  const handleDeleteRole = async () => {
    try {
      if (!selectedRole) return;
      const res = await rbacManagementApi.deleteRole(selectedRole.id);
      if (res.success) {
        setRoles(prev => prev.filter(r => r.id !== selectedRole.id));
        setSelectedRole(null);
        showSuccess('Rol silindi');
      }
    } catch (e) {
      showError('Rol silinemedi');
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  const runSimulation = async () => {
    try {
      const res = await rbacManagementApi.simulateAccess(simRoleIds);
      if (res.success && res.data) setSimulationResult(res.data.visibleSections);
      else setSimulationResult([]);
    } catch (e) {
      showError('Simülasyon çalıştırılamadı');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>RBAC Yönetimi</Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: '1 1 33%' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Roller</Typography>
                <Button variant="contained" onClick={() => setCreateRoleOpen(true)}>Yeni Rol</Button>
              </Box>
              {roles.map(role => (
                <Box key={role.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                  <Button variant={selectedRole?.id === role.id ? 'contained' : 'outlined'} onClick={() => setSelectedRole(role)}>{role.name}</Button>
                  <Button color="error" onClick={() => setDeleteConfirmOpen(true)}>Sil</Button>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ width: '100%' }} >
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>İzin Denetim Matrisi</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>İzin</TableCell>
                    <TableCell align="center">Atalı</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {permissions.map(perm => (
                    <TableRow key={perm.id} hover>
                      <TableCell>{perm.key}</TableCell>
                      <TableCell align="center">
                        <Checkbox checked={!!rolePermissions[perm.id]} onChange={() => togglePermission(perm.id)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button variant="contained" onClick={handleAssign} disabled={!selectedRole}>Kaydet</Button>
                <Button variant="outlined" onClick={() => setRolePermissions({})}>Temizle</Button>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>İzin Simülasyonu</Typography>
              <TextField label="Rol ID'leri (virgül ile)" fullWidth value={simRoleIds.join(',')} onChange={(e) => setSimRoleIds(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button variant="contained" onClick={runSimulation}>Simüle Et</Button>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {simulationResult.map((sec, idx) => (<Chip key={idx} label={sec} color="primary" />))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Create Role */}
      <Dialog open={createRoleOpen} onClose={() => setCreateRoleOpen(false)}>
        <DialogTitle>Yeni Rol</DialogTitle>
        <DialogContent>
          <TextField label="Rol Adı" fullWidth value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRoleOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={handleCreateRole}>Oluştur</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog open={deleteConfirmOpen} title="Rolü Sil" description="Bu işlem geri alınamaz." confirmColor="error" confirmText="Sil" onClose={() => setDeleteConfirmOpen(false)} onConfirm={handleDeleteRole} />

      <NotificationComponent />
    </Box>
  );
};

export default RbacManagementPanel;


