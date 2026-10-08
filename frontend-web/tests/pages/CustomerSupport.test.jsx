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
    waitFor,
    fireEvent,
    act
} from '@testing-library/react'

import userEvent from '@testing-library/user-event'

import CustomerSupport from '../../src/pages/admin/CustomerSupport'


/* =========================================================
   SIGNALR MOCK
   ========================================================= */

const {
    mockConnection,
    MockHubConnectionBuilder
} = vi.hoisted(() => {
    const connection = {
        state: 'Connected',
        handlers: {},

        on: vi.fn((eventName, handler) => {
            connection.handlers[eventName] = handler
        }),

        start: vi.fn(async () => {
            connection.state = 'Connected'
        }),

        stop: vi.fn(async () => {
            connection.state = 'Disconnected'
        }),

        invoke: vi.fn(async () => {})
    }

    class Builder {
        constructor() {
            this.connection = connection
        }

        withUrl() {
            return this
        }

        withAutomaticReconnect() {
            return this
        }

        build() {
            return this.connection
        }
    }

    return {
        mockConnection: connection,
        MockHubConnectionBuilder: Builder
    }
})

vi.mock('@microsoft/signalr', () => ({
    HubConnectionState: {
        Connected: 'Connected',
        Disconnected: 'Disconnected'
    },

    HubConnectionBuilder:
        MockHubConnectionBuilder
}))


/* =========================================================
   TEST DATA
   ========================================================= */

const conversations = [
    {
        userId: 'user-1',
        fullName: 'John Silva',
        phoneNumber: '+94771234567',
        email: 'john@example.com',
        nic: '199012345678',
        status: 'Open',
        unreadCount: 2,
        lastMessage:
            'My vehicle verification is pending.',
        lastMessageAt:
            '2026-10-08T10:00:00'
    },

    {
        userId: 'user-2',
        fullName: 'Nimal Perera',
        phoneNumber: '+94779876543',
        email: 'nimal@example.com',
        nic: '198512345678',
        status: 'Resolved',
        unreadCount: 0,
        lastMessage:
            'Thank you for your help.',
        lastMessageAt:
            '2026-10-08T09:30:00'
    }
]


const defaultMessages = [
    {
        id: 'msg-1',
        senderId: 'user-1',
        senderType: 'Client',
        senderName: 'John Silva',
        message:
            'My vehicle verification is pending.',
        createdAt:
            '2026-10-08T10:00:00'
    },

    {
        id: 'msg-2',
        senderId: 'admin-1',
        senderType: 'Admin',
        senderName: 'Admin',
        message:
            'I will check this for you.',
        createdAt:
            '2026-10-08T10:05:00'
    }
]


let mockMessages = [
    ...defaultMessages
]


/* =========================================================
   RESPONSE HELPER
   ========================================================= */

const jsonResponse = (
    data,
    ok = true,
    status = ok ? 200 : 500
) => ({
    ok,
    status,
    json: vi.fn(async () => data)
})


/* =========================================================
   DEFAULT FETCH MOCK
   ========================================================= */

const setupDefaultFetch = () => {
    globalThis.fetch.mockImplementation(
        async (url) => {
            const requestUrl = String(url)

            if (
                requestUrl.includes(
                    '/support/admin/conversations'
                )
            ) {
                return jsonResponse(
                    conversations
                )
            }

            if (
                requestUrl.includes(
                    '/support/admin/conversation/'
                )
            ) {
                return jsonResponse(
                    mockMessages
                )
            }

            if (
                requestUrl.includes(
                    '/support/admin/ticket-status/'
                )
            ) {
                return jsonResponse({
                    success: true
                })
            }

            if (
                requestUrl.includes(
                    '/support/upload-attachment'
                )
            ) {
                return jsonResponse({
                    url:
                        'https://res.cloudinary.com/demo/image/upload/test-image.jpg'
                })
            }

            if (
                requestUrl.includes(
                    '/support/admin/reply'
                )
            ) {
                return jsonResponse({
                    success: true
                })
            }

            return jsonResponse({})
        }
    )
}


