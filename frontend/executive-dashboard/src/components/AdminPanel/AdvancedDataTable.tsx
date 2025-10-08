import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Chip,
  LinearProgress,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  Typography,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Search,
  FilterList,
  Sort,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  Download,
  Refresh,
  Add,
  CheckCircle,
  Cancel,
  Warning,
  Info,
} from '@mui/icons-material';

export interface Column {
  id: string;
  label: string;
  minWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  type?: 'text' | 'number' | 'date' | 'status' | 'progress' | 'avatar' | 'actions';
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => React.ReactNode;
}

export interface AdvancedDataTableProps {
  title: string;
  data: any[];
  columns: Column[];
  onAdd?: () => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onView?: (item: any) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  selectable?: boolean;
  bulkActions?: boolean;
  page?: number;
  rowsPerPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  actions?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: (item: any) => void;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  }>;
}

const AdvancedDataTable: React.FC<AdvancedDataTableProps> = ({
  title,
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  onView,
  onRefresh,
  onExport,
  loading = false,
  searchable = true,
  filterable = true,
  sortable = true,
  selectable = false,
  bulkActions = false,
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange,
  onRowsPerPageChange,
  searchPlaceholder = 'Ara...',
  emptyMessage = 'Veri bulunamadı',
  actions = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuItem, setActionMenuItem] = useState<any>(null);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let filtered = data;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Sort
    if (sortBy) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortBy, sortOrder]);

  // Pagination
  const paginatedData = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const handleSort = (columnId: string) => {
    if (sortBy === columnId) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnId);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedItems(paginatedData.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, item: any) => {
    setActionMenuAnchor(event.currentTarget);
    setActionMenuItem(item);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setActionMenuItem(null);
  };

  const renderCellContent = (item: any, column: Column) => {
    const value = item[column.id];

    switch (column.type) {
      case 'status':
        const getStatusColor = (status: string) => {
          switch (status?.toLowerCase()) {
            case 'active':
            case 'completed':
            case 'success':
              return 'success';
            case 'inactive':
            case 'cancelled':
            case 'warning':
              return 'warning';
            case 'pending':
            case 'suspended':
            case 'error':
            case 'critical':
              return 'error';
            default:
              return 'default';
          }
        };
        return (
          <Chip
            label={value}
            color={getStatusColor(value) as any}
            size="small"
            variant="outlined"
          />
        );

      case 'progress':
        return (
          <Box display="flex" alignItems="center">
            <LinearProgress
              variant="determinate"
              value={value}
              sx={{ width: 60, mr: 1 }}
            />
            {value}%
          </Box>
        );

      case 'avatar':
        return (
          <Box display="flex" alignItems="center">
            <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
              {typeof value === 'string' ? value.charAt(0).toUpperCase() : '?'}
            </Avatar>
            {value}
          </Box>
        );

      case 'actions':
        return (
          <Box>
            {onView && (
              <Tooltip title="Görüntüle">
                <IconButton size="small" onClick={() => onView(item)}>
                  <Visibility />
                </IconButton>
              </Tooltip>
            )}
            {onEdit && (
              <Tooltip title="Düzenle">
                <IconButton size="small" onClick={() => onEdit(item)}>
                  <Edit />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Sil">
                <IconButton size="small" color="error" onClick={() => onDelete(item)}>
                  <Delete />
                </IconButton>
              </Tooltip>
            )}
            {actions.length > 0 && (
              <Tooltip title="Daha fazla">
                <IconButton
                  size="small"
                  onClick={(e) => handleActionMenuOpen(e, item)}
                >
                  <MoreVert />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );

      default:
        if (column.format) {
          return column.format(value);
        }
        return value;
    }
  };

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{title}</Typography>
          <Box display="flex" gap={1}>
            {onRefresh && (
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={onRefresh}
                disabled={loading}
                size="small"
              >
                Yenile
              </Button>
            )}
            {onExport && (
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={onExport}
                size="small"
              >
                Dışa Aktar
              </Button>
            )}
            {onAdd && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={onAdd}
                size="small"
              >
                Yeni Ekle
              </Button>
            )}
          </Box>
        </Box>

        {/* Search and Filters */}
        {(searchable || filterable) && (
          <Box display="flex" gap={2} mb={2} alignItems="center">
            {searchable && (
              <TextField
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 200 }}
              />
            )}
            {filterable && (
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
                size="small"
              >
                Filtreler
              </Button>
            )}
          </Box>
        )}

        {/* Bulk Actions */}
        {bulkActions && selectedItems.length > 0 && (
          <Box mb={2} p={1} bgcolor="action.hover" borderRadius={1}>
            <Typography variant="body2" color="text.secondary">
              {selectedItems.length} öğe seçildi
            </Typography>
            <Box display="flex" gap={1} mt={1}>
              <Button size="small" color="error" startIcon={<Delete />}>
                Seçilenleri Sil
              </Button>
              <Button size="small" startIcon={<Download />}>
                Dışa Aktar
              </Button>
            </Box>
          </Box>
        )}

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {selectable && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedItems.length > 0 && selectedItems.length < paginatedData.length}
                      checked={paginatedData.length > 0 && selectedItems.length === paginatedData.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align || 'left'}
                    style={{ minWidth: column.minWidth }}
                  >
                    {sortable && column.sortable !== false ? (
                      <TableSortLabel
                        active={sortBy === column.id}
                        direction={sortBy === column.id ? sortOrder : 'asc'}
                        onClick={() => handleSort(column.id)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (selectable ? 1 : 0)} align="center">
                    <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                      <Typography>Yükleniyor...</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (selectable ? 1 : 0)} align="center">
                    <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                      <Typography color="text.secondary">{emptyMessage}</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow key={item.id} hover>
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.id} align={column.align || 'left'}>
                        {renderCellContent(item, column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => onPageChange?.(newPage)}
          onRowsPerPageChange={(event) => onRowsPerPageChange?.(parseInt(event.target.value, 10))}
          labelRowsPerPage="Sayfa başına satır:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </CardContent>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        {actions.map((action, index) => (
          <MenuItem
            key={index}
            onClick={() => {
              action.onClick(actionMenuItem);
              handleActionMenuClose();
            }}
          >
            <ListItemIcon>{action.icon}</ListItemIcon>
            <ListItemText>{action.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
      >
        <MenuItem>
          <ListItemText primary="Tümü" />
        </MenuItem>
        <MenuItem>
          <ListItemText primary="Aktif" />
        </MenuItem>
        <MenuItem>
          <ListItemText primary="Pasif" />
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default AdvancedDataTable;