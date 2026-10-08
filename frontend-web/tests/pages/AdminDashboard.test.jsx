import React from 'react'

import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach
} from 'vitest'

import {
    render,
    screen,
    cleanup,
    waitFor
} from '@testing-library/react'

import userEvent from '@testing-library/user-event'

import {
    MemoryRouter,
    Routes,
    Route
} from 'react-router-dom'

import AdminDashboard from '../../src/pages/admin/AdminDashboard'

import {
    getCurrentUser
} from '../../src/api/auth'

import {
    getPendingRegistrations,
    getAllRegistrations,
    getAssignedVehicles,
    approveGarage,
    rejectGarage,
    deleteGarage
} from '../../src/api/adminApi'


/* ======================================================
   MOCK APIs
====================================================== */

vi.mock('../../src/api/auth', () => ({
    getCurrentUser: vi.fn()
}))

vi.mock('../../src/api/adminApi', () => ({
    getPendingRegistrations: vi.fn(),
    getAllRegistrations: vi.fn(),
    getAssignedVehicles: vi.fn(),
    approveGarage: vi.fn(),
    rejectGarage: vi.fn(),
    deleteGarage: vi.fn()
}))


/* ======================================================
   MOCK ICONS
====================================================== */

vi.mock('../../src/components/Icons', () => {
    const Icon = ({ className = '' }) => (
        <span
            className={className}
            aria-hidden="true"
        />
    )

    return {
        IconBuilding: Icon,
        IconClock: Icon,
        IconCheckCircle: Icon,
        IconXCircle: Icon,
        IconSearch: Icon,
        IconFileText: Icon,
        IconExternalLink: Icon,
        IconPhone: Icon,
        IconMail: Icon,
        IconMapPin: Icon,
        IconRefresh: Icon,
        IconAlertTriangle: Icon,
        IconWrench: Icon
    }
})


/* ======================================================
   TEST DATA
====================================================== */

const adminUser = {
    id: 1,
    role: 'Administrator',
    fullName: 'Main Administrator'
}

const adminAliasUser = {
    id: 2,
    role: 'Admin',
    fullName: 'Admin Alias'
}

const normalUser = {
    id: 3,
    role: 'User',
    fullName: 'Normal User'
}

const pendingPartner = {
    id: 101,
    businessName: 'ABC Auto Garage',
    registrationNumber: 'BR-1001',
    fullName: 'John Silva',
    email: 'john@abcgarage.com',
    phone: '+94771234567',
    role: 'Garage',
    approvalStatus: 'Pending',
    address: 'Colombo',
    latitude: '6.9271',
    longitude: '79.8612',
    brDocumentUrl: 'https://example.com/br.pdf',
    createdAt: '2026-01-10T00:00:00Z'
}

const activePartner = {
    id: 102,
    businessName: 'XYZ Service Center',
    registrationNumber: 'BR-1002',
    fullName: 'Nimal Perera',
    email: 'nimal@xyzservice.com',
    phone: '+94770000000',
    role: 'ServiceCenter',
    approvalStatus: 'Active',
    isActive: true,
    address: 'Kandy',
    createdAt: '2026-01-11T00:00:00Z'
}

const rejectedPartner = {
    id: 103,
    businessName: 'Rejected Motors',
    registrationNumber: 'BR-1003',
    fullName: 'Kamal Fernando',
    email: 'kamal@rejected.com',
    phone: '+94771111111',
    role: 'Garage',
    approvalStatus: 'Rejected',
    address: 'Galle',
    createdAt: '2026-01-12T00:00:00Z'
}

const assignedVehicle = {
    id: 201,
    make: 'Toyota',
    model: 'Corolla',
    manufacturingYear: 2022,
    registrationNumber: 'WP CAQ-5834',
    vin: 'JT2AW19E3X0284592',
    fuelType: 'Petrol',
    ownerName: 'Kasun Silva',
    ownerEmail: 'kasun@example.com',
    ownerPhone: '+94772222222',
    transactionId: 'TXN-001',
    assignedAt: '2026-02-01T00:00:00Z'
}

const secondVehicle = {
    id: 202,
    make: 'Honda',
    model: 'Civic',
    manufacturingYear: 2021,
    registrationNumber: 'CP CAB-1234',
    vin: 'VIN-SECOND-001',
    fuelType: 'Hybrid',
    ownerName: 'Amal Perera',
    ownerEmail: 'amal@example.com',
    ownerPhone: '+94773333333',
    transactionId: 'TXN-002',
    assignedAt: '2026-02-02T00:00:00Z'
}