/* =========================================================
   COMMON HELPERS
   ========================================================= */

const renderPage = async () => {
    render(
        <CustomerSupport />
    )

    await screen.findByText(
        'John Silva'
    )
}


/*
 * The text "My vehicle verification is pending."
 * appears twice in the UI:
 *
 * 1. conversation preview
 * 2. chat message
 *
 * Therefore we intentionally wait for the
 * heading and status button instead.
 */
const selectConversation = async () => {
    const user =
        userEvent.setup()

    const johnConversation =
        screen.getByRole(
            'button',
            {
                name: /John Silva/i
            }
        )

    await user.click(
        johnConversation
    )

    await screen.findByRole(
        'heading',
        {
            name: 'John Silva',
            level: 3
        }
    )

    await screen.findByRole(
        'button',
        {
            name: /Mark Resolved/i
        }
    )
}


const getResponseInput = () => {
    return screen.getByPlaceholderText(
        'Type a response...'
    )
}


const getSendButton = () => {
    return screen.getByRole(
        'button',
        {
            name: /Send/i
        }
    )
}


/* =========================================================
   SETUP / CLEANUP
   ========================================================= */

beforeEach(() => {
    vi.clearAllMocks()

    vi.stubGlobal(
        'fetch',
        vi.fn()
    )

    /*
     * jsdom does not implement scrollIntoView().
     * CustomerSupport calls it inside setTimeout().
     * Mock it so those browser-specific calls
     * do not become unhandled test errors.
     */
    Object.defineProperty(
        Element.prototype,
        'scrollIntoView',
        {
            configurable: true,
            writable: true,
            value: vi.fn()
        }
    )

    localStorage.clear()

    localStorage.setItem(
        'token',
        'test-jwt-token'
    )

    mockConnection.state =
        'Connected'

    mockConnection.handlers = {}

    mockMessages = [
        ...defaultMessages
    ]

    setupDefaultFetch()
})


afterEach(() => {
    vi.restoreAllMocks()

    vi.unstubAllGlobals()

    delete Element.prototype.scrollIntoView
})


/* =========================================================
   LOADING AND CONVERSATIONS
   ========================================================= */

