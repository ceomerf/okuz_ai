import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { Box, Typography } from '@mui/material';
import BaseWidget from './BaseWidget';

// Chart.js bileşenlerini kaydet
ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartWidgetProps {
  title: string;
  description?: string;
  data: any;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onSettings?: () => void;
}

const PieChartWidget: React.FC<PieChartWidgetProps> = ({
  title,
  description,
  data,
  loading = false,
  error,
  onRefresh,
  onSettings,
}) => {
  const chartRef = useRef<ChartJS<'pie'>>(null);

  // Veriyi Chart.js formatına dönüştür
  const processData = (rawData: any) => {
    if (!rawData || !Array.isArray(rawData)) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const firstItem = rawData[0];
    if (!firstItem) return { labels: [], datasets: [] };

    // Eğer veri { grade: '9', count: 50 } formatındaysa
    if (firstItem.grade && firstItem.count !== undefined) {
      return {
        labels: rawData.map((item: any) => `${item.grade}. Sınıf`),
        datasets: [
          {
            data: rawData.map((item: any) => item.count),
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40',
            ],
            borderColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40',
            ],
            borderWidth: 2,
          },
        ],
      };
    }

    // Eğer veri { role: 'STUDENT', count: 100 } formatındaysa
    if (firstItem.role && firstItem.count !== undefined) {
      const roleLabels: Record<string, string> = {
        'STUDENT': 'Öğrenci',
        'TEACHER': 'Öğretmen',
        'PARENT': 'Veli',
        'ADMIN': 'Admin',
      };

      return {
        labels: rawData.map((item: any) => roleLabels[item.role] || item.role),
        datasets: [
          {
            data: rawData.map((item: any) => item.count),
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
            ],
            borderColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
            ],
            borderWidth: 2,
          },
        ],
      };
    }

    // Eğer veri { label: 'A', value: 10 } formatındaysa
    if (firstItem.label && firstItem.value !== undefined) {
      return {
        labels: rawData.map((item: any) => item.label),
        datasets: [
          {
            data: rawData.map((item: any) => item.value),
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40',
            ],
            borderColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40',
            ],
            borderWidth: 2,
          },
        ],
      };
    }

    // Varsayılan format
    return {
      labels: rawData.map((_, index) => `Veri ${index + 1}`),
      datasets: [
        {
          data: rawData.map((item: any) => typeof item === 'number' ? item : 0),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
          ],
          borderColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  const chartData = processData(data);
  const hasData = chartData.labels.length > 0;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        display: hasData,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    interaction: {
      intersect: false,
    },
  };

  return (
    <BaseWidget
      title={title}
      description={description}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      onSettings={onSettings}
    >
      <Box sx={{ height: '100%', minHeight: 200 }}>
        {hasData ? (
          <Pie ref={chartRef} data={chartData} options={options} />
        ) : (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">
              Veri bulunamadı
            </Typography>
          </Box>
        )}
      </Box>
    </BaseWidget>
  );
};

export default PieChartWidget;
