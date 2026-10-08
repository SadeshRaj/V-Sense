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
    waitFor
} from '@testing-library/react'

import userEvent from '@testing-library/user-event'


/* =========================================================
   MOCK API FUNCTIONS
   ========================================================= */

const {
    mockGetOrganizationCheckupRequests,
    mockAcceptCheckupRequest,
    mockSuggestAlternative
} = vi.hoisted(() => ({
    mockGetOrganizationCheckupRequests:
        vi.fn(),

    mockAcceptCheckupRequest:
        vi.fn(),

    mockSuggestAlternative:
        vi.fn()
}))


vi.mock(
    '../../src/api/checkupRequestApi',
    () => ({
        getOrganizationCheckupRequests:
            mockGetOrganizationCheckupRequests,

        acceptCheckupRequest:
            mockAcceptCheckupRequest,

        suggestAlternative:
            mockSuggestAlternative
    })
)


/* =========================================================
   COMPONENT
   ========================================================= */

import CheckupRequestsPanel
    from '../../src/components/CheckupRequestsPanel'


/* =========================================================
   TEST DATA
   ========================================================= */

const pendingRequest = {
    id: 'request-1',
    vehicleRegistrationNumber:
        'ABC-1234',
    ownerMessage:
        'Please check my vehicle before purchase.',
    requestedDate:
        '2026-10-15T00:00:00.000Z',
    requestedTime:
        '2026-10-15T09:30:00.000Z',
    status: 'Pending'
}


const confirmedRequest = {
    id: 'request-2',
    vehicleRegistrationNumber:
        'XYZ-5678',
    ownerMessage:
        'Please confirm the vehicle checkup.',
    requestedDate:
        '2026-10-16T00:00:00.000Z',
    requestedTime:
        '2026-10-16T10:00:00.000Z',
    status: 'Confirmed'
}


const alternativeRequest = {
    id: 'request-3',
    vehicleRegistrationNumber:
        'CAB-9999',
    ownerMessage:
        'Is another appointment time available?',
    requestedDate:
        '2026-10-17T00:00:00.000Z',
    requestedTime:
        '2026-10-17T11:00:00.000Z',
    garageResponse:
        'We can do 2:00 PM instead.',
    status:
        'AlternativeSuggested'
}


const allRequests = [
    pendingRequest,
    confirmedRequest,
    alternativeRequest
]


/* =========================================================
   COMMON RENDER HELPER
   ========================================================= */

const renderPanel = (
    requests = [pendingRequest],
    options = {}
) => {

    const showToast =
        options.showToast ||
        vi.fn()

    const onCountsChange =
        options.onCountsChange ||
        vi.fn()

    mockGetOrganizationCheckupRequests
        .mockResolvedValue(requests)

    render(
        <CheckupRequestsPanel
            showToast={showToast}
            onCountsChange={onCountsChange}
        />
    )

    return {
        showToast,
        onCountsChange
    }
}


/* =========================================================
   SETUP
   ========================================================= */

beforeEach(() => {
    vi.clearAllMocks()

    mockGetOrganizationCheckupRequests
        .mockResolvedValue(
            [pendingRequest]
        )

    mockAcceptCheckupRequest
        .mockResolvedValue({})

    mockSuggestAlternative
        .mockResolvedValue({})
})


afterEach(() => {
    vi.restoreAllMocks()
})


/* =========================================================
   CHK-001
   Loading State
   ========================================================= */

it(
    'CHK-001 should display the loading state',
    async () => {

        mockGetOrganizationCheckupRequests
            .mockImplementation(
                () =>
                    new Promise(() => {})
            )

        render(
            <CheckupRequestsPanel />
        )

        expect(
            screen.getByText(
                'Loading checkup requests...'
            )
        ).toBeInTheDocument()
    }
)


/* =========================================================
   CHK-002
   Load and Display Request
   ========================================================= */

it(
    'CHK-002 should load and display a pending request',
    async () => {

        renderPanel(
            [pendingRequest]
        )

        expect(
            await screen.findByText(
                'ABC-1234'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Please check my vehicle before purchase.'
            )
        ).toBeInTheDocument()

        /*
         * "Pending" is rendered in both:
         * - the Pending filter
         * - the request status badge
         */
        const pendingElements =
            screen.getAllByText(
                'Pending'
            )

        expect(
            pendingElements.length
        ).toBeGreaterThanOrEqual(2)
    }
)


/* =========================================================
   CHK-003
   API Error
   ========================================================= */

it(
    'CHK-003 should display an error when loading requests fails',
    async () => {

        mockGetOrganizationCheckupRequests
            .mockRejectedValue(
                new Error(
                    'Unable to load checkup requests'
                )
            )

        render(
            <CheckupRequestsPanel />
        )

        expect(
            await screen.findByText(
                'Unable to load checkup requests'
            )
        ).toBeInTheDocument()
    }
)


/* =========================================================
   CHK-004
   Empty State
   ========================================================= */

it(
    'CHK-004 should display the empty state when there are no requests',
    async () => {

        renderPanel([])

        expect(
            await screen.findByText(
                'No requests here'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'No requests with status "Pending".'
            )
        ).toBeInTheDocument()
    }
)


