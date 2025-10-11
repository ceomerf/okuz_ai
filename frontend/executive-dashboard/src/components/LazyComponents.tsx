import React, { Suspense, lazy } from 'react';
import { CircularProgress, Box } from '@mui/material';

// Loading component
const LoadingSpinner = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '200px',
    }}
  >
    <CircularProgress />
  </Box>
);

// Lazy load components
export const LazyDashboard = lazy(() => import('./Dashboard/DynamicDashboard'));
export const LazyStudents = lazy(() => import('./Dynamic/DynamicEntityPage'));
export const LazyTeachers = lazy(() => import('./Dynamic/DynamicEntityPage'));
export const LazyCourses = lazy(() => import('./Dynamic/DynamicEntityPage'));
export const LazyUsers = lazy(() => import('./Dynamic/DynamicEntityPage'));
export const LazyAnalytics = lazy(() => import('./Dashboard/AdvancedDashboard'));
export const LazyReports = lazy(() => import('./Dashboard/AdvancedDashboard'));
export const LazySettings = lazy(() => import('./Dashboard/AdvancedDashboard'));

// Higher-order component for lazy loading with suspense
export const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => (
    <Suspense fallback={<LoadingSpinner />}>
      <Component {...props} />
    </Suspense>
  );
};

// Pre-configured lazy components with suspense
export const LazyDashboardWithSuspense = withLazyLoading(LazyDashboard);
export const LazyStudentsWithSuspense = withLazyLoading(LazyStudents);
export const LazyTeachersWithSuspense = withLazyLoading(LazyTeachers);
export const LazyCoursesWithSuspense = withLazyLoading(LazyCourses);
export const LazyUsersWithSuspense = withLazyLoading(LazyUsers);
export const LazyAnalyticsWithSuspense = withLazyLoading(LazyAnalytics);
export const LazyReportsWithSuspense = withLazyLoading(LazyReports);
export const LazySettingsWithSuspense = withLazyLoading(LazySettings);
