import React, { useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Box,
  Chip,
  Typography,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';

interface Field {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  showInTable?: boolean;
  options?: Array<{ value: string; label: string }>;
}

interface Schema {
  fields: Field[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DynamicTableProps {
  data: any[];
  schema: Schema;
  loading?: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  pagination: Pagination;
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
}

const DynamicTable: React.FC<DynamicTableProps> = ({
  data,
  schema,
  loading = false,
  onEdit,
  onDelete,
  pagination,
  onPageChange,
  onSearchChange,
}) => {
  const [search, setSearch] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Tabloda gösterilecek alanları filtrele
  const visibleFields = schema.fields.filter(field => field.showInTable);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearch(value);
    onSearchChange(value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, item: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedItem(null);
  };

  const handleEdit = () => {
    if (selectedItem) {
      onEdit(selectedItem);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedItem) {
      onDelete(selectedItem.id);
    }
    handleMenuClose();
  };

  const formatCellValue = (value: any, field: Field) => {
    if (value === null || value === undefined) {
      return '-';
    }

    switch (field.type) {
      case 'boolean':
        return (
          <Chip
            label={value ? 'Evet' : 'Hayır'}
            color={value ? 'success' : 'default'}
            size="small"
          />
        );
      
      case 'select':
        const option = field.options?.find(opt => opt.value === value);
        return option ? option.label : value;
      
      case 'multiselect':
        if (Array.isArray(value)) {
          return (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {value.map((item, index) => {
                const option = field.options?.find(opt => opt.value === item);
                return (
                  <Chip
                    key={index}
                    label={option ? option.label : item}
                    size="small"
                    variant="outlined"
                  />
                );
              })}
            </Box>
          );
        }
        return value;
      
      case 'date':
        return new Date(value).toLocaleDateString('tr-TR');
      
      case 'number':
        return typeof value === 'number' ? value.toLocaleString('tr-TR') : value;
      
      default:
        return String(value);
    }
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {/* Search Bar */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          fullWidth
          placeholder="Ara..."
          value={search}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400 }}
        />
      </Box>

      {/* Table */}
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {visibleFields.map((field) => (
                <TableCell key={field.name} sx={{ fontWeight: 'bold' }}>
                  {field.label}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                İşlemler
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={visibleFields.length + 1} align="center" sx={{ py: 4 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleFields.length + 1} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    Veri bulunamadı
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item.id || index} hover>
                  {visibleFields.map((field) => (
                    <TableCell key={field.name}>
                      {formatCellValue(item[field.name], field)}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Tooltip title="Daha fazla">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, item)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={pagination.total}
        page={pagination.page - 1}
        onPageChange={(_, newPage) => onPageChange(newPage + 1)}
        rowsPerPage={pagination.limit}
        onRowsPerPageChange={() => {}} // Şimdilik sabit
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Sayfa başına:"
        labelDisplayedRows={({ from, to, count }) => 
          `${from}-${to} / ${count !== -1 ? count : `${to} dan fazla`}`
        }
      />

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Düzenle</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Sil</ListItemText>
        </MenuItem>
      </Menu>
    </Paper>
  );
};

export default DynamicTable;