/* =========================================================
   CHK-005
   Status Counts
   ========================================================= */

it(
    'CHK-005 should display correct status counts',
    async () => {

        renderPanel(
            allRequests
        )

        await screen.findByText(
            'ABC-1234'
        )

        /*
         * There should be one count badge
         * for each non-All status:
         *
         * Pending = 1
         * Confirmed = 1
         * Alternative Suggested = 1
         */
        const countBadges =
            screen.getAllByText(
                '1'
            )

        expect(
            countBadges
        ).toHaveLength(3)

        /*
         * Use role queries for the filter buttons
         * because "Pending" also exists as a status badge.
         */
        expect(
            screen.getByRole(
                'button',
                {
                    name: /^Pending/
                }
            )
        ).toBeInTheDocument()

        expect(
            screen.getByRole(
                'button',
                {
                    name: /^Confirmed/
                }
            )
        ).toBeInTheDocument()

        expect(
            screen.getByRole(
                'button',
                {
                    name: /^Alternative Suggested/
                }
            )
        ).toBeInTheDocument()
    }
)


/* =========================================================
   CHK-006
   All Filter
   ========================================================= */

it(
    'CHK-006 should display all requests when All filter is selected',
    async () => {

        const user =
            userEvent.setup()

        renderPanel(
            allRequests
        )

        await screen.findByText(
            'ABC-1234'
        )

        await user.click(
            screen.getByRole(
                'button',
                {
                    name: /^All/
                }
            )
        )

        expect(
            screen.getByText(
                'ABC-1234'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'XYZ-5678'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'CAB-9999'
            )
        ).toBeInTheDocument()
    }
)


/* =========================================================
   CHK-007
   Confirmed Filter
   ========================================================= */

it(
    'CHK-007 should display only confirmed requests',
    async () => {

        const user =
            userEvent.setup()

        renderPanel(
            allRequests
        )

        await screen.findByText(
            'ABC-1234'
        )

        await user.click(
            screen.getByRole(
                'button',
                {
                    name: /Confirmed/
                }
            )
        )

        expect(
            screen.getByText(
                'XYZ-5678'
            )
        ).toBeInTheDocument()

        expect(
            screen.queryByText(
                'ABC-1234'
            )
        ).not.toBeInTheDocument()

        expect(
            screen.queryByText(
                'CAB-9999'
            )
        ).not.toBeInTheDocument()
    }
)


/* =========================================================
   CHK-008
   Alternative Suggested Filter
   ========================================================= */

it(
    'CHK-008 should display only alternative-suggested requests',
    async () => {

        const user =
            userEvent.setup()

        renderPanel(
            allRequests
        )

        await screen.findByText(
            'ABC-1234'
        )

        await user.click(
            screen.getByRole(
                'button',
                {
                    name:
                        /Alternative Suggested/
                }
            )
        )

        expect(
            screen.getByText(
                'CAB-9999'
            )
        ).toBeInTheDocument()

        expect(
            screen.queryByText(
                'ABC-1234'
            )
        ).not.toBeInTheDocument()

        expect(
            screen.queryByText(
                'XYZ-5678'
            )
        ).not.toBeInTheDocument()

        expect(
            screen.getByText(
                'We can do 2:00 PM instead.'
            )
        ).toBeInTheDocument()
    }
)


/* =========================================================
   CHK-009
   Pending Count Callback
   ========================================================= */

it(
    'CHK-009 should report the pending request count to the parent',
    async () => {

        const onCountsChange =
            vi.fn()

        renderPanel(
            allRequests,
            {
                onCountsChange
            }
        )

        await screen.findByText(
            'ABC-1234'
        )

        await waitFor(() => {
            expect(
                onCountsChange
            ).toHaveBeenLastCalledWith(
                1
            )
        })
    }
)


/* =========================================================
   CHK-010
   Accept Success
   ========================================================= */

it(
    'CHK-010 should accept a pending request successfully',
    async () => {

        const user =
            userEvent.setup()

        const showToast =
            vi.fn()

        renderPanel(
            [pendingRequest],
            {
                showToast
            }
        )

        await screen.findByText(
            'ABC-1234'
        )

        await user.click(
            screen.getByRole(
                'button',
                {
                    name: 'Accept'
                }
            )
        )

        await waitFor(() => {
            expect(
                mockAcceptCheckupRequest
            ).toHaveBeenCalledWith(
                'request-1'
            )
        })

        expect(
            showToast
        ).toHaveBeenCalledWith(
            'Checkup confirmed for ABC-1234.'
        )

        await waitFor(() => {
            expect(
                screen.queryByText(
                    'ABC-1234'
                )
            ).not.toBeInTheDocument()
        })
    }
)


/* =========================================================
   CHK-011
   Accept Failure
   ========================================================= */

