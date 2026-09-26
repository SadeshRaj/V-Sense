# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files
COPY VSenseBackend.sln ./
COPY VSense.API/VSense.API.csproj VSense.API/
COPY VSense.Application/VSense.Application.csproj VSense.Application/
COPY VSense.Domain/VSense.Domain.csproj VSense.Domain/
COPY VSense.Infrastructure/VSense.Infrastructure.csproj VSense.Infrastructure/
COPY VSense.Tests/VSense.Tests.csproj VSense.Tests/

# Restore dependencies
RUN dotnet restore VSenseBackend.sln

# Copy everything else and publish
COPY . .
WORKDIR /src/VSense.API
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Render exposes the PORT variable and expects HTTP binding
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "VSense.API.dll"]