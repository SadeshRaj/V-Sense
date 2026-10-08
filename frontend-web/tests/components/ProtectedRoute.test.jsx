import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import ProtectedRoute from '../../src/components/ProtectedRoute'
import { getCurrentUser, getToken } from '../../src/api/auth'

vi.mock('../../src/api/auth', () => ({
    getCurrentUser: vi.fn(),
    getToken: vi.fn()
}))

const ProtectedContent = () => (
    <div>Protected Content</div>
)

const renderProtectedRoute = ({
    token = 'valid-token',
    user = { role: 'User' },
    allowedRoles
} = {}) => {
    getToken.mockReturnValue(token)
    getCurrentUser.mockReturnValue(user)

    return render(
        <MemoryRouter initialEntries={['/protected']}>
            <Routes>

                {/* Protected route */}
                <Route
                    path="/protected"
                    element={
                        <ProtectedRoute allowedRoles={allowedRoles}>
                            <ProtectedContent />
                        </ProtectedRoute>
                    }
                />

                {/* Redirect destinations */}
                <Route
                    path="/login"
                    element={<div>Login Page</div>}
                />

                <Route
                    path="/admin"
                    element={<div>Admin Page</div>}
                />

                <Route
                    path="/garage"
                    element={<div>Garage Page</div>}
                />

                <Route
                    path="/"
                    element={<div>Home Page</div>}
                />

            </Routes>
        </MemoryRouter>
    )
}

describe('ProtectedRoute Component', () => {

    beforeEach(() => {
        vi.clearAllMocks()
    })

    // FE-PROTECT-001
    it('should display protected content for an authenticated User with an allowed role', () => {
        renderProtectedRoute({
            token: 'valid-token',
            user: { role: 'User' },
            allowedRoles: ['User']
        })

        expect(
            screen.getByText('Protected Content')
        ).toBeInTheDocument()
    })

    // FE-PROTECT-002
    it('should display protected content for an authenticated Administrator with an allowed role', () => {
        renderProtectedRoute({
            token: 'valid-token',
            user: { role: 'Administrator' },
            allowedRoles: ['Administrator']
        })

        expect(
            screen.getByText('Protected Content')
        ).toBeInTheDocument()
    })

    // FE-PROTECT-003
    it('should display protected content for an authenticated Garage user with an allowed role', () => {
        renderProtectedRoute({
            token: 'valid-token',
            user: { role: 'Garage' },
            allowedRoles: ['Garage']
        })

        expect(
            screen.getByText('Protected Content')
        ).toBeInTheDocument()
    })

    // FE-PROTECT-004
    it('should display protected content for an authenticated ServiceCenter user with an allowed role', () => {
        renderProtectedRoute({
            token: 'valid-token',
            user: { role: 'ServiceCenter' },
            allowedRoles: ['ServiceCenter']
        })

        expect(
            screen.getByText('Protected Content')
        ).toBeInTheDocument()
    })

    // FE-PROTECT-005
    it('should redirect to login when the authentication token is missing', () => {
        renderProtectedRoute({
            token: null,
            user: { role: 'User' },
            allowedRoles: ['User']
        })

        expect(
            screen.getByText('Login Page')
        ).toBeInTheDocument()

        expect(
            screen.queryByText('Protected Content')
        ).not.toBeInTheDocument()
    })

    // FE-PROTECT-006
    it('should redirect to login when the current user is missing', () => {
        renderProtectedRoute({
            token: 'valid-token',
            user: null,
            allowedRoles: ['User']
        })

        expect(
            screen.getByText('Login Page')
        ).toBeInTheDocument()

        expect(
            screen.queryByText('Protected Content')
        ).not.toBeInTheDocument()
    })

    // FE-PROTECT-007
    it('should redirect to login when both token and user are missing', () => {
        renderProtectedRoute({
            token: null,
            user: null,
            allowedRoles: ['User']
        })

        expect(
            screen.getByText('Login Page')
        ).toBeInTheDocument()

        expect(
            screen.queryByText('Protected Content')
        ).not.toBeInTheDocument()
    })

    // FE-PROTECT-008
    it('should redirect an Administrator to the admin page when the role is not allowed', () => {
        renderProtectedRoute({
            token: 'valid-token',
            user: { role: 'Administrator' },
            allowedRoles: ['Garage']
        })

        expect(
            screen.getByText('Admin Page')
        ).toBeInTheDocument()

        expect(
            screen.queryByText('Protected Content')
        ).not.toBeInTheDocument()
    })

    // FE-PROTECT-009
    it('should redirect a Garage user to the garage page when the role is not allowed', () => {
        renderProtectedRoute({
            token: 'valid-token',
            user: { role: 'Garage' },
            allowedRoles: ['Administrator']
        })

        expect(
            screen.getByText('Garage Page')
        ).toBeInTheDocument()

        expect(
            screen.queryByText('Protected Content')
        ).not.toBeInTheDocument()
    })

    // FE-PROTECT-010
    it('should redirect a ServiceCenter user to the garage page when the role is not allowed', () => {
        renderProtectedRoute({
            token: 'valid-token',
            user: { role: 'ServiceCenter' },
            allowedRoles: ['Administrator']
        })

        expect(
            screen.getByText('Garage Page')
        ).toBeInTheDocument()

        expect(
            screen.queryByText('Protected Content')
        ).not.toBeInTheDocument()
    })

    // FE-PROTECT-011
    it('should redirect an unauthorized normal user to the home page', () => {
        renderProtectedRoute({
            token: 'valid-token',
            user: { role: 'User' },
            allowedRoles: ['Administrator']
        })

        expect(
            screen.getByText('Home Page')
        ).toBeInTheDocument()

        expect(
            screen.queryByText('Protected Content')
        ).not.toBeInTheDocument()
    })

    // FE-PROTECT-012
    it('should allow an authenticated user when allowedRoles is not provided', () => {
        renderProtectedRoute({
            token: 'valid-token',
            user: { role: 'User' }
        })

        expect(
            screen.getByText('Protected Content')
        ).toBeInTheDocument()
    })

    // FE-PROTECT-013
    it('should allow an authenticated user when multiple roles are permitted', () => {
        renderProtectedRoute({
            token: 'valid-token',
            user: { role: 'Garage' },
            allowedRoles: ['Administrator', 'Garage', 'ServiceCenter']
        })

        expect(
            screen.getByText('Protected Content')
        ).toBeInTheDocument()
    })

    // FE-PROTECT-014
    it('should treat role names as case-sensitive', () => {
        renderProtectedRoute({
            token: 'valid-token',
            user: { role: 'administrator' },
            allowedRoles: ['Administrator']
        })

        expect(
            screen.getByText('Home Page')
        ).toBeInTheDocument()

        expect(
            screen.queryByText('Protected Content')
        ).not.toBeInTheDocument()
    })
})