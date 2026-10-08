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

import {
    MemoryRouter,
    Routes,
    Route
} from 'react-router-dom'

import PublicVerification from '../../src/pages/PublicVerification'


/* -------------------------------------------------------
   Mock Icons
------------------------------------------------------- */

vi.mock('../../src/components/Icons', () => {
    const Icon = ({ className = '' }) => (
        <span
            className={className}
            aria-hidden="true"
        />
    )

    return {
        IconCheckCircle: Icon,
        IconXCircle: Icon,
        IconAlertTriangle: Icon
    }
})


/* -------------------------------------------------------
   Render Helper
------------------------------------------------------- */

const renderVerification = (
    id = 'TEST-CERT-001'
) => {
    return render(
        <MemoryRouter
            initialEntries={[`/verify/${id}`]}
        >
            <Routes>

                <Route
                    path="/verify/:id"
                    element={<PublicVerification />}
                />

                <Route
                    path="/"
                    element={<div>V-Sense Home Page</div>}
                />

            </Routes>
        </MemoryRouter>
    )
}


/* -------------------------------------------------------
   Setup
------------------------------------------------------- */

beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
})


/* =======================================================
   PUBLIC VERIFICATION TESTS
======================================================= */

describe('PublicVerification Component', () => {


    /* ---------------------------------------------------
       FE-VERIFY-001
    --------------------------------------------------- */

    it('should display the loading state while verification is in progress', () => {

        fetch.mockReturnValue(
            new Promise(() => {})
        )

        renderVerification()

        expect(
            screen.getByText(
                'Verifying cryptographic signature & fetching database records...'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-002
    --------------------------------------------------- */

    it('should send the certificate ID in the verification API request', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: false,
                message: 'Invalid certificate'
            })
        })

        renderVerification('ABC-123')

        await screen.findByText(
            'Verification Failed'
        )

        expect(fetch).toHaveBeenCalledTimes(1)

        expect(fetch.mock.calls[0][0])
            .toContain('/workflows/verify/ABC-123')
    })


    /* ---------------------------------------------------
       FE-VERIFY-003
    --------------------------------------------------- */

    it('should display Authentic Certificate for a valid certificate', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: true,
                workflowId: 'WF-001'
            })
        })

        renderVerification()

        expect(
            await screen.findByText(
                'Authentic Certificate'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-004
    --------------------------------------------------- */

    it('should display vehicle information when vehicle data is available', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: true,
                vehicle: {
                    make: 'Toyota',
                    model: 'Corolla',
                    year: 2022,
                    registrationNumber: 'CAB-1234',
                    vin: 'VIN123456789'
                },
                workflowId: 'WF-002'
            })
        })

        renderVerification()

        expect(
            await screen.findByText('Toyota Corolla')
        ).toBeInTheDocument()

        expect(
            screen.getByText('2022')
        ).toBeInTheDocument()

        expect(
            screen.getByText('CAB-1234')
        ).toBeInTheDocument()

        expect(
            screen.getByText('VIN123456789')
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-005
    --------------------------------------------------- */

    it('should display N/A when the vehicle year is missing', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: true,
                vehicle: {
                    make: 'Honda',
                    model: 'Civic',
                    registrationNumber: 'CAR-5678',
                    vin: 'VIN987654321'
                }
            })
        })

        renderVerification()

        expect(
            await screen.findByText('N/A')
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-006
    --------------------------------------------------- */

    it('should display vehicle information only when vehicle data exists', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: true,
                workflowId: 'WF-003'
            })
        })

        renderVerification()

        expect(
            await screen.findByText(
                'Authentic Certificate'
            )
        ).toBeInTheDocument()

        expect(
            screen.queryByText(
                'Vehicle Information'
            )
        ).not.toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-007
    --------------------------------------------------- */

    it('should display the AI insight section when AI insight is available', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: true,
                aiInsight:
                    'Engine condition is good.\nService history is consistent.'
            })
        })

        renderVerification()

        expect(
            await screen.findByText(
                'AI Condition Insight & Evidence'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Engine condition is good.'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Service history is consistent.'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-008
    --------------------------------------------------- */

    it('should display multiple non-empty AI insight lines separately', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: true,
                aiInsight:
                    'Line one.\n\nLine two.\nLine three.'
            })
        })

        renderVerification()

        expect(
            await screen.findByText('Line one.')
        ).toBeInTheDocument()

        expect(
            screen.getByText('Line two.')
        ).toBeInTheDocument()

        expect(
            screen.getByText('Line three.')
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-009
    --------------------------------------------------- */

    it('should hide the AI insight section when AI insight is missing', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: true,
                workflowId: 'WF-004'
            })
        })

        renderVerification()

        expect(
            await screen.findByText(
                'Authentic Certificate'
            )
        ).toBeInTheDocument()

        expect(
            screen.queryByText(
                'AI Condition Insight & Evidence'
            )
        ).not.toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-010
    --------------------------------------------------- */

    it('should display maintenance records when records are available', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: true,
                records: [
                    {
                        createdAt: '2026-01-10T00:00:00Z',
                        title: 'Oil Change',
                        description: 'Engine oil replaced',
                        garageName: 'ABC Motors',
                        garageVerified: true,
                        odometerReading: 10000
                    }
                ]
            })
        })

        renderVerification()

        expect(
            await screen.findByText(
                'Oil Change'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Engine oil replaced'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                /ABC Motors/
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-011
    --------------------------------------------------- */

    it('should display the no-maintenance-records message when records are empty', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: true,
                records: []
            })
        })

        renderVerification()

        expect(
            await screen.findByText(
                'No maintenance records reported.'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-012
    --------------------------------------------------- */

    it('should display a fallback message when a service description is missing', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: true,
                records: [
                    {
                        createdAt: '2026-01-10T00:00:00Z',
                        title: 'Brake Service',
                        description: '',
                        garageName: 'XYZ Garage',
                        garageVerified: false,
                        odometerReading: 15000
                    }
                ]
            })
        })

        renderVerification()

        expect(
            await screen.findByText(
                'Brake Service'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'No details provided'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-013
    --------------------------------------------------- */

    it('should display all maintenance records when multiple records exist', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: true,
                records: [
                    {
                        createdAt: '2026-01-10T00:00:00Z',
                        title: 'Oil Change',
                        description: 'Oil replaced',
                        garageName: 'Garage One',
                        garageVerified: true,
                        odometerReading: 10000
                    },
                    {
                        createdAt: '2026-02-15T00:00:00Z',
                        title: 'Brake Inspection',
                        description: 'Brake system checked',
                        garageName: 'Garage Two',
                        garageVerified: false,
                        odometerReading: 12000
                    }
                ]
            })
        })

        renderVerification()

        expect(
            await screen.findByText(
                'Oil Change'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Brake Inspection'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Garage One (Verified)'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Garage Two (Unverified)'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-014
    --------------------------------------------------- */

    it('should display Verification Failed for an invalid certificate', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: false,
                message: 'Certificate is invalid'
            })
        })

        renderVerification()

        expect(
            await screen.findByText(
                'Verification Failed'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Certificate is invalid'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-015
    --------------------------------------------------- */

    it('should display the default message when an invalid response contains no message', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: false
            })
        })

        renderVerification()

        expect(
            await screen.findByText(
                'Verification Failed'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Invalid or pending certificate.'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-016
    --------------------------------------------------- */

    it('should treat a non-OK API response as an invalid certificate', async () => {

        fetch.mockResolvedValue({
            ok: false,
            json: async () => ({
                valid: true,
                message: 'Verification service rejected the request'
            })
        })

        renderVerification()

        expect(
            await screen.findByText(
                'Verification Failed'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Verification service rejected the request'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-017
    --------------------------------------------------- */

    it('should display a connection error when the verification request fails', async () => {

        fetch.mockRejectedValue(
            new Error('Network error')
        )

        renderVerification()

        expect(
            await screen.findByText(
                'Connection Error'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Network error while verifying the certificate. Please try again.'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-018
    --------------------------------------------------- */

    it('should display a connection error when the API response cannot be parsed', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => {
                throw new Error('Invalid JSON')
            }
        })

        renderVerification()

        expect(
            await screen.findByText(
                'Connection Error'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Network error while verifying the certificate. Please try again.'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-019
    --------------------------------------------------- */

    it('should display the workflow ID for a valid verification', async () => {

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: true,
                workflowId: 'WORKFLOW-2026-001'
            })
        })

        renderVerification()

        expect(
            await screen.findByText(
                'WORKFLOW-2026-001'
            )
        ).toBeInTheDocument()
    })


    /* ---------------------------------------------------
       FE-VERIFY-020
    --------------------------------------------------- */

    it('should navigate to the V-Sense home page using the Return to V-Sense Home link', async () => {

        const user = userEvent.setup()

        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                valid: false,
                message: 'Invalid certificate'
            })
        })

        renderVerification()

        await screen.findByText(
            'Verification Failed'
        )

        const homeLink = screen.getByRole(
            'link',
            {
                name: 'Return to V-Sense Home'
            }
        )

        await user.click(homeLink)

        expect(
            screen.getByText(
                'V-Sense Home Page'
            )
        ).toBeInTheDocument()
    })

})