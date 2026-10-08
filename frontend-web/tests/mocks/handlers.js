import { http, HttpResponse } from 'msw'


/* =========================================================
   TEST DATA
   ========================================================= */

const conversations = [
    {
        userId: 'user-1',
        fullName: 'John Silva',
        phoneNumber: '+94771234567',
        email: 'john@example.com',
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
        status: 'Resolved',
        unreadCount: 0,
        lastMessage:
            'Thank you for your help.',
        lastMessageAt:
            '2026-10-08T09:30:00'
    }
]


const messages = [
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


/* =========================================================
   MSW HANDLERS
   =========================================================
   
   Regex is intentionally used instead of hard-coding
   localhost:5000 because CustomerSupport.jsx uses
   VITE_API_BASE_URL when it is configured.
   ========================================================= */

export const handlers = [

    /* -------------------------------------------------------
       GET CONVERSATIONS
       ------------------------------------------------------- */

    http.get(
        /\/api\/support\/admin\/conversations$/,
        () => {
            return HttpResponse.json(
                conversations
            )
        }
    ),


    /* -------------------------------------------------------
       GET MESSAGES
       ------------------------------------------------------- */

    http.get(
        /\/api\/support\/admin\/conversation\/[^/]+$/,
        () => {
            return HttpResponse.json(
                messages
            )
        }
    ),


    /* -------------------------------------------------------
       POST REPLY
       ------------------------------------------------------- */

    http.post(
        /\/api\/support\/admin\/reply$/,
        async ({ request }) => {

            const body =
                await request.json()

            return HttpResponse.json({
                success: true,
                message:
                    body.message
            })
        }
    ),


    /* -------------------------------------------------------
       POST TICKET STATUS
       ------------------------------------------------------- */

    http.post(
        /\/api\/support\/admin\/ticket-status\/[^/]+$/,
        () => {

            return HttpResponse.json({
                success: true
            })
        }
    )
]