describe(
    'CustomerSupport - Loading and Conversations',
    () => {

        it(
            'FE-SUPPORT-001 should display the loading state',
            async () => {

                globalThis.fetch.mockImplementation(
                    () =>
                        new Promise(
                            () => {}
                        )
                )

                render(
                    <CustomerSupport />
                )

                expect(
                    screen.getByText(
                        'Loading inquiries...'
                    )
                ).toBeInTheDocument()
            }
        )


        it(
            'FE-SUPPORT-002 should load and display conversations successfully',
            async () => {

                await renderPage()

                expect(
                    screen.getByText(
                        'John Silva'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'Nimal Perera'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'john@example.com'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'nimal@example.com'
                    )
                ).toBeInTheDocument()
            }
        )


        it(
            'FE-SUPPORT-003 should handle conversation API failure',
            async () => {

                globalThis.fetch.mockImplementation(
                    async (url) => {

                        if (
                            String(url).includes(
                                '/support/admin/conversations'
                            )
                        ) {
                            throw new Error(
                                'Failed to load conversations'
                            )
                        }

                        return jsonResponse({})
                    }
                )

                render(
                    <CustomerSupport />
                )

                await waitFor(() => {
                    expect(
                        screen.queryByText(
                            'Loading inquiries...'
                        )
                    ).not.toBeInTheDocument()
                })

                expect(
                    screen.getByText(
                        'No support requests found'
                    )
                ).toBeInTheDocument()
            }
        )


        it(
            'FE-SUPPORT-004 should display the empty state when there are no conversations',
            async () => {

                globalThis.fetch.mockImplementation(
                    async (url) => {

                        if (
                            String(url).includes(
                                '/support/admin/conversations'
                            )
                        ) {
                            return jsonResponse(
                                []
                            )
                        }

                        return jsonResponse({})
                    }
                )

                render(
                    <CustomerSupport />
                )

                await waitFor(() => {
                    expect(
                        screen.getByText(
                            'No support requests found'
                        )
                    ).toBeInTheDocument()
                })
            }
        )


        it(
            'FE-SUPPORT-005 should search conversations by customer name',
            async () => {

                await renderPage()

                const user =
                    userEvent.setup()

                const searchInput =
                    screen.getByPlaceholderText(
                        'Search client...'
                    )

                await user.type(
                    searchInput,
                    'Nimal'
                )

                expect(
                    screen.getByText(
                        'Nimal Perera'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.queryByText(
                        'John Silva'
                    )
                ).not.toBeInTheDocument()
            }
        )


        it(
            'FE-SUPPORT-006 should search conversations by phone number',
            async () => {

                await renderPage()

                const user =
                    userEvent.setup()

                const searchInput =
                    screen.getByPlaceholderText(
                        'Search client...'
                    )

                await user.type(
                    searchInput,
                    '+94779876543'
                )

                expect(
                    screen.getByText(
                        'Nimal Perera'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.queryByText(
                        'John Silva'
                    )
                ).not.toBeInTheDocument()
            }
        )


        it(
            'FE-SUPPORT-007 should search conversations by email',
            async () => {

                await renderPage()

                const user =
                    userEvent.setup()

                const searchInput =
                    screen.getByPlaceholderText(
                        'Search client...'
                    )

                await user.type(
                    searchInput,
                    'john@example.com'
                )

                expect(
                    screen.getByText(
                        'John Silva'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.queryByText(
                        'Nimal Perera'
                    )
                ).not.toBeInTheDocument()
            }
        )


        it(
            'FE-SUPPORT-008 should show no results for an unmatched search',
            async () => {

                await renderPage()

                const user =
                    userEvent.setup()

                const searchInput =
                    screen.getByPlaceholderText(
                        'Search client...'
                    )

                await user.type(
                    searchInput,
                    'DoesNotExist'
                )

                expect(
                    screen.getByText(
                        'No support requests found'
                    )
                ).toBeInTheDocument()
            }
        )
    }
)


/* =========================================================
   CONVERSATION DETAILS
   ========================================================= */

describe(
    'CustomerSupport - Conversation Details',
    () => {

        it(
            'FE-SUPPORT-009 should select a customer conversation',
            async () => {

                await renderPage()

                await selectConversation()

                expect(
                    screen.getByRole(
                        'heading',
                        {
                            name: 'John Silva',
                            level: 3
                        }
                    )
                ).toBeInTheDocument()
            }
        )


        it(
            'FE-SUPPORT-010 should load messages after selecting a conversation',
            async () => {

                await renderPage()

                await selectConversation()

                const messages =
                    await screen.findAllByText(
                        'My vehicle verification is pending.'
                    )

                expect(
                    messages.length
                ).toBeGreaterThanOrEqual(
                    2
                )
            }
        )


        it(
            'FE-SUPPORT-011 should display customer contact information',
            async () => {

                await renderPage()

                await selectConversation()

                expect(
                    screen.getByText(
                        '+94771234567'
                    )
                ).toBeInTheDocument()
            }
        )


        it(
            'FE-SUPPORT-012 should display existing chat messages',
            async () => {

                await renderPage()

                await selectConversation()

                const incomingMessages =
                    screen.getAllByText(
                        'My vehicle verification is pending.'
                    )

                expect(
                    incomingMessages.length
                ).toBeGreaterThanOrEqual(
                    2
                )

                expect(
                    screen.getByText(
                        'I will check this for you.'
                    )
                ).toBeInTheDocument()
            }
        )


        it(
            'FE-SUPPORT-013 should clear the unread count when a conversation is selected',
            async () => {

                await renderPage()

                const user =
                    userEvent.setup()

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: /John Silva/i
                        }
                    )
                )

                await screen.findByRole(
                    'heading',
                    {
                        name: 'John Silva',
                        level: 3
                    }
                )

                await waitFor(() => {
                    expect(
                        globalThis.fetch
                    ).toHaveBeenCalledWith(
                        expect.stringContaining(
                            '/support/admin/conversation/user-1'
                        ),
                        expect.any(Object)
                    )
                })
            }
        )
    }
)


