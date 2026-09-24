using Microsoft.AspNetCore.SignalR;

namespace VSense.API.Hubs;

public class SupportHub : Hub
{
    // Clients invoke this when they open the chat screen
    public async Task JoinChat(string userId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, userId);
    }
}