/* ======================================================
   DEFAULT MOCK SETUP
====================================================== */

const setupSuccessfulAPIs = () => {

    getPendingRegistrations.mockResolvedValue([
        pendingPartner
    ])

    getAllRegistrations.mockResolvedValue([
        pendingPartner,
        activePartner,
        rejectedPartner
    ])

    getAssignedVehicles.mockResolvedValue([
        assignedVehicle,
        secondVehicle
    ])
}


/* ======================================================
   RENDER HELPER
====================================================== */

const renderAdmin = (user = adminUser) => {

    getCurrentUser.mockReturnValue(user)

    return render(
        <MemoryRouter initialEntries={['/admin']}>

            <Routes>

                <Route
                    path="/admin"
                    element={<AdminDashboard />}
                />

                <Route
                    path="/login"
                    element={<div>Login Page</div>}
                />

            </Routes>

        </MemoryRouter>
    )
}


/* ======================================================
   SETUP / CLEANUP
====================================================== */

beforeEach(() => {

    vi.clearAllMocks()

    setupSuccessfulAPIs()

    vi.spyOn(window, 'confirm')
        .mockReturnValue(true)
})

afterEach(() => {

    cleanup()

    vi.restoreAllMocks()
})


/* ======================================================
   AUTHENTICATION / AUTHORIZATION
====================================================== */

