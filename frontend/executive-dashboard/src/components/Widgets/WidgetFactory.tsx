import React from 'react';
import MetricCardWidget from './MetricCardWidget';
import LineChartWidget from './LineChartWidget';
import BarChartWidget from './BarChartWidget';
import PieChartWidget from './PieChartWidget';

interface WidgetProps {
  type: string;
  title: string;
  description?: string;
  data: any;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onSettings?: () => void;
}

const WidgetFactory: React.FC<WidgetProps> = (props) => {
  const { type, ...widgetProps } = props;

  switch (type) {
    case 'METRIC_CARD':
    case 'KPI_CARD':
      return <MetricCardWidget {...widgetProps} />;
    
    case 'LINE_CHART':
      return <LineChartWidget {...widgetProps} />;
    
    case 'BAR_CHART':
      return <BarChartWidget {...widgetProps} />;
    
    case 'PIE_CHART':
    case 'DONUT_CHART':
      return <PieChartWidget {...widgetProps} />;
    
    default:
      return (
        <div style={{ 
          padding: '16px', 
          border: '1px solid #ddd', 
          borderRadius: '4px',
          textAlign: 'center',
          color: '#666'
        }}>
          <p>Desteklenmeyen widget tipi: {type}</p>
        </div>
      );
  }
};

export default WidgetFactory;
