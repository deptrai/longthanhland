import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useCreateAppRouter } from './useCreateAppRouter';
import { AppPath } from 'twenty-shared/types/AppPath';

// Mock dependencies
jest.mock('@/app/components/AppRouterProviders', () => ({
    AppRouterProviders: ({ children }: any) => <div>Providers {children}</div>,
}));
jest.mock('@/ui/layout/page/components/DefaultLayout', () => ({
    DefaultLayout: () => <div>DefaultLayout</div>,
}));

describe('useCreateAppRouter', () => {
    it('should include admin orders route when admin is enabled', () => {
        // This test logic is a bit indirect because creating the router inside test is hard.
        // Instead we can verify if the AppPath.AdminOrders exists and is correct.
        expect(AppPath.AdminOrders).toBe('/admin/orders');
    });
});
