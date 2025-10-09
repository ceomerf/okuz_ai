import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import BaseWidget from './BaseWidget';

// Chart.js bileşenlerini kaydet
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface LineChartWidgetProps {
  title: string;
  description?: string;
  data: any;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onSettings?: () => void;
}

const LineChartWidget: React.FC<LineChartWidgetProps> = ({
  title,
  description,
  data,
  loading = false,
  error,
  onRefresh,
  onSettings,
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Veriyi Chart.js formatına dönüştür
  const processData = (rawData: any) => {
    if (!rawData || !Array.isArray(rawData)) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // Veri formatını belirle
    const firstItem = rawData[0];
    if (!firstItem) return { labels: [], datasets: [] };

    // Eğer veri { date: '2024-01', value: 100 } formatındaysa
    if (firstItem.date && firstItem.value !== undefined) {
      return {
        labels: rawData.map((item: any) => item.date),
        datasets: [
          {
            label: 'Değer',
            data: rawData.map((item: any) => item.value),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            fill: true,
            tension: 0.4,
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
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            fill: true,
            tension: 0.4,
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
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: true,
            tension: 0.4,
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
          borderColor: 'rgb(153, 102, 255)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          fill: true,
          tension: 0.4,
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
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
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
          <Line ref={chartRef} data={chartData} options={options} />
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

export default LineChartWidget;
