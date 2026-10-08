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

import NotificationsPage from '../../src/pages/admin/NotificationsPage'

import {
    sendBroadcastNotification,
    getMyNotifications,
    getSentNotifications,
    markAsRead,
    uploadNotificationImage,
    deleteNotification
} from '../../src/api/notifications'


/* ======================================================
   MOCK API
====================================================== */

vi.mock('../../src/api/notifications', () => ({
    sendBroadcastNotification: vi.fn(),
    getMyNotifications: vi.fn(),
    getSentNotifications: vi.fn(),
    markAsRead: vi.fn(),
    uploadNotificationImage: vi.fn(),
    deleteNotification: vi.fn()
}))


/* ======================================================
   TEST DATA
====================================================== */

const unreadNotification = {
    id: 1,
    title: 'Summer Discount',
    message: 'Get 20% off your next service.',
    category: 'Promotional',
    isRead: false,
    createdAt: '2026-10-08T10:30:00Z',
    imageUrl: ''
}

const readNotification = {
    id: 2,
    title: 'System Maintenance',
    message: 'The system will be unavailable tonight.',
    category: 'System',
    isRead: true,
    createdAt: '2026-10-07T10:30:00Z',
    imageUrl: ''
}

const imageNotification = {
    id: 3,
    title: 'Service Campaign',
    message: 'Check our latest service campaign.',
    category: 'Reminder',
    isRead: false,
    createdAt: '2026-10-08T12:00:00Z',
    imageUrl:
        'https://example.com/image1.jpg,https://example.com/image2.jpg'
}

const sentNotification = {
    id: 10,
    title: 'Workshop Promotion',
    message: 'Special discount available this week.',
    category: 'Promotional',
    createdAt: '2026-10-08T09:00:00Z',
    imageUrl:
        'https://example.com/promo1.jpg,https://example.com/promo2.jpg'
}


/* ======================================================
   HELPERS
====================================================== */

const setUser = (user) => {
    localStorage.setItem(
        'user',
        JSON.stringify(user)
    )
}

const renderNormalUser = () => {

    setUser({
        role: 'User'
    })

    return render(
        <NotificationsPage />
    )
}

const renderAdmin = () => {

    setUser({
        role: 'Administrator'
    })

    return render(
        <NotificationsPage />
    )
}


/* ======================================================
   SETUP / CLEANUP
====================================================== */

beforeEach(() => {

    vi.clearAllMocks()

    localStorage.clear()

    getMyNotifications.mockResolvedValue([])

    getSentNotifications.mockResolvedValue([])

    markAsRead.mockResolvedValue({})

    deleteNotification.mockResolvedValue({})

    uploadNotificationImage.mockResolvedValue(
        'https://example.com/uploaded.jpg'
    )

    sendBroadcastNotification.mockResolvedValue({})

    vi.spyOn(window, 'alert')
        .mockImplementation(() => {})

    vi.spyOn(window, 'confirm')
        .mockReturnValue(true)

    Object.defineProperty(
        document,
        'getElementById',
        {
            configurable: true,
            value: document.getElementById.bind(document)
        }
    )
})

afterEach(() => {

    cleanup()

    localStorage.clear()

    vi.restoreAllMocks()
})


/* ======================================================
   NORMAL USER NOTIFICATIONS
====================================================== */