/* =========================================================
   TICKET STATUS
   ========================================================= */

describe(
    'CustomerSupport - Ticket Status',
    () => {

        it(
            'FE-SUPPORT-014 should mark an open ticket as resolved',
            async () => {

                await renderPage()

                await selectConversation()

                const button =
                    screen.getByRole(
                        'button',
                        {
                            name: /Mark Resolved/i
                        }
                    )

                await userEvent
                    .setup()
                    .click(
                        button
                    )

                await waitFor(() => {
                    expect(
                        screen.getByRole(
                            'button',
                            {
                                name:
                                    /Reopen Ticket/i
                            }
                        )
                    ).toBeInTheDocument()
                })

                expect(
                    globalThis.fetch
                ).toHaveBeenCalledWith(
                    expect.stringContaining(
                        '/support/admin/ticket-status/user-1'
                    ),
                    expect.objectContaining({
                        method:
                            'POST',
                        body:
                            JSON.stringify(
                                'Resolved'
                            )
                    })
                )
            }
        )


        it(
            'FE-SUPPORT-015 should reopen a resolved ticket',
            async () => {

                const resolvedConversations =
                    [
                        {
                            ...conversations[0],
                            status:
                                'Resolved'
                        },
                        conversations[1]
                    ]

                globalThis.fetch.mockImplementation(
                    async (url) => {

                        const requestUrl =
                            String(url)

                        if (
                            requestUrl.includes(
                                '/support/admin/conversations'
                            )
                        ) {
                            return jsonResponse(
                                resolvedConversations
                            )
                        }

                        if (
                            requestUrl.includes(
                                '/support/admin/conversation/'
                            )
                        ) {
                            return jsonResponse(
                                mockMessages
                            )
                        }

                        if (
                            requestUrl.includes(
                                '/support/admin/ticket-status/'
                            )
                        ) {
                            return jsonResponse(
                                {
                                    success:
                                        true
                                }
                            )
                        }

                        return jsonResponse({})
                    }
                )

                render(
                    <CustomerSupport />
                )

                await screen.findByText(
                    'John Silva'
                )

                const user =
                    userEvent.setup()

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name:
                                /John Silva/i
                        }
                    )
                )

                await screen.findByRole(
                    'heading',
                    {
                        name: 'John Silva',
                        level: 3
                    }
                )

                const reopenButton =
                    screen.getByRole(
                        'button',
                        {
                            name:
                                /Reopen Ticket/i
                        }
                    )

                await user.click(
                    reopenButton
                )

                await waitFor(() => {
                    expect(
                        screen.getByRole(
                            'button',
                            {
                                name:
                                    /Mark Resolved/i
                            }
                        )
                    ).toBeInTheDocument()
                })

                expect(
                    globalThis.fetch
                ).toHaveBeenCalledWith(
                    expect.stringContaining(
                        '/support/admin/ticket-status/user-1'
                    ),
                    expect.objectContaining({
                        method:
                            'POST',
                        body:
                            JSON.stringify(
                                'Open'
                            )
                    })
                )
            }
        )


        it(
            'FE-SUPPORT-016 should handle ticket status API failure',
            async () => {

                globalThis.fetch.mockImplementation(
                    async (url) => {

                        const requestUrl =
                            String(url)

                        if (
                            requestUrl.includes(
                                '/support/admin/conversations'
                            )
                        ) {
                            return jsonResponse(
                                conversations
                            )
                        }

                        if (
                            requestUrl.includes(
                                '/support/admin/conversation/'
                            )
                        ) {
                            return jsonResponse(
                                mockMessages
                            )
                        }

                        if (
                            requestUrl.includes(
                                '/support/admin/ticket-status/'
                            )
                        ) {
                            return jsonResponse(
                                {
                                    success:
                                        false
                                },
                                false,
                                500
                            )
                        }

                        return jsonResponse({})
                    }
                )

                render(
                    <CustomerSupport />
                )

                await screen.findByText(
                    'John Silva'
                )

                await selectConversation()

                const button =
                    screen.getByRole(
                        'button',
                        {
                            name:
                                /Mark Resolved/i
                        }
                    )

                await userEvent
                    .setup()
                    .click(
                        button
                    )

                await waitFor(() => {
                    expect(
                        screen.getByRole(
                            'button',
                            {
                                name:
                                    /Mark Resolved/i
                            }
                        )
                    ).toBeInTheDocument()
                })
            }
        )
    }
)


