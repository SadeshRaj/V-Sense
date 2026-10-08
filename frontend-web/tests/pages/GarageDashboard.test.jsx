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
    fireEvent,
    waitFor
} from '@testing-library/react'

import userEvent from '@testing-library/user-event'

import {
    MemoryRouter,
    Routes,
    Route
} from 'react-router-dom'

import GarageDashboard from '../../src/pages/GarageDashboard'

import {
    getCurrentUser,
    logout
} from '../../src/api/auth'

import {
    searchVehicle
} from '../../src/api/vehicleApi'

import {
    createServiceRecord,
    getVehicleServiceRecords,
    getMyServiceRecords
} from '../../src/api/garageApi'


/* ======================================================
   MOCK API MODULES
====================================================== */

vi.mock('../../src/api/auth', () => ({
    getCurrentUser: vi.fn(),
    logout: vi.fn()
}))

vi.mock('../../src/api/vehicleApi', () => ({
    searchVehicle: vi.fn()
}))

vi.mock('../../src/api/garageApi', () => ({
    createServiceRecord: vi.fn(),
    getVehicleServiceRecords: vi.fn(),
    getMyServiceRecords: vi.fn()
}))


/* ======================================================
   MOCK CHECKUP REQUESTS PANEL
====================================================== */

vi.mock('../../src/components/CheckupRequestsPanel', () => ({
    default: ({ onCountsChange }) => (
        <div>
            <div>Mock Checkup Requests Panel</div>

            <button
                type="button"
                onClick={() => onCountsChange(3)}
            >
                Set Pending Count
            </button>
        </div>
    )
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
        IconCar: Icon,
        IconWrench: Icon,
        IconSearch: Icon,
        IconPlus: Icon,
        IconImage: Icon,
        IconCheckCircle: Icon,
        IconClock: Icon,
        IconAlertTriangle: Icon,
        IconLogOut: Icon,
        IconFileText: Icon,
        IconBuilding: Icon,
        IconUpload: Icon,
        IconEye: Icon,
        IconRefresh: Icon
    }
})


/* ======================================================
   TEST DATA
====================================================== */

const garageUser = {
    fullName: 'John Garage',
    role: 'Garage'
}

const serviceCenterUser = {
    fullName: 'ABC Service Center',
    role: 'ServiceCenter'
}

const administratorUser = {
    fullName: 'Admin User',
    role: 'Administrator'
}

const normalUser = {
    fullName: 'Normal User',
    role: 'User'
}

const vehicle = {
    id: 101,
    make: 'Toyota',
    model: 'Corolla',
    year: 2022,
    vehicleNumber: 'WP CAQ-5834',
    chassisNumber: 'JT2AW19E3X0284592',
    fuelType: 'Petrol',
    color: 'White'
}

const serviceHistory = [
    {
        id: 1,
        title: 'Oil Change',
        garageName: 'ABC Motors',
        createdAt: '2026-01-10T00:00:00Z',
        odometerReading: 10000,
        paymentMethod: 'CustomerPayment',
        description: 'Engine oil replaced',
        photos: []
    }
]


/* ======================================================
   RENDER HELPER
====================================================== */

const renderDashboard = (user = garageUser) => {

    getCurrentUser.mockReturnValue(user)

    return render(
        <MemoryRouter initialEntries={['/garage']}>

            <Routes>

                <Route
                    path="/garage"
                    element={<GarageDashboard />}
                />

                <Route
                    path="/login"
                    element={<div>Login Page</div>}
                />

                <Route
                    path="/admin"
                    element={<div>Admin Page</div>}
                />

            </Routes>

        </MemoryRouter>
    )
}


/* ======================================================
   VEHICLE SETUP HELPER
====================================================== */

const openVehicle = async ({
    history = [],
    searchResult = vehicle
} = {}) => {

    const user = userEvent.setup()

    searchVehicle.mockResolvedValue(searchResult)

    getVehicleServiceRecords.mockResolvedValue(history)

    const utils = renderDashboard()

    const searchInput =
        screen.getByPlaceholderText(
            /WP CAQ-5834 or NP CAA-3467/i
        )

    await user.type(
        searchInput,
        'WP CAQ-5834'
    )

    await user.click(
        screen.getByRole('button', {
            name: /Search Vehicle/i
        })
    )

    await screen.findByText(
        'Toyota Corolla'
    )

    return {
        user,
        ...utils
    }
}


