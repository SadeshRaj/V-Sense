import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/config/env_config.dart';
import 'search_vehicle_screen.dart';
import 'my_garage_screen.dart';
import 'partnered_garages_screen.dart'; // <-- Added import for Partnered Garages Screen
import 'request_checkup_screen.dart'; // <-- Added import for Request Checkup Screen
import '../../auth/screens/login_screen.dart';
import '../../support/screens/support_chat_screen.dart';
import '../../notifications/screens/notifications_screen.dart';
import '../../notifications/services/notification_service.dart';
import 'digital_certs_screen.dart';
import 'qr_scanner_screen.dart';
import 'report_info_screen.dart';
import '../../../features/settings/screens/settings_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _userName = '';
  String? _profilePictureUrl;
  int _vehicleCount = 0;
  bool _isLoadingVehicles = true;
  final _storage = const FlutterSecureStorage();
  int _currentIndex = 0;

  // Notification state
  int _unreadNotificationsCount = 0;
  int _unreadSupportCount = 0;
  final NotificationService _notificationService = NotificationService();

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    await _loadUserData();
    await _fetchVehicleCount();
    await _fetchUnreadCount();
    await _fetchUnreadSupportCount();
  }

  Future<void> _fetchUnreadCount() async {
    final count = await _notificationService.getUnreadCount();
    if (mounted) {
      setState(() {
        _unreadNotificationsCount = count;
      });
    }
  }

  Future<void> _fetchUnreadSupportCount() async {
    try {
      final token = await _storage.read(key: 'jwt_token');
      if (token == null) return;

      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/support/unread-count'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _unreadSupportCount = data['count'] ?? 0;
          });
        }
      }
    } catch (e) {
      // Intentionally silences failure so Dashboard still loads
    }
  }

  Future<void> _loadUserData() async {
    final name = await _storage.read(key: 'user_name');
    if (mounted) {
      setState(() => _userName = name ?? 'Client');
    }
    await _fetchProfilePicture();
  }

  // Fetches the current profile picture URL from the same endpoint Settings
  // uses. Kept as its own request since secure storage only caches the
  // display name, not the avatar URL.
  Future<void> _fetchProfilePicture() async {
    try {
      final token = await _storage.read(key: 'jwt_token');
      if (token == null) return;

      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/users/me'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() => _profilePictureUrl = data['profilePictureUrl']);
        }
      }
    } catch (e) {
      // Silently ignore — avatar just falls back to the placeholder icon
    }
  }

  Future<void> _fetchVehicleCount() async {
    try {
      final token = await _storage.read(key: 'jwt_token');
      if (token == null) return;

      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/vehicles/my-vehicles'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> vehicles = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _vehicleCount = vehicles.length;
            _isLoadingVehicles = false;
          });
        }
      } else {
        if (mounted) setState(() => _isLoadingVehicles = false);
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingVehicles = false);
    }
  }

  Future<void> _logout() async {
    await _storage.deleteAll();
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  String getGreeting() {
    var hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  }

  void _navigateToGarage() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const MyGarageScreen()),
    ).then((_) => _fetchVehicleCount());
  }

  void _navigateToSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const SettingsScreen()),
    ).then((_) => _loadUserData()); // refresh name/avatar in case they changed
  }

  void _navigateToRequestCheckup() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const RequestCheckupScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    const Color backgroundLight = Color(0xFFF8FAFC);
    const Color navyDeep = Color(0xFF0A1930);
    const Color accentBlue = Color(0xFF2563EB);
    const Color accentGold = Color(0xFFD4AF37);
    const Color accentEmerald = Color(0xFF10B981);
    const Color textGrey = Color(0xFF64748B);

    // MERGED BADGE COUNT: Combine System Notifications + Unread Support Messages
    int totalAlerts = _unreadNotificationsCount + _unreadSupportCount;

    return Scaffold(
      backgroundColor: backgroundLight,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  // FIX: logo wrapped in Flexible so it shrinks instead of
                  // pushing the icon cluster off-screen (was causing the
                  // yellow/black RenderFlex overflow banner near the logo).
                  Flexible(
                    child: Image.asset(
                      'assets/logo_S.png',
                      height: 40,
                      fit: BoxFit.contain,
                      alignment: Alignment.centerLeft,
                      errorBuilder: (context, error, stackTrace) {
                        return Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(10),
                                boxShadow: [
                                  BoxShadow(
                                    color: navyDeep.withOpacity(0.06),
                                    blurRadius: 12,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: const Icon(Icons.verified_outlined, size: 22, color: accentBlue),
                            ),
                            const SizedBox(width: 12),
                            const Flexible(
                              child: Text(
                                'V-SENSE',
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: navyDeep,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 2.5,
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  // FIX: icon cluster given a fixed minimal footprint
                  // (mainAxisSize.min + tighter padding/spacing) so it never
                  // competes for space with the logo above.
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Notifications Bell Icon WITH MERGED TOTAL ALERTS
                      Stack(
                        alignment: Alignment.topRight,
                        children: [
                          IconButton(
                            padding: const EdgeInsets.all(4),
                            constraints: const BoxConstraints(),
                            icon: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: accentBlue.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.notifications_outlined, color: accentBlue, size: 20),
                            ),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                              ).then((_) {
                                _fetchUnreadCount();
                                _fetchUnreadSupportCount();
                              });
                            },
                            tooltip: 'Notifications',
                          ),
                          if (totalAlerts > 0)
                            Positioned(
                              top: 4,
                              right: 4,
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: Colors.red,
                                  shape: BoxShape.circle,
                                ),
                                child: Text(
                                  totalAlerts > 9 ? '9+' : totalAlerts.toString(),
                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(width: 4),

                      // Support Headset Button
                      IconButton(
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(),
                        icon: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: accentBlue.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.headset_mic_rounded, color: accentBlue, size: 20),
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const SupportChatScreen()),
                          ).then((_) {
                            _fetchUnreadSupportCount();
                            _fetchUnreadCount();
                          });
                        },
                        tooltip: 'Support Chat',
                      ),
                      const SizedBox(width: 4),

                      IconButton(
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(),
                        icon: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444)),
                        onPressed: _logout,
                        tooltip: 'Logout',
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Greeting & Location
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Flexible(
                    child: Row(
                      children: [
                        // Profile picture avatar — tapping it jumps straight
                        // to Settings, same as the bottom nav Settings tab.
                        GestureDetector(
                          onTap: _navigateToSettings,
                          child: Container(
                            width: 52,
                            height: 52,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                              boxShadow: [
                                BoxShadow(
                                  color: navyDeep.withOpacity(0.12),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: ClipOval(
                              child: (_profilePictureUrl != null && _profilePictureUrl!.isNotEmpty)
                                  ? Image.network(
                                _profilePictureUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => Container(
                                  color: accentBlue.withOpacity(0.1),
                                  child: const Icon(Icons.person_rounded, color: accentBlue),
                                ),
                              )
                                  : Container(
                                color: accentBlue.withOpacity(0.1),
                                child: const Icon(Icons.person_rounded, color: accentBlue),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Flexible(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                getGreeting(),
                                style: const TextStyle(fontSize: 16, color: textGrey, fontWeight: FontWeight.w500),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _userName,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 30,
                                  fontWeight: FontWeight.w800,
                                  color: navyDeep,
                                  letterSpacing: -0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: accentBlue.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          'CLIENT PORTAL',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: accentBlue),
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text('Colombo, LK', style: TextStyle(fontSize: 12, color: textGrey, fontWeight: FontWeight.w500)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Status Chips
              // FIX: each chip is now Flexible with ellipsis text so the row
              // shrinks to fit the screen instead of overflowing (was
              // causing the yellow/black banner near "Account Verified").
              Row(
                children: [
                  Flexible(
                    child: GestureDetector(
                      onTap: _navigateToGarage,
                      child: _buildStatusChip(
                        Icons.directions_car_outlined,
                        _isLoadingVehicles
                            ? 'Loading...'
                            : '$_vehicleCount Active ${_vehicleCount == 1 ? 'Vehicle' : 'Vehicles'}',
                        accentBlue,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Flexible(
                    child: _buildStatusChip(Icons.shield_outlined, 'Account Verified', accentEmerald),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Primary Action: Search & Link Vehicle Banner
              InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const SearchVehicleScreen()),
                  ).then((_) => _fetchVehicleCount());
                },
                borderRadius: BorderRadius.circular(24),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0A1930), Color(0xFF1E3A8A)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: navyDeep.withOpacity(0.25),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Link Your Vehicle',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 19,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.3,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Find your vehicle in the government registry',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.8),
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white.withOpacity(0.2)),
                        ),
                        child: const Icon(Icons.search_rounded, color: Colors.white, size: 28),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Workflow Alert Tile
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFFECACA)),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFEF4444).withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEE2E2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444), size: 24),
                    ),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Verification Status', style: TextStyle(color: Color(0xFF991B1B), fontWeight: FontWeight.bold, fontSize: 14)),
                          SizedBox(height: 2),
                          Text('1 report pending inspector validation', style: TextStyle(color: Color(0xFFB91C1C), fontSize: 12)),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: Color(0xFFEF4444)),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // Portal Tools Grid
              const Text(
                'V-Sense Portal',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: navyDeep, letterSpacing: 0.5),
              ),
              const SizedBox(height: 16),

              // UPDATED LAYOUT: uniform 2x2(x3) grid of 6 small tool cards.
              // "My Garage" is no longer a wide feature tile — it's now a
              // regular tool card, same size as the rest, and "Request
              // Checkup" joins it right after. Order: My Garage, Request
              // Checkup, Digital Certs, Partnered Garages, Support Chat,
              // Quick Guide.
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: 1.15,
                children: [
                  // My Garage
                  _buildToolCard(Icons.garage_outlined, 'My Garage', accentBlue, 0, _navigateToGarage),

                  // Request Checkup
                  _buildToolCard(Icons.event_available_outlined, 'Request Checkup', accentEmerald, 0, _navigateToRequestCheckup),

                  // Digital Certs Screen Link
                  _buildToolCard(Icons.workspace_premium_outlined, 'Digital Certs', accentGold, 0, () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const DigitalCertsScreen()),
                    );
                  }),

                  // Partnered Garages
                  _buildToolCard(
                    Icons.store_mall_directory_outlined,
                    'Partnered Garages',
                    accentEmerald,
                    0,
                        () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const PartneredGaragesScreen()),
                      );
                    },
                  ),

                  // Support Chat
                  _buildToolCard(Icons.headset_mic_outlined, 'Support Chat', accentBlue, _unreadSupportCount, () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const SupportChatScreen()),
                    ).then((_) {
                      _fetchUnreadSupportCount();
                      _fetchUnreadCount();
                    });
                  }),

                  _buildToolCard(Icons.info_outline_rounded, 'Quick Guide', accentGold, 0, () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ReportInfoScreen()),
                    );
                  }),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),

      // Bottom Navigation Bar
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: navyDeep.withOpacity(0.08),
              blurRadius: 24,
              offset: const Offset(0, -8),
            )
          ],
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) {
              if (index == 2) {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const QrScannerScreen()),
                );
              } else {
                setState(() => _currentIndex = index);
                if (index == 1) {
                  _navigateToGarage();
                }
                if (index == 3) {
                  _navigateToSettings();
                }
              }
            },
            backgroundColor: Colors.white,
            selectedItemColor: accentBlue,
            unselectedItemColor: textGrey.withOpacity(0.6),
            showUnselectedLabels: true,
            selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
            type: BottomNavigationBarType.fixed,
            elevation: 0,
            items: const [
              BottomNavigationBarItem(
                icon: Padding(padding: EdgeInsets.only(bottom: 4), child: Icon(Icons.home_filled)),
                label: 'Dashboard',
              ),
              BottomNavigationBarItem(
                icon: Padding(padding: EdgeInsets.only(bottom: 4), child: Icon(Icons.directions_car)),
                label: 'Garage',
              ),
              BottomNavigationBarItem(
                icon: Padding(padding: EdgeInsets.only(bottom: 4), child: Icon(Icons.qr_code_scanner)),
                label: 'Scan',
              ),
              // Replaced "Profile" with "Settings"
              BottomNavigationBarItem(
                icon: Padding(padding: EdgeInsets.only(bottom: 4), child: Icon(Icons.settings_outlined)),
                label: 'Settings',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(color: color.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2)),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color.withOpacity(0.9)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToolCard(IconData icon, String title, Color iconColor, int badgeCount, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0A1930).withOpacity(0.04),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: iconColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, size: 28, color: iconColor),
                ),
                const SizedBox(height: 12),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFF0A1930),
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),

            // Badge UI inside the ToolCard
            if (badgeCount > 0)
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: Text(
                    badgeCount > 99 ? '99+' : badgeCount.toString(),
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}