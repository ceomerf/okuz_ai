import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import AuthGuard from '../Auth/AuthGuard';
import { apiService } from '../../services/api.service';

// Mock API service
jest.mock('../../services/api.service', () => ({
  apiService: {
    request: jest.fn(),
  },
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading when checking authentication', () => {
    mockApiService.request.mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(
      <TestWrapper>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </TestWrapper>
    );

    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument();
  });

  it('should render children when user is authenticated', async () => {
    mockApiService.request.mockResolvedValue({
      success: true,
      data: {
        id: '1',
        email: 'test@example.com',
        role: 'ADMIN',
        firstName: 'Test',
        lastName: 'User',
      },
    });

    render(
      <TestWrapper>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should redirect to login when authentication fails', async () => {
    mockApiService.request.mockRejectedValue(new Error('Unauthorized'));

    render(
      <TestWrapper>
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
    });
  });

  it('should show access denied for insufficient permissions', async () => {
    mockApiService.request.mockResolvedValue({
      success: true,
      data: {
        id: '1',
        email: 'test@example.com',
        role: 'STUDENT', // Insufficient role
        firstName: 'Test',
        lastName: 'User',
      },
    });

    render(
      <TestWrapper>
        <AuthGuard requiredRole="ADMIN">
          <div>Protected Content</div>
        </AuthGuard>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Erişim Yetkisi Yok')).toBeInTheDocument();
    });
  });
});