/* ======================================================
   SERVICE FORM HELPER
====================================================== */

const fillServiceForm = async (user) => {

    await user.type(
        screen.getByPlaceholderText(
            /40,000km Major Periodic Service/i
        ),
        'Oil Change'
    )

    await user.type(
        screen.getByPlaceholderText(
            /45000/i
        ),
        '45000'
    )

    await user.type(
        screen.getByPlaceholderText(
            /Details of services, diagnostics/i
        ),
        'Engine oil and oil filter replaced.'
    )
}


/* ======================================================
   SETUP / CLEANUP
====================================================== */

beforeEach(() => {

    vi.clearAllMocks()

    URL.createObjectURL = vi.fn(
        () => 'blob:mock-image-url'
    )
})

afterEach(() => {

    cleanup()

    vi.restoreAllMocks()
})


/* ======================================================
   AUTHENTICATION / AUTHORIZATION
====================================================== */

describe(
    'GarageDashboard - Authentication and Authorization',
    () => {

        // FE-GARAGE-001
        it(
            'should display the Garage dashboard for an authenticated Garage user',
            async () => {

                renderDashboard(garageUser)

                expect(
                    await screen.findByText(
                        'Garage Maintenance Console'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText('John Garage')
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-002
        it(
            'should display the Service Center console for a ServiceCenter user',
            async () => {

                renderDashboard(serviceCenterUser)

                expect(
                    await screen.findByText(
                        'Service Center Console'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'ABC Service Center'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-003
        it(
            'should redirect to login when there is no authenticated user',
            async () => {

                renderDashboard(null)

                expect(
                    await screen.findByText(
                        'Login Page'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-004
        it(
            'should redirect an Administrator to the admin page',
            async () => {

                renderDashboard(administratorUser)

                expect(
                    await screen.findByText(
                        'Admin Page'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-005
        it(
            'should redirect an unauthorized normal user to login',
            async () => {

                renderDashboard(normalUser)

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
   VEHICLE SEARCH
====================================================== */

describe(
    'GarageDashboard - Vehicle Search',
    () => {

        // FE-GARAGE-006
        it(
            'should display the vehicle search interface',
            async () => {

                renderDashboard()

                expect(
                    await screen.findByText(
                        'Vehicle Lookup'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByPlaceholderText(
                        /WP CAQ-5834 or NP CAA-3467/i
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByRole('button', {
                        name: /Search Vehicle/i
                    })
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-007
        it(
            'should use registration plate search by default',
            async () => {

                renderDashboard()

                const plateRadio =
                    screen.getByRole(
                        'radio',
                        {
                            name: /Registration Plate Number/i
                        }
                    )

                const chassisRadio =
                    screen.getByRole(
                        'radio',
                        {
                            name: /Chassis \/ VIN Number/i
                        }
                    )

                expect(plateRadio).toBeChecked()

                expect(chassisRadio).not.toBeChecked()
            }
        )


        // FE-GARAGE-008
        it(
            'should display an error when searching with an empty value',
            async () => {

                const user = userEvent.setup()

                renderDashboard()

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: /Search Vehicle/i
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'Please enter a vehicle registration plate or chassis number.'
                    )
                ).toBeInTheDocument()

                expect(
                    searchVehicle
                ).not.toHaveBeenCalled()
            }
        )


        // FE-GARAGE-009
        it(
            'should search using a registration plate number',
            async () => {

                searchVehicle.mockResolvedValue(
                    vehicle
                )

                getVehicleServiceRecords.mockResolvedValue(
                    []
                )

                const user = userEvent.setup()

                renderDashboard()

                const searchInput =
                    screen.getByPlaceholderText(
                        /WP CAQ-5834 or NP CAA-3467/i
                    )

                await user.type(
                    searchInput,
                    'WP CAQ-5834'
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: /Search Vehicle/i
                        }
                    )
                )

                await screen.findByText(
                    'Toyota Corolla'
                )

                expect(
                    searchVehicle
                ).toHaveBeenCalledWith({
                    vehicleNumber: 'WP CAQ-5834'
                })
            }
        )


        // FE-GARAGE-010
        it(
            'should search using a chassis/VIN number',
            async () => {

                searchVehicle.mockResolvedValue(
                    vehicle
                )

                getVehicleServiceRecords.mockResolvedValue(
                    []
                )

                const user = userEvent.setup()

                renderDashboard()

                await user.click(
                    screen.getByRole(
                        'radio',
                        {
                            name: /Chassis \/ VIN Number/i
                        }
                    )
                )

                const searchInput =
                    screen.getByPlaceholderText(
                        /JT2AW19E3X0284592/i
                    )

                await user.type(
                    searchInput,
                    'JT2AW19E3X0284592'
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: /Search Vehicle/i
                        }
                    )
                )

                await screen.findByText(
                    'Toyota Corolla'
                )

                expect(
                    searchVehicle
                ).toHaveBeenCalledWith({
                    chassisNumber: 'JT2AW19E3X0284592'
                })
            }
        )


        // FE-GARAGE-011
        it(
            'should trim whitespace before searching',
            async () => {

                searchVehicle.mockResolvedValue(
                    vehicle
                )

                getVehicleServiceRecords.mockResolvedValue(
                    []
                )

                const user = userEvent.setup()

                renderDashboard()

                const searchInput =
                    screen.getByPlaceholderText(
                        /WP CAQ-5834 or NP CAA-3467/i
                    )

                await user.type(
                    searchInput,
                    '   WP CAQ-5834   '
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: /Search Vehicle/i
                        }
                    )
                )

                await screen.findByText(
                    'Toyota Corolla'
                )

                expect(
                    searchVehicle
                ).toHaveBeenCalledWith({
                    vehicleNumber: 'WP CAQ-5834'
                })
            }
        )


        // FE-GARAGE-012
        it(
            'should display an error when the vehicle search fails',
            async () => {

                searchVehicle.mockRejectedValue(
                    new Error('Vehicle not found')
                )

                const user = userEvent.setup()

                renderDashboard()

                await user.type(
                    screen.getByPlaceholderText(
                        /WP CAQ-5834 or NP CAA-3467/i
                    ),
                    'WP CAQ-9999'
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: /Search Vehicle/i
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'Vehicle not found'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-013
        it(
            'should show searching state while vehicle search is in progress',
            async () => {

                searchVehicle.mockReturnValue(
                    new Promise(() => {})
                )

                const user = userEvent.setup()

                renderDashboard()

                await user.type(
                    screen.getByPlaceholderText(
                        /WP CAQ-5834 or NP CAA-3467/i
                    ),
                    'WP CAQ-5834'
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: /Search Vehicle/i
                        }
                    )
                )

                const button =
                    screen.getByRole(
                        'button',
                        {
                            name: /Searching/i
                        }
                    )

                expect(
                    button
                ).toBeDisabled()

                expect(
                    screen.getByText(
                        'Searching...'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-014
        it(
            'should load vehicle service history after a vehicle is found',
            async () => {

                const history = [
                    serviceHistory[0]
                ]

                searchVehicle.mockResolvedValue(
                    vehicle
                )

                getVehicleServiceRecords.mockResolvedValue(
                    history
                )

                renderDashboard()

                const user = userEvent.setup()

                await user.type(
                    screen.getByPlaceholderText(
                        /WP CAQ-5834 or NP CAA-3467/i
                    ),
                    'WP CAQ-5834'
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: /Search Vehicle/i
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'Toyota Corolla'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        '1 Logged Record'
                    )
                ).toBeInTheDocument()

                expect(
                    getVehicleServiceRecords
                ).toHaveBeenCalledWith(
                    vehicle.id
                )
            }
        )


        // FE-GARAGE-015
        it(
            'should show no previous records when vehicle history is empty',
            async () => {

                await openVehicle({
                    history: []
                })

                expect(
                    screen.getByText(
                        'No previous records logged'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-016
        it(
            'should handle vehicle history loading failure without crashing',
            async () => {

                const consoleError = vi
                    .spyOn(console, 'error')
                    .mockImplementation(() => {})

                searchVehicle.mockResolvedValue(
                    vehicle
                )

                getVehicleServiceRecords.mockRejectedValue(
                    new Error('History unavailable')
                )

                const user = userEvent.setup()

                renderDashboard()

                await user.type(
                    screen.getByPlaceholderText(
                        /WP CAQ-5834 or NP CAA-3467/i
                    ),
                    'WP CAQ-5834'
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: /Search Vehicle/i
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'Toyota Corolla'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'No previous records logged'
                    )
                ).toBeInTheDocument()

                expect(
                    consoleError
                ).toHaveBeenCalled()

                consoleError.mockRestore()
            }
        )


        // FE-GARAGE-017
        it(
            'should search a sample vehicle when a sample plate is clicked',
            async () => {

                searchVehicle.mockResolvedValue(
                    vehicle
                )

                getVehicleServiceRecords.mockResolvedValue(
                    []
                )

                const user = userEvent.setup()

                renderDashboard()

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'WP CAQ-5834'
                        }
                    )
                )

                await screen.findByText(
                    'Toyota Corolla'
                )

                expect(
                    searchVehicle
                ).toHaveBeenCalledWith({
                    vehicleNumber: 'WP CAQ-5834'
                })
            }
        )

    }
)


/* ======================================================
   SERVICE RECORD VALIDATION / SUBMISSION
====================================================== */

describe(
    'GarageDashboard - Service Record',
    () => {

        // FE-GARAGE-018
        it(
            'should display the service record form after selecting a vehicle',
            async () => {

                await openVehicle({
                    history: []
                })

                expect(
                    screen.getByText(
                        'Add Maintenance Record'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByPlaceholderText(
                        /40,000km Major Periodic Service/i
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByPlaceholderText(
                        /45000/i
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-019
        it(
            'should show an error when service title, odometer, or description is missing',
            async () => {

                const { container } =
                    await openVehicle({
                        history: []
                    })

                const forms =
                    container.querySelectorAll(
                        'form'
                    )

                const serviceForm = forms[1]

                fireEvent.submit(
                    serviceForm
                )

                expect(
                    await screen.findByText(
                        'Please fill in the service title, odometer reading, and work description.'
                    )
                ).toBeInTheDocument()

                expect(
                    createServiceRecord
                ).not.toHaveBeenCalled()
            }
        )


        // FE-GARAGE-020
        it(
            'should reject an invalid payment method',
            async () => {

                const { container } =
                    await openVehicle({
                        history: []
                    })

                const user =
                    userEvent.setup()

                await fillServiceForm(
                    user
                )

                const paymentSelect =
                    screen.getByRole(
                        'combobox'
                    )

                fireEvent.change(
                    paymentSelect,
                    {
                        target: {
                            value:
                                'InvalidPaymentMethod'
                        }
                    }
                )

                const forms =
                    container.querySelectorAll(
                        'form'
                    )

                fireEvent.submit(
                    forms[1]
                )

                expect(
                    await screen.findByText(
                        'Invalid payment method selected.'
                    )
                ).toBeInTheDocument()

                expect(
                    createServiceRecord
                ).not.toHaveBeenCalled()
            }
        )


        // FE-GARAGE-021
        it(
            'should successfully create a service record using Customer Payment',
            async () => {

                const { container } =
                    await openVehicle({
                        history: []
                    })

                const user =
                    userEvent.setup()

                createServiceRecord.mockResolvedValue(
                    {
                        success: true
                    }
                )

                getVehicleServiceRecords
                    .mockResolvedValueOnce([])
                    .mockResolvedValueOnce([
                        {
                            ...serviceHistory[0],
                            title: 'New Service'
                        }
                    ])

                await fillServiceForm(
                    user
                )

                const forms =
                    container.querySelectorAll(
                        'form'
                    )

                fireEvent.submit(
                    forms[1]
                )

                expect(
                    await screen.findByText(
                        'Service record successfully added and vehicle history updated!'
                    )
                ).toBeInTheDocument()

                expect(
                    createServiceRecord
                ).toHaveBeenCalledTimes(1)

                const formData =
                    createServiceRecord
                        .mock.calls[0][0]

                expect(
                    formData.get('vehicleId')
                ).toBe('101')

                expect(
                    formData.get('title')
                ).toBe('Oil Change')

                expect(
                    formData.get('odometerReading')
                ).toBe('45000')

                expect(
                    formData.get('description')
                ).toBe(
                    'Engine oil and oil filter replaced.'
                )

                expect(
                    formData.get('paymentMethod')
                ).toBe(
                    'CustomerPayment'
                )
            }
        )


        // FE-GARAGE-022
        it(
            'should submit Insurance Claim as the selected payment method',
            async () => {

                const { container } =
                    await openVehicle({
                        history: []
                    })

                const user =
                    userEvent.setup()

                createServiceRecord.mockResolvedValue(
                    {
                        success: true
                    }
                )

                getVehicleServiceRecords
                    .mockResolvedValueOnce([])
                    .mockResolvedValueOnce([])

                await fillServiceForm(
                    user
                )

                const paymentSelect =
                    screen.getByRole(
                        'combobox'
                    )

                await user.selectOptions(
                    paymentSelect,
                    'InsuranceClaim'
                )

                const forms =
                    container.querySelectorAll(
                        'form'
                    )

                fireEvent.submit(
                    forms[1]
                )

                await screen.findByText(
                    'Service record successfully added and vehicle history updated!'
                )

                const formData =
                    createServiceRecord
                        .mock.calls[0][0]

                expect(
                    formData.get('paymentMethod')
                ).toBe(
                    'InsuranceClaim'
                )
            }
        )


        // FE-GARAGE-023
        it(
            'should display an error when service record creation fails',
            async () => {

                const { container } =
                    await openVehicle({
                        history: []
                    })

                const user =
                    userEvent.setup()

                createServiceRecord.mockRejectedValue(
                    new Error(
                        'Failed to save service record'
                    )
                )

                await fillServiceForm(
                    user
                )

                const forms =
                    container.querySelectorAll(
                        'form'
                    )

                fireEvent.submit(
                    forms[1]
                )

                expect(
                    await screen.findByText(
                        'Failed to save service record'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-024
        it(
            'should show loading state while service record is being submitted',
            async () => {

                const { container } =
                    await openVehicle({
                        history: []
                    })

                const user =
                    userEvent.setup()

                createServiceRecord.mockReturnValue(
                    new Promise(() => {})
                )

                await fillServiceForm(
                    user
                )

                const forms =
                    container.querySelectorAll(
                        'form'
                    )

                fireEvent.submit(
                    forms[1]
                )

                expect(
                    await screen.findByText(
                        'Uploading & Logging Record...'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                /Uploading & Logging Record/i
                        }
                    )
                ).toBeDisabled()
            }
        )


        // FE-GARAGE-025
        it(
            'should reset the service form after successful submission',
            async () => {

                const { container } =
                    await openVehicle({
                        history: []
                    })

                const user =
                    userEvent.setup()

                createServiceRecord.mockResolvedValue(
                    {
                        success: true
                    }
                )

                getVehicleServiceRecords
                    .mockResolvedValueOnce([])
                    .mockResolvedValueOnce([])

                await fillServiceForm(
                    user
                )

                const forms =
                    container.querySelectorAll(
                        'form'
                    )

                fireEvent.submit(
                    forms[1]
                )

                await screen.findByText(
                    'Service record successfully added and vehicle history updated!'
                )

                /* Title should be cleared */
                expect(
                    screen.getByPlaceholderText(
                        /40,000km Major Periodic Service/i
                    )
                ).toHaveValue('')

                /* Odometer should be cleared */
                const odometerInput =
                    container.querySelector(
                        'input[type="number"]'
                    )

                expect(
                    odometerInput
                ).toBeInTheDocument()

                expect(
                    odometerInput.value
                ).toBe('')

                /* Description should be cleared */
                expect(
                    screen.getByPlaceholderText(
                        /Details of services, diagnostics/i
                    )
                ).toHaveValue('')
            }
        )

    }
)


/* ======================================================
   PHOTO UPLOAD
====================================================== */

describe(
    'GarageDashboard - Service Photos',
    () => {

        // FE-GARAGE-026
        it(
            'should allow up to 5 service evidence photos',
            async () => {

                const { container } =
                    await openVehicle({
                        history: []
                    })

                const user =
                    userEvent.setup()

                const files =
                    Array.from(
                        { length: 5 },
                        (_, index) =>
                            new File(
                                [`image-${index}`],
                                `photo-${index}.jpg`,
                                {
                                    type:
                                        'image/jpeg'
                                }
                            )
                    )

                const photoInput =
                    container.querySelector(
                        '#service-photos'
                    )

                await user.upload(
                    photoInput,
                    files
                )

                expect(
                    screen.getByText(
                        '5 / 5 photos selected'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getAllByAltText(
                        /preview-/
                    )
                ).toHaveLength(5)

                expect(
                    photoInput
                ).toBeDisabled()
            }
        )


        // FE-GARAGE-027
        it(
            'should reject more than 5 photos',
            async () => {

                const { container } =
                    await openVehicle({
                        history: []
                    })

                const user =
                    userEvent.setup()

                const files =
                    Array.from(
                        { length: 6 },
                        (_, index) =>
                            new File(
                                [`image-${index}`],
                                `photo-${index}.jpg`,
                                {
                                    type:
                                        'image/jpeg'
                                }
                            )
                    )

                const photoInput =
                    container.querySelector(
                        '#service-photos'
                    )

                await user.upload(
                    photoInput,
                    files
                )

                expect(
                    await screen.findByText(
                        'You can upload a maximum of 5 photos per service record.'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-028
        it(
            'should allow a selected photo to be removed',
            async () => {

                const { container } =
                    await openVehicle({
                        history: []
                    })

                const user =
                    userEvent.setup()

                const file =
                    new File(
                        ['image'],
                        'repair.jpg',
                        {
                            type:
                                'image/jpeg'
                        }
                    )

                const photoInput =
                    container.querySelector(
                        '#service-photos'
                    )

                await user.upload(
                    photoInput,
                    file
                )

                expect(
                    screen.getByText(
                        '1 / 5 photos selected'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByAltText(
                        'preview-0'
                    )
                ).toBeInTheDocument()

                const removeButton =
                    screen.getByText('✕')

                await user.click(
                    removeButton
                )

                expect(
                    screen.getByText(
                        '0 / 5 photos selected'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.queryByAltText(
                        'preview-0'
                    )
                ).not.toBeInTheDocument()
            }
        )

    }
)


/* ======================================================
   WORKSHOP SERVICE HISTORY
====================================================== */

describe(
    'GarageDashboard - Workshop Service History',
    () => {

        // FE-GARAGE-029
        it(
            'should load the workshop service history when its tab is opened',
            async () => {

                getMyServiceRecords.mockResolvedValue([
                    {
                        id: 11,
                        title: 'Brake Service',
                        vehicleNumber:
                            'WP CAQ-5834',
                        paymentMethod:
                            'CustomerPayment',
                        description:
                            'Brake pads replaced',
                        createdAt:
                            '2026-02-10T00:00:00Z',
                        photos: []
                    }
                ])

                const user =
                    userEvent.setup()

                renderDashboard()

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                /Workshop Service History/i
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'Brake Service'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        /Vehicle: WP CAQ-5834/
                    )
                ).toBeInTheDocument()

                expect(
                    getMyServiceRecords
                ).toHaveBeenCalledTimes(1)
            }
        )


        // FE-GARAGE-030
        it(
            'should display loading state while workshop records are loading',
            async () => {

                getMyServiceRecords.mockReturnValue(
                    new Promise(() => {})
                )

                const user =
                    userEvent.setup()

                renderDashboard()

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                /Workshop Service History/i
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'Loading your service history...'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-031
        it(
            'should display no-records message when the workshop has no records',
            async () => {

                getMyServiceRecords.mockResolvedValue(
                    []
                )

                const user =
                    userEvent.setup()

                renderDashboard()

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                /Workshop Service History/i
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'No records logged yet'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-032
        it(
            'should display an error notification when workshop records fail to load',
            async () => {

                getMyServiceRecords.mockRejectedValue(
                    new Error(
                        'Unable to load records'
                    )
                )

                const user =
                    userEvent.setup()

                renderDashboard()

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                /Workshop Service History/i
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'Unable to load records'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-033
        it(
            'should refresh workshop service history when refresh is clicked',
            async () => {

                getMyServiceRecords
                    .mockResolvedValueOnce([
                        {
                            id: 1,
                            title: 'Oil Change',
                            vehicleNumber:
                                'WP CAQ-5834',
                            paymentMethod:
                                'CustomerPayment',
                            description:
                                'Oil replaced',
                            createdAt:
                                '2026-01-10T00:00:00Z',
                            photos: []
                        }
                    ])
                    .mockResolvedValueOnce([
                        {
                            id: 2,
                            title: 'Brake Service',
                            vehicleNumber:
                                'WP CAQ-5834',
                            paymentMethod:
                                'InsuranceClaim',
                            description:
                                'Brake checked',
                            createdAt:
                                '2026-02-10T00:00:00Z',
                            photos: []
                        }
                    ])

                const user =
                    userEvent.setup()

                renderDashboard()

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                /Workshop Service History/i
                        }
                    )
                )

                await screen.findByText(
                    'Oil Change'
                )

                expect(
                    getMyServiceRecords
                ).toHaveBeenCalledTimes(1)

                const buttons =
                    screen.getAllByRole(
                        'button'
                    )

                const refreshButton =
                    buttons.find(
                        button =>
                            button.getAttribute(
                                'title'
                            ) === 'Refresh history'
                    )

                if (refreshButton) {
                    await user.click(
                        refreshButton
                    )
                } else {
                    const allButtons =
                        screen.getAllByRole(
                            'button'
                        )

                    await user.click(
                        allButtons[
                            allButtons.length - 1
                        ]
                    )
                }

                await waitFor(() => {
                    expect(
                        getMyServiceRecords
                    ).toHaveBeenCalledTimes(2)
                })
            }
        )

    }
)


/* ======================================================
   CHECKUP REQUESTS TAB
====================================================== */

describe(
    'GarageDashboard - Checkup Requests',
    () => {

        // FE-GARAGE-034
        it(
            'should display the checkup requests panel when the tab is selected',
            async () => {

                const user =
                    userEvent.setup()

                renderDashboard()

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                /Checkup Requests/i
                        }
                    )
                )

                expect(
                    screen.getByText(
                        'Mock Checkup Requests Panel'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-035
        it(
            'should display the pending checkup count badge',
            async () => {

                const user =
                    userEvent.setup()

                renderDashboard()

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                /Checkup Requests/i
                        }
                    )
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                'Set Pending Count'
                        }
                    )
                )

                expect(
                    screen.getByText('3')
                ).toBeInTheDocument()
            }
        )

    }
)


/* ======================================================
   LOGOUT
====================================================== */

describe(
    'GarageDashboard - Logout',
    () => {

        // FE-GARAGE-036
        it(
            'should call logout when Sign Out is clicked',
            async () => {

                const user =
                    userEvent.setup()

                renderDashboard()

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: /Sign Out/i
                        }
                    )
                )

                expect(
                    logout
                ).toHaveBeenCalledTimes(1)
            }
        )

    }
)


/* ======================================================
   IMAGE LIGHTBOX
====================================================== */

describe(
    'GarageDashboard - Image Preview',
    () => {

        // FE-GARAGE-037
        it(
            'should open the full image preview when an evidence photo is clicked',
            async () => {

                const history = [
                    {
                        id: 1,
                        title: 'Oil Change',
                        garageName:
                            'ABC Motors',
                        createdAt:
                            '2026-01-10T00:00:00Z',
                        odometerReading:
                            10000,
                        paymentMethod:
                            'CustomerPayment',
                        description:
                            'Engine oil replaced',
                        photos: [
                            'https://example.com/photo.jpg'
                        ]
                    }
                ]

                await openVehicle({
                    history
                })

                const photo =
                    await screen.findByAltText(
                        'Service evidence'
                    )

                expect(
                    photo
                ).toBeInTheDocument()

                const user =
                    userEvent.setup()

                await user.click(photo)

                expect(
                    screen.getByAltText(
                        'Full evidence'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-GARAGE-038
        it(
            'should close the full image preview when the close button is clicked',
            async () => {

                const history = [
                    {
                        id: 1,
                        title: 'Oil Change',
                        garageName:
                            'ABC Motors',
                        createdAt:
                            '2026-01-10T00:00:00Z',
                        odometerReading:
                            10000,
                        paymentMethod:
                            'CustomerPayment',
                        description:
                            'Engine oil replaced',
                        photos: [
                            'https://example.com/photo.jpg'
                        ]
                    }
                ]

                await openVehicle({
                    history
                })

                const user =
                    userEvent.setup()

                await user.click(
                    screen.getByAltText(
                        'Service evidence'
                    )
                )

                expect(
                    screen.getByAltText(
                        'Full evidence'
                    )
                ).toBeInTheDocument()

                await user.click(
                    screen.getByText('✕')
                )

                expect(
                    screen.queryByAltText(
                        'Full evidence'
                    )
                ).not.toBeInTheDocument()
            }
        )

    }
)