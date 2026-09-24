import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/config/env_config.dart';
import 'search_vehicle_screen.dart';
import 'my_garage_screen.dart';
import '../../auth/screens/login_screen.dart';
import '../../support/screens/support_chat_screen.dart';
import '../../notifications/screens/notifications_screen.dart';
import '../../notifications/services/notification_service.dart';
import 'digital_certs_screen.dart';
import 'qr_scanner_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _userName = '';
  int _vehicleCount = 0;
  bool _isLoadingVehicles = true;
  final _storage = const FlutterSecureStorage();
  int _currentIndex = 0;

  // Notification state
  int _unreadNotificationsCount = 0;
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
  }

  Future<void> _fetchUnreadCount() async {
    final count = await _notificationService.getUnreadCount();
    if (mounted) {
      setState(() {
        _unreadNotificationsCount = count;
      });
    }
  }

  Future<void> _loadUserData() async {
    final name = await _storage.read(key: 'user_name');
    if (mounted) {
      setState(() => _userName = name ?? 'Client');
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

  @override
  Widget build(BuildContext context) {
    const Color backgroundLight = Color(0xFFF8FAFC);
    const Color navyDeep = Color(0xFF0A1930);
    const Color accentBlue = Color(0xFF2563EB);
    const Color accentGold = Color(0xFFD4AF37);
    const Color textGrey = Color(0xFF64748B);

    return Scaffold(
      backgroundColor: backgroundLight,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Image.asset(
                    'assets/logo_S.png',
                    height: 40,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) {
                      return Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
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
                          const Text(
                            'V-SENSE',
                            style: TextStyle(
                              color: navyDeep,
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 2.5,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                  Row(
                    children: [
                      // Notifications Bell Icon
                      Stack(
                        alignment: Alignment.topRight,
                        children: [
                          IconButton(
                            icon: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: const Icon(Icons.notifications_outlined, color: navyDeep, size: 20),
                            ),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                              ).then((_) => _fetchUnreadCount());
                            },
                            tooltip: 'Notifications',
                          ),
                          if (_unreadNotificationsCount > 0)
                            Positioned(
                              top: 6,
                              right: 6,
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: Color(0xFFEF4444),
                                  shape: BoxShape.circle,
                                ),
                                child: Text(
                                  _unreadNotificationsCount > 9 ? '9+' : _unreadNotificationsCount.toString(),
                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ),
                        ],
                      ),
                      // Customer Support Headset Icon
                      IconButton(
                        icon: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: const Icon(Icons.headset_mic_rounded, color: accentBlue, size: 20),
                        ),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const SupportChatScreen()),
                          );
                        },
                        tooltip: 'Support Chat',
                      ),
                      IconButton(
                        icon: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444)),
                        onPressed: _logout,
                        tooltip: 'Logout',
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Greeting & Location
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        getGreeting(),
                        style: const TextStyle(fontSize: 14, color: textGrey, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _userName,
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          color: navyDeep,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: accentBlue.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: accentBlue.withOpacity(0.2)),
                        ),
                        child: const Text(
                          'CLIENT PORTAL',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: accentBlue, letterSpacing: 0.5),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: const [
                          Icon(Icons.location_on_outlined, size: 14, color: textGrey),
                          SizedBox(width: 2),
                          Text('Colombo, LK', style: TextStyle(fontSize: 12, color: textGrey, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Status Chips
              Row(
                children: [
                  GestureDetector(
                    onTap: _navigateToGarage,
                    child: _buildStatusChip(
                      Icons.directions_car_outlined,
                      _isLoadingVehicles
                          ? 'Loading...'
                          : '$_vehicleCount Active ${_vehicleCount == 1 ? 'Vehicle' : 'Vehicles'}',
                      accentBlue,
                    ),
                  ),
                  const SizedBox(width: 10),
                  _buildStatusChip(Icons.verified_user_outlined, 'Account Verified', const Color(0xFF10B981)),
                ],
              ),
              const SizedBox(height: 20),

              // Primary Action: Search & Link Vehicle Banner
              InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const SearchVehicleScreen()),
                  ).then((_) => _fetchVehicleCount());
                },
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0A1930), Color(0xFF1E3A8A)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: navyDeep.withOpacity(0.2),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
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
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.3,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Find your vehicle in the official state registry',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.8),
                                fontSize: 12,
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
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white.withOpacity(0.2)),
                        ),
                        child: const Icon(Icons.search_rounded, color: Colors.white, size: 26),
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
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFFECACA)),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFEF4444).withOpacity(0.04),
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
                      child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444), size: 22),
                    ),
                    const SizedBox(width: 14),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Verification Status', style: TextStyle(color: Color(0xFF991B1B), fontWeight: FontWeight.bold, fontSize: 13)),
                          SizedBox(height: 2),
                          Text('1 report pending inspector validation', style: TextStyle(color: Color(0xFFB91C1C), fontSize: 12)),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: Color(0xFFEF4444), size: 22),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Portal Tools Grid Header
              const Text(
                'V-Sense Portal Tools',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: navyDeep, letterSpacing: -0.2),
              ),
              const SizedBox(height: 14),

              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 14,
                crossAxisSpacing: 14,
                childAspectRatio: 1.15,
                children: [
                  _buildToolCard(
                    Icons.garage_outlined,
                    'My Garage',
                    'Manage active vehicles',
                    accentBlue,
                    _navigateToGarage,
                  ),

                  _buildToolCard(
                    Icons.workspace_premium_outlined,
                    'Digital Certs',
                    'Verified inspection passes',
                    accentGold,
                        () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const DigitalCertsScreen()),
                      );
                    },
                  ),

                  _buildToolCard(
                    Icons.store_mall_directory_outlined,
                    'Service Centers',
                    'Locate partnered garages',
                    const Color(0xFF10B981),
                        () {},
                  ),

                  _buildToolCard(
                    Icons.headset_mic_outlined,
                    'Support Chat',
                    '24/7 AI & agent help',
                    accentBlue,
                        () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const SupportChatScreen()),
                      );
                    },
                  ),

                  _buildToolCard(
                    Icons.payments_outlined,
                    'Buy Report',
                    'Official vehicle valuation',
                    accentGold,
                        () {},
                  ),

                  _buildToolCard(
                    Icons.settings_outlined,
                    'Settings',
                    'Account & preferences',
                    textGrey,
                        () {},
                  ),
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
              color: navyDeep.withOpacity(0.06),
              blurRadius: 20,
              offset: const Offset(0, -6),
            )
          ],
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
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
              }
            },
            backgroundColor: Colors.white,
            selectedItemColor: accentBlue,
            unselectedItemColor: textGrey.withOpacity(0.6),
            showUnselectedLabels: true,
            selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
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
              BottomNavigationBarItem(
                icon: Padding(padding: EdgeInsets.only(bottom: 4), child: Icon(Icons.person_outline)),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.25)),
        boxShadow: [
          BoxShadow(color: color.withOpacity(0.04), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildToolCard(
      IconData icon, String title, String subtitle, Color iconColor, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0A1930).withOpacity(0.03),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 24, color: iconColor),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Color(0xFF0A1930),
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    letterSpacing: -0.1,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}