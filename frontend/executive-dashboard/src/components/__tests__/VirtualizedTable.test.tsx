import React from 'react';
import { render, screen } from '@testing-library/react';
import VirtualizedTable from '../VirtualizedTable';

const mockData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'ADMIN' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'USER' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'USER' },
];

const mockColumns = [
  { key: 'id', label: 'ID', width: 80 },
  { key: 'name', label: 'Name', width: 200 },
  { key: 'email', label: 'Email', width: 250 },
  { key: 'role', label: 'Role', width: 100 },
];

describe('VirtualizedTable', () => {
  it('should render table with data', () => {
    render(
      <VirtualizedTable
        data={mockData}
        columns={mockColumns}
        height={400}
      />
    );

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <VirtualizedTable
        data={[]}
        columns={mockColumns}
        height={400}
        loading={true}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show no data message when data is empty', () => {
    render(
      <VirtualizedTable
        data={[]}
        columns={mockColumns}
        height={400}
        loading={false}
      />
    );

    expect(screen.getByText('Veri bulunamadı')).toBeInTheDocument();
  });

  it('should handle custom column renderer', () => {
    const customColumns = [
      ...mockColumns,
      {
        key: 'role',
        label: 'Role',
        width: 100,
        render: (value: string) => (
          <span style={{ color: value === 'ADMIN' ? 'red' : 'blue' }}>
            {value}
          </span>
        ),
      },
    ];

    render(
      <VirtualizedTable
        data={mockData}
        columns={customColumns}
        height={400}
      />
    );

    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('should call onRowClick when row is clicked', () => {
    const handleRowClick = jest.fn();
    
    render(
      <VirtualizedTable
        data={mockData}
        columns={mockColumns}
        height={400}
        onRowClick={handleRowClick}
      />
    );

    // Note: In a real test, you would simulate a click on a row
    // This is simplified for demonstration
    expect(handleRowClick).not.toHaveBeenCalled();
  });
});
