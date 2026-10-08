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
    cleanup
} from '@testing-library/react'

import userEvent from '@testing-library/user-event'

import { MemoryRouter } from 'react-router-dom'

import Register from '../../src/pages/Register'
import { registerGarage } from '../../src/api/auth'


/* -------------------------------------------------------
   Mock API
------------------------------------------------------- */

vi.mock('../../src/api/auth', () => ({
    registerGarage: vi.fn()
}))


/* -------------------------------------------------------
   Mock Navbar / Footer
------------------------------------------------------- */

vi.mock('../../src/components/Navbar', () => ({
    default: () => <div data-testid="mock-navbar">Navbar</div>
}))

vi.mock('../../src/components/Footer', () => ({
    default: () => <div data-testid="mock-footer">Footer</div>
}))


/* -------------------------------------------------------
   Mock Icons
------------------------------------------------------- */

vi.mock('../../src/components/Icons', () => {
    const Icon = ({ className = '' }) => (
        <span className={className} aria-hidden="true" />
    )

    return {
        IconBuilding: Icon,
        IconWrench: Icon,
        IconUpload: Icon,
        IconFileText: Icon,
        IconCheckCircle: Icon,
        IconAlertTriangle: Icon,
        IconClock: Icon,
        IconShield: Icon
    }
})


/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

const renderRegister = (props = {}) => {
    return render(
        <MemoryRouter initialEntries={['/register']}>
            <Register {...props} />
        </MemoryRouter>
    )
}

const getField = (container, name) => {
    return container.querySelector(`[name="${name}"]`)
}

const createValidFile = (
    name = 'business-registration.pdf',
    type = 'application/pdf'
) => {
    return new File(
        ['Business Registration Document'],
        name,
        { type }
    )
}

const fillRequiredFields = async (
    user,
    container,
    {
        password = 'Password123!',
        confirmPassword = password
    } = {}
) => {

    await user.type(
        getField(container, 'businessName'),
        'Test Auto Garage'
    )

    await user.type(
        getField(container, 'registrationNumber'),
        'PV-0024891'
    )

    await user.type(
        getField(container, 'fullName'),
        'Test User'
    )

    await user.type(
        getField(container, 'phone'),
        '+94771234567'
    )

    await user.type(
        getField(container, 'email'),
        'test@example.com'
    )

    await user.type(
        getField(container, 'address'),
        'Colombo'
    )

    await user.type(
        getField(container, 'password'),
        password
    )

    await user.type(
        getField(container, 'confirmPassword'),
        confirmPassword
    )

    const fileInput = container.querySelector('#br-upload')

    await user.upload(
        fileInput,
        createValidFile()
    )
}


/* -------------------------------------------------------
   Setup / Cleanup
------------------------------------------------------- */

beforeEach(() => {

    vi.clearAllMocks()

    vi.stubGlobal('fetch', vi.fn())

    Object.defineProperty(
        navigator,
        'geolocation',
        {
            value: undefined,
            configurable: true
        }
    )
})

afterEach(() => {

    cleanup()

    vi.unstubAllGlobals()

    document
        .querySelectorAll('script[src*="unpkg.com/leaflet"]')
        .forEach(script => script.remove())

    document
        .getElementById('leaflet-css')
        ?.remove()
})


/* =======================================================
   REGISTER TESTS
======================================================= */