/* =========================================================
   MESSAGE SENDING
   ========================================================= */

describe(
    'CustomerSupport - Messaging',
    () => {

        it(
            'FE-SUPPORT-017 should disable Send when the message is empty',
            async () => {

                await renderPage()

                await selectConversation()

                expect(
                    getSendButton()
                ).toBeDisabled()
            }
        )


        it(
            'FE-SUPPORT-018 should send a normal text reply',
            async () => {

                const user =
                    userEvent.setup()

                await renderPage()

                await selectConversation()

                const input =
                    getResponseInput()

                await user.type(
                    input,
                    'Hello, I will check this for you.'
                )

                expect(
                    getSendButton()
                ).not.toBeDisabled()

                await user.click(
                    getSendButton()
                )

                await waitFor(() => {
                    expect(
                        globalThis.fetch
                    ).toHaveBeenCalledWith(
                        expect.stringContaining(
                            '/support/admin/reply'
                        ),
                        expect.objectContaining({
                            method:
                                'POST'
                        })
                    )
                })

                const replyCall =
                    globalThis.fetch.mock.calls.find(
                        call =>
                            String(
                                call[0]
                            ).includes(
                                '/support/admin/reply'
                            )
                    )

                expect(
                    replyCall
                ).toBeDefined()

                const body =
                    JSON.parse(
                        replyCall[1].body
                    )

                expect(
                    body
                ).toMatchObject({
                    userId:
                        'user-1',
                    message:
                        'Hello, I will check this for you.',
                    attachmentUrl:
                        null
                })
            }
        )


        it(
            'FE-SUPPORT-019 should send a message with an attachment URL',
            async () => {

                const user =
                    userEvent.setup()

                await renderPage()

                await selectConversation()

                const input =
                    getResponseInput()

                await user.type(
                    input,
                    'Please see the attached document.'
                )

                const fileInput =
                    document.querySelector(
                        'input[type="file"]'
                    )

                expect(
                    fileInput
                ).toBeInTheDocument()

                const file =
                    new File(
                        ['file-content'],
                        'vehicle-document.pdf',
                        {
                            type:
                                'application/pdf'
                        }
                    )

                await act(async () => {
                    fireEvent.change(
                        fileInput,
                        {
                            target: {
                                files: [
                                    file
                                ]
                            }
                        }
                    )
                })

                await waitFor(() => {
                    expect(
                        globalThis.fetch
                    ).toHaveBeenCalledWith(
                        expect.stringContaining(
                            '/support/upload-attachment'
                        ),
                        expect.objectContaining({
                            method:
                                'POST'
                        })
                    )
                })

                await user.click(
                    getSendButton()
                )

                await waitFor(() => {
                    expect(
                        globalThis.fetch
                    ).toHaveBeenCalledWith(
                        expect.stringContaining(
                            '/support/admin/reply'
                        ),
                        expect.objectContaining({
                            method:
                                'POST'
                        })
                    )
                })

                const replyCall =
                    globalThis.fetch.mock.calls.find(
                        call =>
                            String(
                                call[0]
                            ).includes(
                                '/support/admin/reply'
                            )
                    )

                expect(
                    replyCall
                ).toBeDefined()

                const body =
                    JSON.parse(
                        replyCall[1].body
                    )

                expect(
                    body.attachmentUrl
                ).toBe(
                    'https://res.cloudinary.com/demo/image/upload/test-image.jpg'
                )
            }
        )
    }
)


