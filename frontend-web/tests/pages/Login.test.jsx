import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Login from '../../src/pages/Login'
import { loginUser } from '../../src/api/auth'

vi.mock('../../src/api/auth', () => ({
  loginUser: vi.fn()
}))

const renderLogin = (initialRoute = '/login') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<div>Admin Page</div>} />
        <Route path="/garage" element={<div>Garage Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Login Component', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // TC-FE-LOGIN-001
  it('should display the login form correctly', () => {
    renderLogin()

    expect(
      screen.getByText('V-Sense Authentication')
    ).toBeInTheDocument()

    expect(
      screen.getByLabelText('Email Address')
    ).toBeInTheDocument()

    expect(
      screen.getByLabelText('Password')
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: 'Sign In' })
    ).toBeInTheDocument()
  })

  // TC-FE-LOGIN-002
  it('should require email and password', () => {
    renderLogin()

    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')

    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
  })

  // TC-FE-LOGIN-003
  it('should login an administrator and navigate to admin page', async () => {
    const user = userEvent.setup()

    loginUser.mockResolvedValue({
      role: 'Administrator'
    })

    renderLogin()

    await user.type(
      screen.getByLabelText('Email Address'),
      'admin@v-sense.com'
    )

    await user.type(
      screen.getByLabelText('Password'),
      'Admin123!'
    )

    await user.click(
      screen.getByRole('button', { name: 'Sign In' })
    )

    expect(await screen.findByText('Admin Page'))
      .toBeInTheDocument()

    expect(loginUser).toHaveBeenCalledWith(
      'admin@v-sense.com',
      'Admin123!'
    )
  })

  // TC-FE-LOGIN-004
  it('should login a garage user and navigate to garage page', async () => {
    const user = userEvent.setup()

    loginUser.mockResolvedValue({
      role: 'Garage'
    })

    renderLogin()

    await user.type(
      screen.getByLabelText('Email Address'),
      'garage@example.com'
    )

    await user.type(
      screen.getByLabelText('Password'),
      'Garage123!'
    )

    await user.click(
      screen.getByRole('button', { name: 'Sign In' })
    )

    expect(await screen.findByText('Garage Page'))
      .toBeInTheDocument()
  })

  // TC-FE-LOGIN-005
  it('should login a normal user and navigate to dashboard', async () => {
    const user = userEvent.setup()

    loginUser.mockResolvedValue({
      role: 'User'
    })

    renderLogin()

    await user.type(
      screen.getByLabelText('Email Address'),
      'user@example.com'
    )

    await user.type(
      screen.getByLabelText('Password'),
      'User123!'
    )

    await user.click(
      screen.getByRole('button', { name: 'Sign In' })
    )

    expect(await screen.findByText('Dashboard Page'))
      .toBeInTheDocument()
  })

  // TC-FE-LOGIN-006
  it('should display an error for invalid credentials', async () => {
    const user = userEvent.setup()

    loginUser.mockRejectedValue(
      new Error('Invalid email or password.')
    )

    renderLogin()

    await user.type(
      screen.getByLabelText('Email Address'),
      'wrong@example.com'
    )

    await user.type(
      screen.getByLabelText('Password'),
      'wrongpassword'
    )

    await user.click(
      screen.getByRole('button', { name: 'Sign In' })
    )

    expect(
      await screen.findByText('Invalid email or password.')
    ).toBeInTheDocument()
  })

  // TC-FE-LOGIN-007
  it('should display pending verification message', async () => {
    const user = userEvent.setup()

    loginUser.mockRejectedValue(
      new Error('Your account is pending verification')
    )

    renderLogin()

    await user.type(
      screen.getByLabelText('Email Address'),
      'pending@example.com'
    )

    await user.type(
      screen.getByLabelText('Password'),
      'Password123!'
    )

    await user.click(
      screen.getByRole('button', { name: 'Sign In' })
    )

    expect(
      await screen.findByText('Account Pending Verification')
    ).toBeInTheDocument()

    expect(
      screen.getByText('Your account is pending verification')
    ).toBeInTheDocument()
  })

  // TC-FE-LOGIN-008
  it('should display rejected registration message', async () => {
    const user = userEvent.setup()

    loginUser.mockRejectedValue(
      new Error('Your registration has been rejected')
    )

    renderLogin()

    await user.type(
      screen.getByLabelText('Email Address'),
      'rejected@example.com'
    )

    await user.type(
      screen.getByLabelText('Password'),
      'Password123!'
    )

    await user.click(
      screen.getByRole('button', { name: 'Sign In' })
    )

    expect(
      await screen.findByText('Registration Not Approved')
    ).toBeInTheDocument()

    expect(
      screen.getByText('Your registration has been rejected')
    ).toBeInTheDocument()
  })

  // TC-FE-LOGIN-009
  it('should show loading state while login is processing', async () => {
    const user = userEvent.setup()

    loginUser.mockImplementation(
      () => new Promise(() => {})
    )

    renderLogin()

    await user.type(
      screen.getByLabelText('Email Address'),
      'admin@v-sense.com'
    )

    await user.type(
      screen.getByLabelText('Password'),
      'Admin123!'
    )

    await user.click(
      screen.getByRole('button', { name: 'Sign In' })
    )

    expect(
      screen.getByText('Signing In...')
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button')
    ).toBeDisabled()
  })
})