it(
    'CHK-011 should show an error toast when accepting fails',
    async () => {

        const user =
            userEvent.setup()

        const showToast =
            vi.fn()

        mockAcceptCheckupRequest
            .mockRejectedValue(
                new Error(
                    'Accept request failed'
                )
            )

        renderPanel(
            [pendingRequest],
            {
                showToast
            }
        )

        await screen.findByText(
            'ABC-1234'
        )

        await user.click(
            screen.getByRole(
                'button',
                {
                    name: 'Accept'
                }
            )
        )

        await waitFor(() => {
            expect(
                showToast
            ).toHaveBeenCalledWith(
                'Accept request failed',
                'error'
            )
        })

        expect(
            screen.getByText(
                'ABC-1234'
            )
        ).toBeInTheDocument()
    }
)


/* =========================================================
   CHK-012
   Open Alternative Form
   ========================================================= */

it(
    'CHK-012 should open the Suggest Alternative form',
    async () => {

        const user =
            userEvent.setup()

        renderPanel(
            [pendingRequest]
        )

        await screen.findByText(
            'ABC-1234'
        )

        await user.click(
            screen.getByRole(
                'button',
                {
                    name:
                        'Suggest Alternative'
                }
            )
        )

        expect(
            screen.getByText(
                'Suggested availability'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByPlaceholderText(
                /e\.g\. We are unavailable/
            )
        ).toBeInTheDocument()

        expect(
            screen.getByRole(
                'button',
                {
                    name:
                        'Send to Owner'
                }
            )
        ).toBeInTheDocument()

        expect(
            screen.getByRole(
                'button',
                {
                    name:
                        'Cancel'
                }
            )
        ).toBeInTheDocument()
    }
)


/* =========================================================
   CHK-013
   Empty Alternative Message
   ========================================================= */

it(
    'CHK-013 should reject an empty alternative message',
    async () => {

        const user =
            userEvent.setup()

        const showToast =
            vi.fn()

        renderPanel(
            [pendingRequest],
            {
                showToast
            }
        )

        await screen.findByText(
            'ABC-1234'
        )

        await user.click(
            screen.getByRole(
                'button',
                {
                    name:
                        'Suggest Alternative'
                }
            )
        )

        await user.click(
            screen.getByRole(
                'button',
                {
                    name:
                        'Send to Owner'
                }
            )
        )

        expect(
            showToast
        ).toHaveBeenCalledWith(
            'Please enter the alternative availability details.',
            'error'
        )

        expect(
            mockSuggestAlternative
        ).not.toHaveBeenCalled()

        expect(
            screen.getByText(
                'ABC-1234'
            )
        ).toBeInTheDocument()
    }
)


/* =========================================================
   CHK-014
   Alternative Success
   ========================================================= */

it(
    'CHK-014 should submit an alternative availability successfully',
    async () => {

        const user =
            userEvent.setup()

        const showToast =
            vi.fn()

        renderPanel(
            [pendingRequest],
            {
                showToast
            }
        )

        await screen.findByText(
            'ABC-1234'
        )

        await user.click(
            screen.getByRole(
                'button',
                {
                    name:
                        'Suggest Alternative'
                }
            )
        )

        const textarea =
            screen.getByPlaceholderText(
                /e\.g\. We are unavailable/
            )

        await user.type(
            textarea,
            'We can do the checkup tomorrow at 2 PM.'
        )

        await user.click(
            screen.getByRole(
                'button',
                {
                    name:
                        'Send to Owner'
                }
            )
        )

        await waitFor(() => {
            expect(
                mockSuggestAlternative
            ).toHaveBeenCalledWith(
                'request-1',
                'We can do the checkup tomorrow at 2 PM.'
            )
        })

        expect(
            showToast
        ).toHaveBeenCalledWith(
            'Alternative availability sent to the owner.'
        )

        await user.click(
            screen.getByRole(
                'button',
                {
                    name:
                        /Alternative Suggested/
                }
            )
        )

        expect(
            screen.getByText(
                'ABC-1234'
            )
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'We can do the checkup tomorrow at 2 PM.'
            )
        ).toBeInTheDocument()
    }
)


/* =========================================================
   CHK-015
   Alternative Failure
   ========================================================= */

it(
    'CHK-015 should show an error toast when submitting alternative fails',
    async () => {

        const user =
            userEvent.setup()

        const showToast =
            vi.fn()

        mockSuggestAlternative
            .mockRejectedValue(
                new Error(
                    'Alternative request failed'
                )
            )

        renderPanel(
            [pendingRequest],
            {
                showToast
            }
        )

        await screen.findByText(
            'ABC-1234'
        )

        await user.click(
            screen.getByRole(
                'button',
                {
                    name:
                        'Suggest Alternative'
                }
            )
        )

        const textarea =
            screen.getByPlaceholderText(
                /e\.g\. We are unavailable/
            )

        await user.type(
            textarea,
            'Available tomorrow at 2 PM.'
        )

        await user.click(
            screen.getByRole(
                'button',
                {
                    name:
                        'Send to Owner'
                }
            )
        )

        await waitFor(() => {
            expect(
                showToast
            ).toHaveBeenCalledWith(
                'Alternative request failed',
                'error'
            )
        })

        expect(
            screen.getByText(
                'ABC-1234'
            )
        ).toBeInTheDocument()
    }
)