describe('Register Component', () => {


    /* ---------------------------------------------------
       FE-REG-001
    --------------------------------------------------- */

    it('should display the registration page correctly', () => {

        renderRegister()

        expect(
            screen.getByText('Partner Onboarding Portal')
        ).toBeInTheDocument()

        expect(
            screen.getByText('Partner with V-Sense')
        ).toBeInTheDocument()

        expect(
            screen.getByRole('button', {
                name: /Submit Partner Application/i
            })
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-REG-002
    --------------------------------------------------- */

    it('should render nothing when the modal is closed', () => {

        renderRegister({
            isModal: true,
            isOpen: false
        })

        expect(
            screen.queryByText('Partner with V-Sense')
        ).not.toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-REG-003
    --------------------------------------------------- */

    it('should select Garage as the default registration type', () => {

        renderRegister()

        const garageRadio = screen.getByRole(
            'radio',
            { name: /Automotive Garage/i }
        )

        const serviceCenterRadio = screen.getByRole(
            'radio',
            { name: /Official Service Center/i }
        )

        expect(garageRadio).toBeChecked()
        expect(serviceCenterRadio).not.toBeChecked()
    })


    /* ---------------------------------------------------
       FE-REG-004
    --------------------------------------------------- */

    it('should allow the user to select Service Center registration', async () => {

        const user = userEvent.setup()

        renderRegister()

        const serviceCenterRadio = screen.getByRole(
            'radio',
            { name: /Official Service Center/i }
        )

        await user.click(serviceCenterRadio)

        expect(serviceCenterRadio).toBeChecked()

        expect(
            screen.getByRole(
                'radio',
                { name: /Automotive Garage/i }
            )
        ).not.toBeChecked()
    })


    /* ---------------------------------------------------
       FE-REG-005
    --------------------------------------------------- */

    it('should mark the required registration fields as required', () => {

        const { container } = renderRegister()

        const requiredFields = [
            'businessName',
            'registrationNumber',
            'fullName',
            'phone',
            'email',
            'address',
            'password',
            'confirmPassword'
        ]

        requiredFields.forEach(name => {

            const field = getField(container, name)

            expect(field).toBeRequired()
        })
    })


    /* ---------------------------------------------------
       FE-REG-006
    --------------------------------------------------- */

    it('should reject an invalid email format', async () => {

        const user = userEvent.setup()

        const { container } = renderRegister()

        const email = getField(container, 'email')

        await user.type(email, 'invalid-email')

        expect(email).not.toBeValid()
    })


    /* ---------------------------------------------------
       FE-REG-007
    --------------------------------------------------- */

    it('should retain user-entered form values', async () => {

        const user = userEvent.setup()

        const { container } = renderRegister()

        const businessName = getField(
            container,
            'businessName'
        )

        const fullName = getField(
            container,
            'fullName'
        )

        await user.type(
            businessName,
            'ABC Motors'
        )

        await user.type(
            fullName,
            'John Silva'
        )

        expect(businessName).toHaveValue('ABC Motors')
        expect(fullName).toHaveValue('John Silva')
    })


    /* ---------------------------------------------------
       FE-REG-008
    --------------------------------------------------- */

    it('should display an error when passwords do not match', async () => {

        const user = userEvent.setup()

        const { container } = renderRegister()

        await fillRequiredFields(
            user,
            container,
            {
                password: 'Password123!',
                confirmPassword: 'Different123!'
            }
        )

        await user.click(
            screen.getByRole('button', {
                name: /Submit Partner Application/i
            })
        )

        expect(
            await screen.findByText(
                'Passwords do not match.'
            )
        ).toBeInTheDocument()

        expect(registerGarage).not.toHaveBeenCalled()
    })


    /* ---------------------------------------------------
       FE-REG-009
    --------------------------------------------------- */

    it('should reject passwords shorter than 6 characters', async () => {

        const user = userEvent.setup()

        const { container } = renderRegister()

        await fillRequiredFields(
            user,
            container,
            {
                password: '12345',
                confirmPassword: '12345'
            }
        )

        await user.click(
            screen.getByRole('button', {
                name: /Submit Partner Application/i
            })
        )

        expect(
            await screen.findByText(
                'Password must be at least 6 characters.'
            )
        ).toBeInTheDocument()

        expect(registerGarage).not.toHaveBeenCalled()
    })


    /* ---------------------------------------------------
       FE-REG-010
    --------------------------------------------------- */

    it('should require a BR document before submitting', async () => {

        const user = userEvent.setup()

        const { container } = renderRegister()

        await user.type(
            getField(container, 'businessName'),
            'Test Garage'
        )

        await user.type(
            getField(container, 'registrationNumber'),
            'PV123456'
        )

        await user.type(
            getField(container, 'fullName'),
            'Test User'
        )

        await user.type(
            getField(container, 'phone'),
            '+94771234567'
        )

        await user.type(
            getField(container, 'email'),
            'test@example.com'
        )

        await user.type(
            getField(container, 'address'),
            'Colombo'
        )

        await user.type(
            getField(container, 'password'),
            'Password123!'
        )

        await user.type(
            getField(container, 'confirmPassword'),
            'Password123!'
        )

        await user.click(
            screen.getByRole('button', {
                name: /Submit Partner Application/i
            })
        )

        expect(
            await screen.findByText(
                'Please upload your official Business Registration (BR) document.'
            )
        ).toBeInTheDocument()

        expect(registerGarage).not.toHaveBeenCalled()
    })


    /* ---------------------------------------------------
       FE-REG-011
    --------------------------------------------------- */

    it('should display the selected BR document filename', async () => {

        const user = userEvent.setup()

        const { container } = renderRegister()

        const fileInput = container.querySelector(
            '#br-upload'
        )

        const file = createValidFile(
            'company-br.pdf'
        )

        await user.upload(fileInput, file)

        expect(
            screen.getByText('company-br.pdf')
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-REG-012
    --------------------------------------------------- */

    it('should accept a BR document exactly 10MB in size', async () => {

        const user = userEvent.setup()

        const { container } = renderRegister()

        const tenMB = new Uint8Array(
            10 * 1024 * 1024
        )

        const file = new File(
            [tenMB],
            '10mb-br.pdf',
            { type: 'application/pdf' }
        )

        const fileInput = container.querySelector(
            '#br-upload'
        )

        await user.upload(fileInput, file)

        expect(
            screen.getByText('10mb-br.pdf')
        ).toBeInTheDocument()

        expect(
            screen.queryByText(
                'BR Document must be smaller than 10MB.'
            )
        ).not.toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-REG-013
    --------------------------------------------------- */

    it('should reject a BR document larger than 10MB', async () => {

        const user = userEvent.setup()

        const { container } = renderRegister()

        const overTenMB = new Uint8Array(
            (10 * 1024 * 1024) + 1
        )

        const file = new File(
            [overTenMB],
            'large-br.pdf',
            { type: 'application/pdf' }
        )

        const fileInput = container.querySelector(
            '#br-upload'
        )

        await user.upload(fileInput, file)

        expect(
            screen.getByText(
                'BR Document must be smaller than 10MB.'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-REG-014
    --------------------------------------------------- */

    it('should not perform a location search for fewer than 3 characters', async () => {

        const user = userEvent.setup()

        renderRegister()

        const searchInput = screen.getByPlaceholderText(
            'Search location or city...'
        )

        await user.type(searchInput, 'Co')

        expect(fetch).not.toHaveBeenCalled()

        expect(
            screen.queryByRole('listitem')
        ).not.toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-REG-015
    --------------------------------------------------- */

    it('should display location search results when the API succeeds', async () => {

        const user = userEvent.setup()

        fetch.mockResolvedValue({
            json: async () => [
                {
                    lat: '6.9271',
                    lon: '79.8612',
                    display_name: 'Colombo, Sri Lanka'
                }
            ]
        })

        renderRegister()

        const searchInput = screen.getByPlaceholderText(
            'Search location or city...'
        )

        await user.type(
            searchInput,
            'Col'
        )

        expect(
            await screen.findByText(
                'Colombo, Sri Lanka'
            )
        ).toBeInTheDocument()

        expect(fetch).toHaveBeenCalledTimes(1)
    })


    /* ---------------------------------------------------
       FE-REG-016
    --------------------------------------------------- */

    it('should update the location when a search result is selected', async () => {

        const user = userEvent.setup()

        fetch.mockResolvedValue({
            json: async () => [
                {
                    lat: '6.9271',
                    lon: '79.8612',
                    display_name: 'Colombo, Sri Lanka'
                }
            ]
        })

        const { container } = renderRegister()

        const searchInput = screen.getByPlaceholderText(
            'Search location or city...'
        )

        await user.type(
            searchInput,
            'Colombo'
        )

        const result = await screen.findByText(
            'Colombo, Sri Lanka'
        )

        await user.click(result)

        expect(searchInput).toHaveValue('Colombo')

        expect(
            getField(container, 'latitude')
        ).toHaveValue('Lat: 6.927100')

        expect(
            getField(container, 'longitude')
        ).toHaveValue('Lng: 79.861200')
    })


    /* ---------------------------------------------------
       FE-REG-017
    --------------------------------------------------- */

    it('should handle location search failure without crashing', async () => {

        const user = userEvent.setup()

        const consoleError = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {})

        fetch.mockRejectedValue(
            new Error('Network error')
        )

        renderRegister()

        const searchInput = screen.getByPlaceholderText(
            'Search location or city...'
        )

        await user.type(
            searchInput,
            'Colombo'
        )

        await new Promise(resolve =>
            setTimeout(resolve, 0)
        )

        expect(
            screen.getByPlaceholderText(
                'Search location or city...'
            )
        ).toBeInTheDocument()

        expect(consoleError).toHaveBeenCalled()

        consoleError.mockRestore()
    })


    /* ---------------------------------------------------
       FE-REG-018
    --------------------------------------------------- */

    it('should display an error when geolocation is not supported', async () => {

        const user = userEvent.setup()

        renderRegister()

        await user.click(
            screen.getByRole('button', {
                name: /Detect My Location/i
            })
        )

        expect(
            await screen.findByText(
                'Geolocation is not supported by your browser.'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-REG-019
    --------------------------------------------------- */

    it('should populate coordinates when geolocation succeeds', async () => {

        const user = userEvent.setup()

        Object.defineProperty(
            navigator,
            'geolocation',
            {
                value: {
                    getCurrentPosition: vi.fn(
                        success => {
                            success({
                                coords: {
                                    latitude: 6.9271,
                                    longitude: 79.8612
                                }
                            })
                        }
                    )
                },
                configurable: true
            }
        )

        const { container } = renderRegister()

        await user.click(
            screen.getByRole('button', {
                name: /Detect My Location/i
            })
        )

        expect(
            getField(container, 'latitude')
        ).toHaveValue('Lat: 6.927100')

        expect(
            getField(container, 'longitude')
        ).toHaveValue('Lng: 79.861200')
    })


    /* ---------------------------------------------------
       FE-REG-020
    --------------------------------------------------- */

    it('should display an error when geolocation fails', async () => {

        const user = userEvent.setup()

        Object.defineProperty(
            navigator,
            'geolocation',
            {
                value: {
                    getCurrentPosition: vi.fn(
                        (success, failure) => {
                            failure()
                        }
                    )
                },
                configurable: true
            }
        )

        renderRegister()

        await user.click(
            screen.getByRole('button', {
                name: /Detect My Location/i
            })
        )

        expect(
            await screen.findByText(
                'Unable to retrieve your location. Please select it manually on the map.'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-REG-021
    --------------------------------------------------- */

    it('should successfully submit a Garage registration', async () => {

        const user = userEvent.setup()

        registerGarage.mockResolvedValue({
            success: true
        })

        const { container } = renderRegister()

        await fillRequiredFields(
            user,
            container
        )

        await user.click(
            screen.getByRole('button', {
                name: /Submit Partner Application/i
            })
        )

        expect(
            await screen.findByText(
                'Application Submitted!'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                /Test Auto Garage/
            )
        ).toBeInTheDocument()

        expect(registerGarage).toHaveBeenCalledTimes(1)

        const submittedData =
            registerGarage.mock.calls[0][0]

        expect(
            submittedData.get('businessName')
        ).toBe('Test Auto Garage')

        expect(
            submittedData.get('registrationNumber')
        ).toBe('PV-0024891')

        expect(
            submittedData.get('fullName')
        ).toBe('Test User')

        expect(
            submittedData.get('email')
        ).toBe('test@example.com')

        expect(
            submittedData.get('role')
        ).toBe('Garage')
    })


    /* ---------------------------------------------------
       FE-REG-022
    --------------------------------------------------- */

    it('should successfully submit a Service Center registration', async () => {

        const user = userEvent.setup()

        registerGarage.mockResolvedValue({
            success: true
        })

        const { container } = renderRegister()

        const serviceCenterRadio = screen.getByRole(
            'radio',
            { name: /Official Service Center/i }
        )

        await user.click(serviceCenterRadio)

        await fillRequiredFields(
            user,
            container
        )

        await user.click(
            screen.getByRole('button', {
                name: /Submit Partner Application/i
            })
        )

        expect(
            await screen.findByText(
                'Application Submitted!'
            )
        ).toBeInTheDocument()

        const submittedData =
            registerGarage.mock.calls[0][0]

        expect(
            submittedData.get('role')
        ).toBe('ServiceCenter')
    })


    /* ---------------------------------------------------
       FE-REG-023
    --------------------------------------------------- */

    it('should display an error when registration API fails', async () => {

        const user = userEvent.setup()

        registerGarage.mockRejectedValue(
            new Error('Email already exists')
        )

        const { container } = renderRegister()

        await fillRequiredFields(
            user,
            container
        )

        await user.click(
            screen.getByRole('button', {
                name: /Submit Partner Application/i
            })
        )

        expect(
            await screen.findByText(
                'Email already exists'
            )
        ).toBeInTheDocument()

        expect(
            screen.queryByText(
                'Application Submitted!'
            )
        ).not.toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-REG-024
    --------------------------------------------------- */

    it('should show loading state while registration is processing', async () => {

        const user = userEvent.setup()

        let resolveRegistration

        registerGarage.mockImplementation(
            () =>
                new Promise(resolve => {
                    resolveRegistration = resolve
                })
        )

        const { container } = renderRegister()

        await fillRequiredFields(
            user,
            container
        )

        await user.click(
            screen.getByRole('button', {
                name: /Submit Partner Application/i
            })
        )

        expect(
            screen.getByText(
                'Submitting Application...'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByRole('button', {
                name: /Submitting Application/i
            })
        ).toBeDisabled()

        resolveRegistration({
            success: true
        })

        expect(
            await screen.findByText(
                'Application Submitted!'
            )
        ).toBeInTheDocument()
    })
})