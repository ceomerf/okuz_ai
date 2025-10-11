import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  Chip,
  IconButton,
  Avatar,
  Typography,
  LinearProgress,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';
import { MoreVert } from '@mui/icons-material';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import { Coach } from '../../services/coachManagementApi';

interface CoachTableProps {
  coaches: Coach[];
  loading: boolean;
  error: string | null;
  selectedCoaches: string[];
  onSelectCoach: (coachId: string) => void;
  onSelectAll: () => void;
  onCoachDetails: (coach: Coach) => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>, coach: Coach) => void;
  page: number;
  rowsPerPage: number;
  totalCoaches: number;
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const CoachTable: React.FC<CoachTableProps> = ({
  coaches,
  loading,
  error,
  selectedCoaches,
  onSelectCoach,
  onSelectAll,
  onCoachDetails,
  onMenuClick,
  page,
  rowsPerPage,
  totalCoaches,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const getPerformanceColor = (performance: number) => {
    if (performance >= 80) return 'success';
    if (performance >= 60) return 'warning';
    return 'error';
  };

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedCoaches.length > 0 && selectedCoaches.length < coaches.length}
                checked={selectedCoaches.length === coaches.length && coaches.length > 0}
                onChange={onSelectAll}
              />
            </TableCell>
            <TableCell>Koç</TableCell>
            <TableCell>Öğrenci Sayısı</TableCell>
            <TableCell>Performans</TableCell>
            <TableCell>Son Aktivite</TableCell>
            <TableCell>Kayıt Tarihi</TableCell>
            <TableCell align="center">İşlemler</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <CircularProgress />
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Alert severity="error">{error}</Alert>
              </TableCell>
            </TableRow>
          ) : (
            coaches.map((coach) => (
              <TableRow key={coach.id} hover>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedCoaches.includes(coach.id)}
                    onChange={() => onSelectCoach(coach.id)}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ width: 40, height: 40 }}>
                      {coach.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {coach.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {coach.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={coach.coachStudents.length}
                    color={coach.coachStudents.length > 0 ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(100, Math.max(0, (coach as any).performance ?? 0))}
                      sx={{ flexGrow: 1 }}
                    />
                    <Typography variant="body2">
                      {Math.min(100, Math.max(0, (coach as any).performance ?? 0))}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {coach.lastActiveAt 
                      ? format(new Date(coach.lastActiveAt), 'dd.MM.yyyy HH:mm', { locale: tr })
                      : 'Hiç'
                    }
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {format(new Date(coach.createdAt), 'dd.MM.yyyy', { locale: tr })}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    onClick={(e) => onMenuClick(e, coach)}
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCoaches}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    </TableContainer>
  );
};

export default CoachTable;