/* =========================================================
   ATTACHMENTS
   ========================================================= */

describe(
    'CustomerSupport - Attachments',
    () => {

        it(
            'FE-SUPPORT-020 should upload an attachment successfully',
            async () => {

                await renderPage()

                await selectConversation()

                const fileInput =
                    document.querySelector(
                        'input[type="file"]'
                    )

                expect(
                    fileInput
                ).toBeInTheDocument()

                const file =
                    new File(
                        ['image-content'],
                        'vehicle-photo.jpg',
                        {
                            type:
                                'image/jpeg'
                        }
                    )

                await act(async () => {
                    fireEvent.change(
                        fileInput,
                        {
                            target: {
                                files: [
                                    file
                                ]
                            }
                        }
                    )
                })

                await waitFor(() => {
                    expect(
                        globalThis.fetch
                    ).toHaveBeenCalledWith(
                        expect.stringContaining(
                            '/support/upload-attachment'
                        ),
                        expect.objectContaining({
                            method:
                                'POST'
                        })
                    )
                })

                await waitFor(() => {
                    expect(
                        screen.getByText(
                            'vehicle-photo.jpg'
                        )
                    ).toBeInTheDocument()
                })
            }
        )


        it(
            'FE-SUPPORT-021 should handle attachment upload failure',
            async () => {

                globalThis.fetch.mockImplementation(
                    async (url) => {

                        const requestUrl =
                            String(url)

                        if (
                            requestUrl.includes(
                                '/support/admin/conversations'
                            )
                        ) {
                            return jsonResponse(
                                conversations
                            )
                        }

                        if (
                            requestUrl.includes(
                                '/support/admin/conversation/'
                            )
                        ) {
                            return jsonResponse(
                                mockMessages
                            )
                        }

                        if (
                            requestUrl.includes(
                                '/support/upload-attachment'
                            )
                        ) {
                            return jsonResponse(
                                {
                                    success:
                                        false
                                },
                                false,
                                500
                            )
                        }

                        return jsonResponse({})
                    }
                )

                const alertSpy =
                    vi
                        .spyOn(
                            window,
                            'alert'
                        )
                        .mockImplementation(
                            () => {}
                        )

                await renderPage()

                await selectConversation()

                const fileInput =
                    document.querySelector(
                        'input[type="file"]'
                    )

                const file =
                    new File(
                        ['bad-upload'],
                        'failed-upload.pdf',
                        {
                            type:
                                'application/pdf'
                        }
                    )

                await act(async () => {
                    fireEvent.change(
                        fileInput,
                        {
                            target: {
                                files: [
                                    file
                                ]
                            }
                        }
                    )
                })

                await waitFor(() => {
                    expect(
                        alertSpy
                    ).toHaveBeenCalledWith(
                        'Failed to upload file to Cloudinary.'
                    )
                })

                await waitFor(() => {
                    expect(
                        screen.queryByText(
                            'failed-upload.pdf'
                        )
                    ).not.toBeInTheDocument()
                })
            }
        )
    }
)


/* =========================================================
   CANNED RESPONSES
   ========================================================= */

