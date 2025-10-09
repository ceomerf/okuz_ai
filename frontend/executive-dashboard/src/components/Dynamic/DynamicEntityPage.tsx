import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Breadcrumbs,
  Link,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import DynamicTable from './DynamicTable';
import DynamicForm from './DynamicForm';
import { apiService } from '../../services/api.service';

interface EntitySchema {
  id: string;
  entityName: string;
  displayName: string;
  description?: string;
  apiEndpoint: string;
  icon?: string;
  color?: string;
  schema: {
    fields: Array<{
      name: string;
      label: string;
      type: string;
      required?: boolean;
      showInTable?: boolean;
      options?: Array<{ value: string; label: string }>;
    }>;
  };
}

interface EntityData {
  items: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const DynamicEntityPage: React.FC = () => {
  const { entityName } = useParams<{ entityName: string }>();
  const navigate = useNavigate();
  
  const [schema, setSchema] = useState<EntitySchema | null>(null);
  const [data, setData] = useState<EntityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Schema'yı yükle
  useEffect(() => {
    loadSchema();
  }, [entityName]);

  // Veriyi yükle
  useEffect(() => {
    if (schema) {
      loadData();
    }
  }, [schema, page, search]);

  const loadSchema = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.request(`/api/schemas/${entityName}`);
      if (response.success) {
        setSchema(response.data);
      } else {
        setError('Schema yüklenemedi');
      }
    } catch (err) {
      setError('Schema yüklenirken hata oluştu');
      console.error('Schema load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!schema) return;
    
    try {
      setLoading(true);
      const response = await apiService.request(
        `${schema.apiEndpoint}?page=${page}&limit=10${search ? `&search=${search}` : ''}`
      );
      
      if (response.success) {
        setData(response.data);
      } else {
        setError('Veri yüklenemedi');
      }
    } catch (err) {
      setError('Veri yüklenirken hata oluştu');
      console.error('Data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!schema) return;
    
    if (window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
      try {
        const response = await apiService.request(
          `${schema.apiEndpoint}/${id}`,
          { method: 'DELETE' }
        );
        
        if (response.success) {
          loadData(); // Veriyi yenile
        } else {
          setError('Kayıt silinemedi');
        }
      } catch (err) {
        setError('Kayıt silinirken hata oluştu');
        console.error('Delete error:', err);
      }
    }
  };

  const handleFormSubmit = async (formData: any) => {
    if (!schema) return;
    
    try {
      let response;
      if (editingItem) {
        // Güncelleme
        response = await apiService.request(
          `${schema.apiEndpoint}/${editingItem.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(formData),
          }
        );
      } else {
        // Yeni kayıt
        response = await apiService.request(schema.apiEndpoint, {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      
      if (response.success) {
        setFormOpen(false);
        setEditingItem(null);
        loadData(); // Veriyi yenile
      } else {
        setError(editingItem ? 'Kayıt güncellenemedi' : 'Kayıt oluşturulamadı');
      }
    } catch (err) {
      setError(editingItem ? 'Kayıt güncellenirken hata oluştu' : 'Kayıt oluşturulurken hata oluştu');
      console.error('Form submit error:', err);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  if (loading && !schema) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={loadSchema} variant="outlined">
          Tekrar Dene
        </Button>
      </Container>
    );
  }

  if (!schema) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">
          Schema bulunamadı: {entityName}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/dashboard')}
          sx={{ textDecoration: 'none' }}
        >
          Dashboard
        </Link>
        <Typography color="text.primary">{schema.displayName}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                backgroundColor: schema.color || '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              {schema.icon || '📋'}
            </Box>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                {schema.displayName}
              </Typography>
              {schema.description && (
                <Typography variant="body1" color="text.secondary">
                  {schema.description}
                </Typography>
              )}
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Yenile">
              <IconButton onClick={handleRefresh} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreate}
              sx={{ borderRadius: 2 }}
            >
              Yeni {schema.displayName.slice(0, -1)}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Dynamic Table */}
      {data && (
        <DynamicTable
          data={data.items}
          schema={schema.schema}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          pagination={data.pagination}
          onPageChange={setPage}
          onSearchChange={setSearch}
        />
      )}

      {/* Dynamic Form */}
      <DynamicForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleFormSubmit}
        schema={schema.schema}
        initialData={editingItem}
        title={editingItem ? `${schema.displayName} Düzenle` : `Yeni ${schema.displayName.slice(0, -1)}`}
      />
    </Container>
  );
};

export default DynamicEntityPage;
