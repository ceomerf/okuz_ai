import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';

interface VirtualizedTableProps {
  data: any[];
  columns: Array<{
    key: string;
    label: string;
    width?: number;
    render?: (value: any, row: any) => React.ReactNode;
  }>;
  height?: number;
  loading?: boolean;
  onRowClick?: (row: any) => void;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: any[];
    columns: any[];
    onRowClick?: (row: any) => void;
  };
}

const Row: React.FC<RowProps> = ({ index, style, data }) => {
  const { items, columns, onRowClick } = data;
  const row = items[index];

  if (!row) {
    return (
      <div style={style}>
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <CircularProgress size={20} />
        </Box>
      </div>
    );
  }

  return (
    <div style={style}>
      <TableRow
        hover
        onClick={() => onRowClick?.(row)}
        sx={{
          cursor: onRowClick ? 'pointer' : 'default',
          '&:hover': onRowClick ? { backgroundColor: 'action.hover' } : {},
        }}
      >
        {columns.map((column) => (
          <TableCell
            key={column.key}
            sx={{
              width: column.width || 'auto',
              maxWidth: column.width || 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {column.render ? column.render(row[column.key], row) : row[column.key]}
          </TableCell>
        ))}
      </TableRow>
    </div>
  );
};

const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  data,
  columns,
  height = 400,
  loading = false,
  onRowClick,
}) => {
  const itemData = useMemo(
    () => ({
      items: data,
      columns,
      onRowClick,
    }),
    [data, columns, onRowClick]
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Veri bulunamadı
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ height }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                sx={{
                  width: column.width || 'auto',
                  fontWeight: 'bold',
                  backgroundColor: 'background.paper',
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
      </Table>
      <Box sx={{ height: height - 57 }}> {/* Subtract header height */}
        <List
          height={height - 57}
          width="100%"
          itemCount={data.length}
          itemSize={53} // Approximate row height
          itemData={itemData}
        >
          {Row}
        </List>
      </Box>
    </TableContainer>
  );
};

export default VirtualizedTable;