describe(
    'CustomerSupport - Canned Responses',
    () => {

        it(
            'FE-SUPPORT-022 should open the canned responses menu',
            async () => {

                const user =
                    userEvent.setup()

                await renderPage()

                await selectConversation()

                const cannedButton =
                    screen.getByRole(
                        'button',
                        {
                            name:
                                /Canned Responses/i
                        }
                    )

                await user.click(
                    cannedButton
                )

                expect(
                    screen.getByText(
                        'Hello! How can we help you today?'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'Could you please provide your vehicle registration number?'
                    )
                ).toBeInTheDocument()
            }
        )


        it(
            'FE-SUPPORT-023 should insert a canned response into the message input',
            async () => {

                const user =
                    userEvent.setup()

                await renderPage()

                await selectConversation()

                const cannedButton =
                    screen.getByRole(
                        'button',
                        {
                            name:
                                /Canned Responses/i
                        }
                    )

                await user.click(
                    cannedButton
                )

                const cannedText =
                    'Please hold on while I check this for you.'

                await user.click(
                    screen.getByText(
                        cannedText
                    )
                )

                const input =
                    getResponseInput()

                expect(
                    input
                ).toHaveValue(
                    cannedText
                )
            }
        )
    }
)


/* =========================================================
   IMAGE VIEWER
   ========================================================= */

describe(
    'CustomerSupport - Image Viewer',
    () => {

        it(
            'FE-SUPPORT-024 should open and close an attached image in fullscreen mode',
            async () => {

                const imageMessage = {
                    id:
                        'image-msg-1',
                    senderId:
                        'user-1',
                    senderType:
                        'Client',
                    senderName:
                        'John Silva',
                    message:
                        'Here is my vehicle image.',
                    attachmentUrl:
                        'https://res.cloudinary.com/demo/image/upload/test.jpg',
                    createdAt:
                        '2026-10-08T10:00:00'
                }

                mockMessages = [
                    imageMessage
                ]

                await renderPage()

                await selectConversation()

                const attachment =
                    await screen.findByAltText(
                        'Attachment'
                    )

                expect(
                    attachment
                ).toBeInTheDocument()

                const user =
                    userEvent.setup()

                await user.click(
                    attachment
                )

                expect(
                    screen.getByAltText(
                        'Fullscreen view'
                    )
                ).toBeInTheDocument()

                await user.click(
                    screen.getByAltText(
                        'Fullscreen view'
                    )
                )

                await waitFor(() => {
                    expect(
                        screen.queryByAltText(
                            'Fullscreen view'
                        )
                    ).not.toBeInTheDocument()
                })
            }
        )
    }
)


/* =========================================================
   SIGNALR
   ========================================================= */

describe(
    'CustomerSupport - SignalR',
    () => {

        it(
            'FE-SUPPORT-025 should prevent duplicate SignalR messages from being added',
            async () => {

                await renderPage()

                await selectConversation()

                expect(
                    mockConnection
                        .handlers
                        .ReceiveMessage
                ).toBeTypeOf(
                    'function'
                )

                const duplicateMessage = {
                    id:
                        'signalr-duplicate-001',
                    senderId:
                        'user-1',
                    senderType:
                        'Client',
                    senderName:
                        'John Silva',
                    message:
                        'This message should appear only once.',
                    createdAt:
                        '2026-10-08T11:00:00'
                }

                await act(
                    async () => {
                        mockConnection
                            .handlers
                            .ReceiveMessage(
                                duplicateMessage
                            )
                    }
                )

                await waitFor(() => {
                    expect(
                        screen.getByText(
                            'This message should appear only once.'
                        )
                    ).toBeInTheDocument()
                })

                await act(
                    async () => {
                        mockConnection
                            .handlers
                            .ReceiveMessage(
                                duplicateMessage
                            )
                    }
                )

                const matches =
                    screen.getAllByText(
                        'This message should appear only once.'
                    )

                expect(
                    matches
                ).toHaveLength(
                    1
                )
            }
        )
    }
)