describe(
    'AdminDashboard - Authentication and Authorization',
    () => {

        // FE-ADMIN-001
        it(
            'should allow an Administrator to access the dashboard',
            async () => {

                renderAdmin(adminUser)

                expect(
                    await screen.findByText(
                        'Pending Partner Reviews'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-002
        it(
            'should allow the Admin role to access the dashboard',
            async () => {

                renderAdmin(adminAliasUser)

                expect(
                    await screen.findByText(
                        'Pending Partner Reviews'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-003
        it(
            'should redirect unauthenticated users to login',
            async () => {

                renderAdmin(null)

                expect(
                    await screen.findByText(
                        'Login Page'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-004
        it(
            'should redirect a non-admin user to login',
            async () => {

                renderAdmin(normalUser)

                expect(
                    await screen.findByText(
                        'Login Page'
                    )
                ).toBeInTheDocument()
            }
        )

    }
)


/* ======================================================
   DASHBOARD DATA
====================================================== */

describe(
    'AdminDashboard - Dashboard Data',
    () => {

        // FE-ADMIN-005
        it(
            'should display the loading state while dashboard data is loading',
            async () => {

                getPendingRegistrations.mockReturnValue(
                    new Promise(() => {})
                )

                getAllRegistrations.mockReturnValue(
                    new Promise(() => {})
                )

                getAssignedVehicles.mockReturnValue(
                    new Promise(() => {})
                )

                renderAdmin()

                expect(
                    screen.getByText(
                        'Loading registrations...'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-006
        it(
            'should display dashboard data after successful loading',
            async () => {

                renderAdmin()

                expect(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'Toyota Corolla (2022)'
                    )
                ).toBeInTheDocument()

                expect(
                    getPendingRegistrations
                ).toHaveBeenCalledTimes(1)

                expect(
                    getAllRegistrations
                ).toHaveBeenCalledTimes(1)

                expect(
                    getAssignedVehicles
                ).toHaveBeenCalledTimes(1)
            }
        )


        // FE-ADMIN-007
        it(
            'should display an error when dashboard loading fails',
            async () => {

                getPendingRegistrations.mockRejectedValue(
                    new Error(
                        'Dashboard data unavailable'
                    )
                )

                renderAdmin()

                expect(
                    await screen.findByText(
                        'Dashboard data unavailable'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'Try again'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-008
        it(
            'should reload dashboard data when Try again is clicked',
            async () => {

                getPendingRegistrations
                    .mockRejectedValueOnce(
                        new Error(
                            'Temporary failure'
                        )
                    )
                    .mockResolvedValueOnce([
                        pendingPartner
                    ])

                const user = userEvent.setup()

                renderAdmin()

                await screen.findByText(
                    'Temporary failure'
                )

                await user.click(
                    screen.getByText(
                        'Try again'
                    )
                )

                expect(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                ).toBeInTheDocument()

                expect(
                    getPendingRegistrations
                ).toHaveBeenCalledTimes(2)
            }
        )


        // FE-ADMIN-009
        it(
            'should display the pending partner count',
            async () => {

                renderAdmin()

                await screen.findByText(
                    'ABC Auto Garage'
                )

                const metric =
                    screen.getByText(
                        'Pending Partner Reviews'
                    ).closest('div')

                expect(
                    metric.querySelector('h3')
                        .textContent
                ).toBe('1')
            }
        )


        // FE-ADMIN-010
        it(
            'should calculate the active partner count correctly',
            async () => {

                renderAdmin()

                await screen.findByText(
                    'ABC Auto Garage'
                )

                const metric =
                    screen.getByText(
                        'Active Network Partners'
                    ).closest('div')

                expect(
                    metric.querySelector('h3')
                        .textContent
                ).toBe('1')
            }
        )


        // FE-ADMIN-011
        it(
            'should display the total partner count',
            async () => {

                renderAdmin()

                await screen.findByText(
                    'ABC Auto Garage'
                )

                const metric =
                    screen.getByText(
                        'Total Onboardings'
                    ).closest('div')

                expect(
                    metric.querySelector('h3')
                        .textContent
                ).toBe('3')
            }
        )


        // FE-ADMIN-012
        it(
            'should display the assigned vehicle count',
            async () => {

                renderAdmin()

                await screen.findByText(
                    'Toyota Corolla (2022)'
                )

                const metric =
                    screen.getByText(
                        'Assigned Vehicles'
                    ).closest('div')

                expect(
                    metric.querySelector('h3')
                        .textContent
                ).toBe('2')
            }
        )

    }
)


/* ======================================================
   PARTNER MANAGEMENT
====================================================== */

describe(
    'AdminDashboard - Partner Management',
    () => {

        // FE-ADMIN-013
        it(
            'should display only pending partners by default',
            async () => {

                renderAdmin()

                expect(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.queryByText(
                        'Rejected Motors'
                    )
                ).not.toBeInTheDocument()

                expect(
                    screen.queryByText(
                        'XYZ Service Center'
                    )
                ).not.toBeInTheDocument()
            }
        )


        // FE-ADMIN-014
        it(
            'should switch to the All Partners tab',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                await screen.findByText(
                    'ABC Auto Garage'
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: /All Partners/i
                        }
                    )
                )

                expect(
                    screen.getByText(
                        'XYZ Service Center'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'Rejected Motors'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-015
        it(
            'should search partners by business name',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                const input =
                    screen.getByPlaceholderText(
                        'Search partner or BR...'
                    )

                await user.type(
                    input,
                    'ABC Auto Garage'
                )

                expect(
                    screen.getByText(
                        'ABC Auto Garage'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.queryByText(
                        'No pending applications'
                    )
                ).not.toBeInTheDocument()
            }
        )


        // FE-ADMIN-016
        it(
            'should search partners by BR number',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                const input =
                    screen.getByPlaceholderText(
                        'Search partner or BR...'
                    )

                await user.type(
                    input,
                    'BR-1001'
                )

                expect(
                    screen.getByText(
                        'ABC Auto Garage'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-017
        it(
            'should search partners by email',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                const input =
                    screen.getByPlaceholderText(
                        'Search partner or BR...'
                    )

                await user.type(
                    input,
                    'john@abcgarage.com'
                )

                expect(
                    screen.getByText(
                        'ABC Auto Garage'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-018
        it(
            'should search partners by contact name',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                const input =
                    screen.getByPlaceholderText(
                        'Search partner or BR...'
                    )

                await user.type(
                    input,
                    'John Silva'
                )

                expect(
                    screen.getByText(
                        'ABC Auto Garage'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-019
        it(
            'should display no pending applications when there is no search match',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                const input =
                    screen.getByPlaceholderText(
                        'Search partner or BR...'
                    )

                await user.type(
                    input,
                    'NOT-FOUND'
                )

                expect(
                    await screen.findByText(
                        'No pending applications'
                    )
                ).toBeInTheDocument()
            }
        )

    }
)


/* ======================================================
   PARTNER DETAILS / DOCUMENT
====================================================== */

describe(
    'AdminDashboard - Partner Details',
    () => {

// FE-ADMIN-020
it(
    'should open the partner details modal',
    async () => {

        const user = userEvent.setup()

        renderAdmin()

        await user.click(
            await screen.findByText(
                'ABC Auto Garage'
            )
        )

        // Modal-specific element
        expect(
            screen.getByRole(
                'button',
                {
                    name: 'Delete Partner'
                }
            )
        ).toBeInTheDocument()

        // Another element that only appears inside the modal
        expect(
            screen.getByText(
                'Physical Address & GPS Location'
            )
        ).toBeInTheDocument()
    }
)


        // FE-ADMIN-021
        it(
            'should display the correct pending status in partner details',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                await user.click(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                )

                expect(
                    screen.getByText(
                        'Pending Review'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-022
        it(
            'should open the BR document inspector',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                await user.click(
                    await screen.findByRole(
                        'button',
                        {
                            name: 'Inspect BR'
                        }
                    )
                )

                expect(
                    screen.getByText(
                        'Business Registration Certificate'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByTitle(
                        'BR Document'
                    )
                ).toBeInTheDocument()
            }
        )

    }
)


/* ======================================================
   APPROVE PARTNER
====================================================== */

describe(
    'AdminDashboard - Approve Partner',
    () => {

        // FE-ADMIN-023
        it(
            'should not approve a partner when confirmation is cancelled',
            async () => {

                window.confirm.mockReturnValue(
                    false
                )

                const user =
                    userEvent.setup()

                renderAdmin()

                await user.click(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Approve'
                        }
                    )
                )

                expect(
                    approveGarage
                ).not.toHaveBeenCalled()
            }
        )


        // FE-ADMIN-024
        it(
            'should approve a partner successfully after confirmation',
            async () => {

                window.confirm.mockReturnValue(
                    true
                )

                approveGarage.mockResolvedValue(
                    {}
                )

                const user =
                    userEvent.setup()

                renderAdmin()

                await user.click(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Approve'
                        }
                    )
                )

                expect(
                    approveGarage
                ).toHaveBeenCalledWith(
                    pendingPartner.id
                )

                expect(
                    await screen.findByText(
                        /Approved ABC Auto Garage!/
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-025
        it(
            'should display an error notification when approval fails',
            async () => {

                approveGarage.mockRejectedValue(
                    new Error(
                        'Approval failed'
                    )
                )

                const user =
                    userEvent.setup()

                renderAdmin()

                await user.click(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Approve'
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'Approval failed'
                    )
                ).toBeInTheDocument()
            }
        )

    }
)


/* ======================================================
   REJECT PARTNER
====================================================== */

describe(
    'AdminDashboard - Reject Partner',
    () => {

        // FE-ADMIN-026
        it(
            'should open the rejection modal with a default reason',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                await user.click(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Reject'
                        }
                    )
                )

                expect(
                    screen.getByText(
                        'Reject Partner Application'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByPlaceholderText(
                        'State why the application is rejected...'
                    )
                ).toHaveValue(
                    'Business Registration document could not be verified.'
                )
            }
        )


        // FE-ADMIN-027
        it(
            'should disable Confirm Rejection when the rejection reason is empty',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                await user.click(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Reject'
                        }
                    )
                )

                const reason =
                    screen.getByPlaceholderText(
                        'State why the application is rejected...'
                    )

                await user.clear(
                    reason
                )

                expect(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Confirm Rejection'
                        }
                    )
                ).toBeDisabled()
            }
        )


        // FE-ADMIN-028
        it(
            'should close the rejection modal when Cancel is clicked',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                await user.click(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Reject'
                        }
                    )
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Cancel'
                        }
                    )
                )

                expect(
                    screen.queryByText(
                        'Reject Partner Application'
                    )
                ).not.toBeInTheDocument()
            }
        )


        // FE-ADMIN-029
        it(
            'should reject a partner successfully',
            async () => {

                rejectGarage.mockResolvedValue(
                    {}
                )

                const user =
                    userEvent.setup()

                renderAdmin()

                await user.click(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Reject'
                        }
                    )
                )

                const reason =
                    screen.getByPlaceholderText(
                        'State why the application is rejected...'
                    )

                await user.clear(
                    reason
                )

                await user.type(
                    reason,
                    'Invalid BR document'
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Confirm Rejection'
                        }
                    )
                )

                expect(
                    rejectGarage
                ).toHaveBeenCalledWith(
                    pendingPartner.id,
                    'Invalid BR document'
                )

                expect(
                    await screen.findByText(
                        /Rejected ABC Auto Garage/
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-030
        it(
            'should display an error when partner rejection fails',
            async () => {

                rejectGarage.mockRejectedValue(
                    new Error(
                        'Rejection failed'
                    )
                )

                const user =
                    userEvent.setup()

                renderAdmin()

                await user.click(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Reject'
                        }
                    )
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Confirm Rejection'
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'Rejection failed'
                    )
                ).toBeInTheDocument()
            }
        )

    }
)


/* ======================================================
   DELETE PARTNER
====================================================== */

describe(
    'AdminDashboard - Delete Partner',
    () => {

        // FE-ADMIN-031
        it(
            'should not delete a partner when confirmation is cancelled',
            async () => {

                window.confirm.mockReturnValue(
                    false
                )

                const user =
                    userEvent.setup()

                renderAdmin()

                await user.click(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Delete Partner'
                        }
                    )
                )

                expect(
                    deleteGarage
                ).not.toHaveBeenCalled()
            }
        )


        // FE-ADMIN-032
        it(
            'should delete a partner successfully after confirmation',
            async () => {

                window.confirm.mockReturnValue(
                    true
                )

                deleteGarage.mockResolvedValue(
                    {}
                )

                const user =
                    userEvent.setup()

                renderAdmin()

                await user.click(
                    await screen.findByText(
                        'ABC Auto Garage'
                    )
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Delete Partner'
                        }
                    )
                )

                expect(
                    deleteGarage
                ).toHaveBeenCalledWith(
                    pendingPartner.id
                )

                expect(
                    await screen.findByText(
                        /Deleted partner/
                    )
                ).toBeInTheDocument()
            }
        )

    }
)


/* ======================================================
   ASSIGNED VEHICLES
====================================================== */

describe(
    'AdminDashboard - Assigned Vehicles',
    () => {

        // FE-ADMIN-033
        it(
            'should display assigned vehicles',
            async () => {

                renderAdmin()

                expect(
                    await screen.findByText(
                        'Toyota Corolla (2022)'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'Honda Civic (2021)'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-034
        it(
            'should filter assigned vehicles by registration number',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                await screen.findByText(
                    'Toyota Corolla (2022)'
                )

                const input =
                    screen.getByPlaceholderText(
                        'Search by Reg No, VIN, Make or Owner...'
                    )

                await user.type(
                    input,
                    'WP CAQ-5834'
                )

                expect(
                    screen.getByText(
                        'Toyota Corolla (2022)'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.queryByText(
                        'Honda Civic (2021)'
                    )
                ).not.toBeInTheDocument()
            }
        )


        // FE-ADMIN-035
        it(
            'should display no assigned vehicles when no vehicle matches the search',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                await screen.findByText(
                    'Toyota Corolla (2022)'
                )

                await user.type(
                    screen.getByPlaceholderText(
                        'Search by Reg No, VIN, Make or Owner...'
                    ),
                    'NOT-FOUND'
                )

                expect(
                    await screen.findByText(
                        'No assigned vehicles found'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-036
        it(
            'should refresh the assigned vehicles list',
            async () => {

                const user =
                    userEvent.setup()

                getAssignedVehicles
                    .mockResolvedValueOnce([
                        assignedVehicle,
                        secondVehicle
                    ])
                    .mockResolvedValueOnce([
                        assignedVehicle
                    ])

                renderAdmin()

                await screen.findByText(
                    'Toyota Corolla (2022)'
                )

                const refreshButton =
                    screen.getByTitle(
                        'Refresh vehicles list'
                    )

                await user.click(
                    refreshButton
                )

                await waitFor(() => {
                    expect(
                        getAssignedVehicles
                    ).toHaveBeenCalledTimes(2)
                })
            }
        )


        // FE-ADMIN-037
        it(
            'should open the vehicle assignment details modal',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                await screen.findByText(
                    'Toyota Corolla (2022)'
                )

                const inspectButtons =
                    screen.getAllByRole(
                        'button',
                        {
                            name: 'Inspect Record'
                        }
                    )

                await user.click(
                    inspectButtons[0]
                )

                expect(
                    screen.getByText(
                        'Vehicle Assignment Details'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getAllByText(
                        'WP CAQ-5834'
                    ).length
                ).toBeGreaterThan(0)

                expect(
                    screen.getByText(
                        'Kasun Silva'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-ADMIN-038
        it(
            'should close the vehicle details modal',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                await screen.findByText(
                    'Toyota Corolla (2022)'
                )

                const inspectButtons =
                    screen.getAllByRole(
                        'button',
                        {
                            name: 'Inspect Record'
                        }
                    )

                await user.click(
                    inspectButtons[0]
                )

                expect(
                    screen.getByText(
                        'Vehicle Assignment Details'
                    )
                ).toBeInTheDocument()

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Close Details'
                        }
                    )
                )

                expect(
                    screen.queryByText(
                        'Vehicle Assignment Details'
                    )
                ).not.toBeInTheDocument()
            }
        )

    }
)