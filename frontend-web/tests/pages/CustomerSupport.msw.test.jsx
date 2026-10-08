import React from 'react'

import {
    describe,
    it,
    expect,
    vi,
    beforeAll,
    afterAll,
    afterEach
} from 'vitest'

import {
    render,
    screen,
    waitFor
} from '@testing-library/react'

import userEvent from '@testing-library/user-event'

import {
    http,
    HttpResponse
} from 'msw'

import {
    server
} from '../mocks/server'


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

        on: vi.fn(
            (
                eventName,
                handler
            ) => {

                connection
                    .handlers[
                        eventName
                    ] = handler
            }
        ),

        start: vi.fn(
            async () => {

                connection.state =
                    'Connected'
            }
        ),

        stop: vi.fn(
            async () => {

                connection.state =
                    'Disconnected'
            }
        ),

        invoke: vi.fn(
            async () => {}
        )
    }


    class Builder {

        constructor() {

            this.connection =
                connection
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
        mockConnection:
            connection,

        MockHubConnectionBuilder:
            Builder
    }
})


/* =========================================================
   SIGNALR MODULE MOCK
   ========================================================= */

vi.mock(
    '@microsoft/signalr',
    () => ({
        HubConnectionState: {
            Connected:
                'Connected',

            Disconnected:
                'Disconnected'
        },

        HubConnectionBuilder:
            MockHubConnectionBuilder
    })
)


/* =========================================================
   COMPONENT
   ========================================================= */

import CustomerSupport
    from '../../src/pages/admin/CustomerSupport'


/* =========================================================
   MSW SERVER LIFECYCLE
   ========================================================= */

beforeAll(() => {

    server.listen({
        onUnhandledRequest:
            'error'
    })

})


afterEach(() => {

    server.resetHandlers()

    localStorage.clear()

})


afterAll(() => {

    server.close()

})


/* =========================================================
   MSW-001
   SUCCESSFUL CONVERSATION RESPONSE
   ========================================================= */

it(
    'MSW-001 should load conversations using a mocked API response',
    async () => {

        localStorage.setItem(
            'token',
            'test-jwt-token'
        )


        render(
            <CustomerSupport />
        )


        /*
         * Verify the MSW handler returned
         * the mocked conversation data.
         */

        expect(
            await screen.findByText(
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

    }
)


/* =========================================================
   MSW-002
   HTTP 500 RESPONSE
   ========================================================= */

it(
    'MSW-002 should handle a server error from the conversations API',
    async () => {

        server.use(

            http.get(
                /\/api\/support\/admin\/conversations$/,
                () => {

                    return new HttpResponse(
                        null,
                        {
                            status: 500
                        }
                    )
                }
            )

        )


        localStorage.setItem(
            'token',
            'test-jwt-token'
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


/* =========================================================
   MSW-003
   SUCCESSFUL MESSAGE RESPONSE
   ========================================================= */

it(
    'MSW-003 should return mocked messages when a conversation is selected',
    async () => {

        localStorage.setItem(
            'token',
            'test-jwt-token'
        )


        const user =
            userEvent.setup()


        render(
            <CustomerSupport />
        )


        /*
         * First prove that MSW returned
         * the conversation data.
         */

        const john =
            await screen.findByText(
                'John Silva'
            )

        expect(
            john
        ).toBeInTheDocument()


        /*
         * The conversation is rendered
         * inside a button.
         */

        const johnButton =
            screen.getByRole(
                'button',
                {
                    name:
                        /John Silva/i
                }
            )


        await user.click(
            johnButton
        )


        /*
         * Wait until the selected customer
         * panel is displayed.
         */

        await screen.findByRole(
            'heading',
            {
                name:
                    'John Silva',
                level:
                    3
            }
        )


        /*
         * Verify the mocked MSW message.
         */

        expect(
            screen.getByText(
                'I will check this for you.'
            )
        ).toBeInTheDocument()

    }
)


/* =========================================================
   MSW-004
   HTTP 401 RESPONSE
   ========================================================= */

it(
    'MSW-004 should handle an unauthorized API response',
    async () => {

        server.use(

            http.get(
                /\/api\/support\/admin\/conversations$/,
                () => {

                    return new HttpResponse(
                        null,
                        {
                            status: 401
                        }
                    )
                }
            )

        )


        localStorage.removeItem(
            'token'
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