import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import BaseWidget from './BaseWidget';

// Chart.js bileşenlerini kaydet
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartWidgetProps {
  title: string;
  description?: string;
  data: any;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onSettings?: () => void;
}

const BarChartWidget: React.FC<BarChartWidgetProps> = ({
  title,
  description,
  data,
  loading = false,
  error,
  onRefresh,
  onSettings,
}) => {
  const chartRef = useRef<ChartJS<'bar'>>(null);

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
            label: 'Öğrenci Sayısı',
            data: rawData.map((item: any) => item.count),
            backgroundColor: [
              'rgba(255, 99, 132, 0.8)',
              'rgba(54, 162, 235, 0.8)',
              'rgba(255, 205, 86, 0.8)',
              'rgba(75, 192, 192, 0.8)',
              'rgba(153, 102, 255, 0.8)',
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 205, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
            ],
            borderWidth: 1,
          },
        ],
      };
    }

    // Eğer veri { month: 'Ocak', count: 50 } formatındaysa
    if (firstItem.month && firstItem.count !== undefined) {
      return {
        labels: rawData.map((item: any) => item.month),
        datasets: [
          {
            label: 'Sayı',
            data: rawData.map((item: any) => item.count),
            backgroundColor: 'rgba(54, 162, 235, 0.8)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
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
            label: 'Değer',
            data: rawData.map((item: any) => item.value),
            backgroundColor: 'rgba(75, 192, 192, 0.8)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
        ],
      };
    }

    // Varsayılan format
    return {
      labels: rawData.map((_, index) => `Veri ${index + 1}`),
      datasets: [
        {
          label: 'Değer',
          data: rawData.map((item: any) => typeof item === 'number' ? item : 0),
          backgroundColor: 'rgba(153, 102, 255, 0.8)',
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 1,
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
        position: 'top' as const,
        display: hasData,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
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
          <Bar ref={chartRef} data={chartData} options={options} />
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

export default BarChartWidget;