describe(
    'NotificationsPage - Normal User',
    () => {

        // FE-NOTIF-001
        it(
            'should display My Notifications for a normal user',
            async () => {

                renderNormalUser()

                expect(
                    await screen.findByText(
                        'My Notifications'
                    )
                ).toBeInTheDocument()

                expect(
                    getMyNotifications
                ).toHaveBeenCalledTimes(1)

                expect(
                    getSentNotifications
                ).not.toHaveBeenCalled()
            }
        )


        // FE-NOTIF-002
        it(
            'should display no notifications message when there are no notifications',
            async () => {

                getMyNotifications.mockResolvedValue([])

                renderNormalUser()

                expect(
                    await screen.findByText(
                        'No notifications yet.'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-NOTIF-003
        it(
            'should display notifications returned by the API',
            async () => {

                getMyNotifications.mockResolvedValue([
                    unreadNotification,
                    readNotification
                ])

                renderNormalUser()

                expect(
                    await screen.findByText(
                        'Summer Discount'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'System Maintenance'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'Get 20% off your next service.'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-NOTIF-004
        it(
            'should display unread notification content',
            async () => {

                getMyNotifications.mockResolvedValue([
                    unreadNotification
                ])

                renderNormalUser()

                expect(
                    await screen.findByText(
                        'Summer Discount'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'Get 20% off your next service.'
                    )
                ).toBeInTheDocument()

                const dot =
                    document.querySelector(
                        '.bg-red-600'
                    )

                expect(dot).toBeInTheDocument()
            }
        )


        // FE-NOTIF-005
        it(
            'should not call markAsRead when a read notification is clicked',
            async () => {

                getMyNotifications.mockResolvedValue([
                    readNotification
                ])

                const user =
                    userEvent.setup()

                renderNormalUser()

                const notification =
                    await screen.findByText(
                        'System Maintenance'
                    )

                await user.click(
                    notification
                )

                expect(
                    markAsRead
                ).not.toHaveBeenCalled()
            }
        )


        // FE-NOTIF-006
        it(
            'should mark an unread notification as read when clicked',
            async () => {

                getMyNotifications.mockResolvedValue([
                    unreadNotification
                ])

                const user =
                    userEvent.setup()

                renderNormalUser()

                const notification =
                    await screen.findByText(
                        'Summer Discount'
                    )

                await user.click(
                    notification
                )

                expect(
                    markAsRead
                ).toHaveBeenCalledWith(
                    unreadNotification.id
                )

                await waitFor(() => {
                    expect(
                        notification
                    ).toBeInTheDocument()
                })
            }
        )


        // FE-NOTIF-007
        it(
            'should display multiple images for a notification',
            async () => {

                getMyNotifications.mockResolvedValue([
                    imageNotification
                ])

                renderNormalUser()

                await screen.findByText(
                    'Service Campaign'
                )

                expect(
                    screen.getByAltText(
                        'Notification 1'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByAltText(
                        'Notification 2'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-NOTIF-008
        it(
            'should display notifications with different categories',
            async () => {

                getMyNotifications.mockResolvedValue([
                    unreadNotification,
                    readNotification
                ])

                renderNormalUser()

                expect(
                    await screen.findByText(
                        'Summer Discount'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'System Maintenance'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-NOTIF-009
        it(
            'should handle notification loading failure without crashing',
            async () => {

                const consoleError =
                    vi.spyOn(
                        console,
                        'error'
                    ).mockImplementation(
                        () => {}
                    )

                getMyNotifications.mockRejectedValue(
                    new Error(
                        'Failed to load notifications'
                    )
                )

                renderNormalUser()

                expect(
                    await screen.findByText(
                        'My Notifications'
                    )
                ).toBeInTheDocument()

                expect(
                    consoleError
                ).toHaveBeenCalledWith(
                    'Failed to load notifications',
                    expect.any(Error)
                )

                consoleError.mockRestore()
            }
        )

    }
)


/* ======================================================
   ADMIN NOTIFICATION PAGE
====================================================== */

describe(
    'NotificationsPage - Admin',
    () => {

        // FE-NOTIF-010
        it(
            'should display the broadcast form for an Administrator',
            async () => {

                renderAdmin()

                expect(
                    await screen.findByText(
                        'Send Broadcast Notification'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Send to All Users'
                        }
                    )
                ).toBeInTheDocument()

                expect(
                    getSentNotifications
                ).toHaveBeenCalledTimes(1)

                expect(
                    getMyNotifications
                ).not.toHaveBeenCalled()
            }
        )


        // FE-NOTIF-011
        it(
            'should display no broadcasts message when none have been sent',
            async () => {

                getSentNotifications.mockResolvedValue([])

                renderAdmin()

                expect(
                    await screen.findByText(
                        'No broadcasts sent yet.'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-NOTIF-012
        it(
            'should display previously sent broadcasts',
            async () => {

                getSentNotifications.mockResolvedValue([
                    sentNotification
                ])

                renderAdmin()

                expect(
                    await screen.findByText(
                        'Workshop Promotion'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByText(
                        'Special discount available this week.'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-NOTIF-013
        it(
            'should require the broadcast title',
            async () => {

                renderAdmin()

                const titleInput =
                    await screen.findByPlaceholderText(
                        'e.g., Summer Discount!'
                    )

                expect(
                    titleInput
                ).toBeRequired()
            }
        )


        // FE-NOTIF-014
        it(
            'should require the broadcast message',
            async () => {

                renderAdmin()

                const messageInput =
                    await screen.findByPlaceholderText(
                        'Write your message here...'
                    )

                expect(
                    messageInput
                ).toBeRequired()
            }
        )


        // FE-NOTIF-015
        it(
            'should select Promotional as the default category',
            async () => {

                renderAdmin()

                const category =
                    await screen.findByRole(
                        'combobox'
                    )

                expect(
                    category
                ).toHaveValue(
                    'Promotional'
                )
            }
        )


        // FE-NOTIF-016
        it(
            'should allow the admin to change the notification category',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                const category =
                    await screen.findByRole(
                        'combobox'
                    )

                await user.selectOptions(
                    category,
                    'Urgent'
                )

                expect(
                    category
                ).toHaveValue(
                    'Urgent'
                )
            }
        )


        // FE-NOTIF-017
        it(
            'should display the number of selected image files',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                const fileInput =
                    await screen.findByLabelText(
                        /Upload Images/i
                    )

                const file =
                    new File(
                        ['image content'],
                        'notice.jpg',
                        {
                            type: 'image/jpeg'
                        }
                    )

                await user.upload(
                    fileInput,
                    file
                )

                expect(
                    await screen.findByText(
                        '1 file(s) selected'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-NOTIF-018
        it(
            'should accept up to 3 images',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                const fileInput =
                    await screen.findByLabelText(
                        /Upload Images/i
                    )

                const files = [
                    new File(
                        ['one'],
                        'one.jpg',
                        {
                            type: 'image/jpeg'
                        }
                    ),
                    new File(
                        ['two'],
                        'two.jpg',
                        {
                            type: 'image/jpeg'
                        }
                    ),
                    new File(
                        ['three'],
                        'three.jpg',
                        {
                            type: 'image/jpeg'
                        }
                    )
                ]

                await user.upload(
                    fileInput,
                    files
                )

                expect(
                    await screen.findByText(
                        '3 file(s) selected'
                    )
                ).toBeInTheDocument()

                expect(
                    window.alert
                ).not.toHaveBeenCalled()
            }
        )


        // FE-NOTIF-019
        it(
            'should alert and retain only the first 3 images when more than 3 are selected',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                const fileInput =
                    await screen.findByLabelText(
                        /Upload Images/i
                    )

                const files = [
                    new File(
                        ['one'],
                        'one.jpg',
                        {
                            type: 'image/jpeg'
                        }
                    ),
                    new File(
                        ['two'],
                        'two.jpg',
                        {
                            type: 'image/jpeg'
                        }
                    ),
                    new File(
                        ['three'],
                        'three.jpg',
                        {
                            type: 'image/jpeg'
                        }
                    ),
                    new File(
                        ['four'],
                        'four.jpg',
                        {
                            type: 'image/jpeg'
                        }
                    )
                ]

                await user.upload(
                    fileInput,
                    files
                )

                expect(
                    window.alert
                ).toHaveBeenCalledWith(
                    'You can only upload a maximum of 3 images.'
                )

                expect(
                    await screen.findByText(
                        '3 file(s) selected'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-NOTIF-020
        it(
            'should send a broadcast without images',
            async () => {

                const user =
                    userEvent.setup()

                renderAdmin()

                await user.type(
                    await screen.findByPlaceholderText(
                        'e.g., Summer Discount!'
                    ),
                    'System Update'
                )

                await user.type(
                    screen.getByPlaceholderText(
                        'Write your message here...'
                    ),
                    'The system has been updated.'
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Send to All Users'
                        }
                    )
                )

                expect(
                    sendBroadcastNotification
                ).toHaveBeenCalledWith({
                    title: 'System Update',
                    message:
                        'The system has been updated.',
                    category: 'Promotional',
                    imageUrl: ''
                })
            }
        )


        // FE-NOTIF-021
        it(
            'should upload images before sending the broadcast',
            async () => {

                const user =
                    userEvent.setup()

                uploadNotificationImage
                    .mockResolvedValueOnce(
                        'https://example.com/one.jpg'
                    )
                    .mockResolvedValueOnce(
                        'https://example.com/two.jpg'
                    )

                renderAdmin()

                await user.type(
                    await screen.findByPlaceholderText(
                        'e.g., Summer Discount!'
                    ),
                    'Image Campaign'
                )

                await user.type(
                    screen.getByPlaceholderText(
                        'Write your message here...'
                    ),
                    'Check these images.'
                )

                const fileInput =
                    screen.getByLabelText(
                        /Upload Images/i
                    )

                const files = [
                    new File(
                        ['one'],
                        'one.jpg',
                        {
                            type: 'image/jpeg'
                        }
                    ),
                    new File(
                        ['two'],
                        'two.jpg',
                        {
                            type: 'image/jpeg'
                        }
                    )
                ]

                await user.upload(
                    fileInput,
                    files
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Send to All Users'
                        }
                    )
                )

                expect(
                    uploadNotificationImage
                ).toHaveBeenCalledTimes(2)

                expect(
                    sendBroadcastNotification
                ).toHaveBeenCalledWith({
                    title: 'Image Campaign',
                    message: 'Check these images.',
                    category: 'Promotional',
                    imageUrl:
                        'https://example.com/one.jpg,https://example.com/two.jpg'
                })
            }
        )


        // FE-NOTIF-022
        it(
            'should display success message and reset the form after a successful broadcast',
            async () => {

                const user =
                    userEvent.setup()

                getSentNotifications
                    .mockResolvedValue([])

                renderAdmin()

                const titleInput =
                    await screen.findByPlaceholderText(
                        'e.g., Summer Discount!'
                    )

                const messageInput =
                    screen.getByPlaceholderText(
                        'Write your message here...'
                    )

                await user.type(
                    titleInput,
                    'Success Test'
                )

                await user.type(
                    messageInput,
                    'Broadcast sent successfully.'
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Send to All Users'
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'Broadcast notification sent to all users!'
                    )
                ).toBeInTheDocument()

                expect(
                    titleInput
                ).toHaveValue('')

                expect(
                    messageInput
                ).toHaveValue('')

                expect(
                    getSentNotifications
                ).toHaveBeenCalledTimes(2)
            }
        )


        // FE-NOTIF-023
        it(
            'should display an error when image upload fails',
            async () => {

                const user =
                    userEvent.setup()

                uploadNotificationImage.mockRejectedValue(
                    new Error(
                        'Image upload failed'
                    )
                )

                renderAdmin()

                await user.type(
                    await screen.findByPlaceholderText(
                        'e.g., Summer Discount!'
                    ),
                    'Image Error Test'
                )

                await user.type(
                    screen.getByPlaceholderText(
                        'Write your message here...'
                    ),
                    'This should fail.'
                )

                const fileInput =
                    screen.getByLabelText(
                        /Upload Images/i
                    )

                const file =
                    new File(
                        ['image'],
                        'failed.jpg',
                        {
                            type: 'image/jpeg'
                        }
                    )

                await user.upload(
                    fileInput,
                    file
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Send to All Users'
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'Image upload failed'
                    )
                ).toBeInTheDocument()

                expect(
                    sendBroadcastNotification
                ).not.toHaveBeenCalled()
            }
        )


        // FE-NOTIF-024
        it(
            'should display an error when broadcast sending fails',
            async () => {

                const user =
                    userEvent.setup()

                sendBroadcastNotification.mockRejectedValue(
                    new Error(
                        'Broadcast sending failed'
                    )
                )

                renderAdmin()

                await user.type(
                    await screen.findByPlaceholderText(
                        'e.g., Summer Discount!'
                    ),
                    'Broadcast Error'
                )

                await user.type(
                    screen.getByPlaceholderText(
                        'Write your message here...'
                    ),
                    'This broadcast should fail.'
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Send to All Users'
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'Broadcast sending failed'
                    )
                ).toBeInTheDocument()
            }
        )


        // FE-NOTIF-025
        it(
            'should show processing state while the broadcast is being sent',
            async () => {

                const user =
                    userEvent.setup()

                sendBroadcastNotification.mockReturnValue(
                    new Promise(() => {})
                )

                renderAdmin()

                await user.type(
                    await screen.findByPlaceholderText(
                        'e.g., Summer Discount!'
                    ),
                    'Loading Test'
                )

                await user.type(
                    screen.getByPlaceholderText(
                        'Write your message here...'
                    ),
                    'Please wait.'
                )

                await user.click(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Send to All Users'
                        }
                    )
                )

                expect(
                    await screen.findByText(
                        'Processing...'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.getByRole(
                        'button',
                        {
                            name: 'Processing...'
                        }
                    )
                ).toBeDisabled()
            }
        )


        // FE-NOTIF-026
        it(
            'should delete a sent broadcast after confirmation',
            async () => {

                const user =
                    userEvent.setup()

                getSentNotifications.mockResolvedValue([
                    sentNotification
                ])

                deleteNotification.mockResolvedValue({})

                renderAdmin()

                await screen.findByText(
                    'Workshop Promotion'
                )

                const deleteButton =
                    screen.getByTitle(
                        'Delete for all users'
                    )

                await user.click(
                    deleteButton
                )

                expect(
                    window.confirm
                ).toHaveBeenCalledWith(
                    'Are you sure you want to delete this notification for all users?'
                )

                expect(
                    deleteNotification
                ).toHaveBeenCalledWith(
                    sentNotification.id
                )

                expect(
                    await screen.findByText(
                        'Notification successfully deleted.'
                    )
                ).toBeInTheDocument()

                expect(
                    screen.queryByText(
                        'Workshop Promotion'
                    )
                ).not.toBeInTheDocument()
            }
        )

    }
)