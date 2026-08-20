import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../auth/screens/login_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _userName = '';
  final _storage = const FlutterSecureStorage();
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    final name = await _storage.read(key: 'user_name');
    setState(() => _userName = name ?? 'Sadesh');
  }

  Future<void> _logout() async {
    await _storage.delete(key: 'jwt_token');
    if (mounted) {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
    }
  }

  // Helper to determine greeting based on time of day
  String getGreeting() {
    var hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  }

  @override
  Widget build(BuildContext context) {
    const Color backgroundLight = Color(0xFFF8FAFC);
    const Color navyDeep = Color(0xFF0A1930);
    const Color accentBlue = Color(0xFF2563EB);
    const Color accentGold = Color(0xFFD4AF37); // Added premium gold accent for certificates/payments
    const Color textGrey = Color(0xFF64748B);

    return Scaffold(
      backgroundColor: backgroundLight,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Header (Logo & Logout)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [
                            BoxShadow(color: navyDeep.withOpacity(0.06), blurRadius: 12, offset: const Offset(0, 4)),
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
                  ),
                  IconButton(
                    icon: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444)),
                    onPressed: _logout,
                    tooltip: 'Logout',
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // 2. Greeting & Date
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(getGreeting(), style: const TextStyle(fontSize: 16, color: textGrey, fontWeight: FontWeight.w500)),
                      const SizedBox(height: 4),
                      Text(_userName, style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: navyDeep, letterSpacing: -0.5)),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        "${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')}",
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: navyDeep),
                      ),
                      const Text('Colombo, LK', style: TextStyle(fontSize: 13, color: textGrey, fontWeight: FontWeight.w500)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Status Chips
              Row(
                children: [
                  _buildStatusChip(Icons.directions_car_outlined, '1 Active Vehicle', accentBlue),
                  const SizedBox(width: 12),
                  _buildStatusChip(Icons.shield_outlined, 'System: Secure', const Color(0xFF10B981)),
                ],
              ),
              const SizedBox(height: 28),

              // 3. Hero Image Banner (Premium Look)
              Container(
                height: 170,
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  image: const DecorationImage(
                    image: NetworkImage('https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&q=80&w=1000'),
                    fit: BoxFit.cover,
                  ),
                  boxShadow: [
                    BoxShadow(color: navyDeep.withOpacity(0.15), blurRadius: 20, offset: const Offset(0, 10)),
                  ],
                ),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, navyDeep.withOpacity(0.85)],
                    ),
                  ),
                  padding: const EdgeInsets.all(20),
                  alignment: Alignment.bottomLeft,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.white.withOpacity(0.3)),
                        ),
                        child: const Icon(Icons.sync, color: Colors.white, size: 16),
                      ),
                      const SizedBox(width: 10),
                      const Text('Database Synced: Just now', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // 4. Primary Action Button (Field Inspector / QR Scanner)
              InkWell(
                onTap: () {
                  // Navigate to QR Scanner Feature (Student 3 Component)
                },
                borderRadius: BorderRadius.circular(24),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [accentBlue, Color(0xFF1D4ED8)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(color: accentBlue.withOpacity(0.4), blurRadius: 20, offset: const Offset(0, 8)),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Field Inspection', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                          const SizedBox(height: 6),
                          Text('Scan VIN/QR to upload mileage', style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 14, fontWeight: FontWeight.w500)),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.2)),
                        ),
                        child: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 36),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // 5. Alert / Notification Tile (Real-time Workflow Update)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFFECACA)),
                  boxShadow: [
                    BoxShadow(color: const Color(0xFFEF4444).withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: const Color(0xFFFEE2E2), borderRadius: BorderRadius.circular(12)),
                      child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444), size: 24),
                    ),
                    const SizedBox(width: 16),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Vehicle Flagged by AI', style: TextStyle(color: Color(0xFF991B1B), fontWeight: FontWeight.bold, fontSize: 14)),
                          SizedBox(height: 2),
                          Text('Status: Pending Senior Review', style: TextStyle(color: Color(0xFFB91C1C), fontSize: 12)),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: Color(0xFFEF4444)),
                  ],
                ),
              ),
              const SizedBox(height: 36),

              // 6. Portal Tools Grid (Aligned with V-Sense architecture)
              const Text('V-Sense Portal', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: navyDeep, letterSpacing: 0.5)),
              const SizedBox(height: 20),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: 1.15,
                children: [
                  _buildToolCard(Icons.workspace_premium_outlined, 'Digital Certs', accentGold), // Premium certs
                  _buildToolCard(Icons.timeline_outlined, 'History Timeline', accentBlue),       // Student 2: Timeline view
                  _buildToolCard(Icons.add_a_photo_outlined, 'Self-Report', accentBlue),         // Student 3: Owner receipt upload
                  _buildToolCard(Icons.payments_outlined, 'Buy Report', accentGold),             // Student 1: PayHere Sandbox
                  _buildToolCard(Icons.garage_outlined, 'My Vehicles', accentBlue),
                  _buildToolCard(Icons.settings_outlined, 'Settings', textGrey),
                ],
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),

      // 7. Bottom Navigation Bar (Floating Premium Style)
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: navyDeep.withOpacity(0.08), blurRadius: 24, offset: const Offset(0, -8))],
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          child: BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) => setState(() => _currentIndex = index),
            backgroundColor: Colors.white,
            selectedItemColor: accentBlue,
            unselectedItemColor: textGrey.withOpacity(0.6),
            showUnselectedLabels: true,
            selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
            type: BottomNavigationBarType.fixed,
            elevation: 0,
            items: const [
              BottomNavigationBarItem(icon: Padding(padding: EdgeInsets.only(bottom: 4), child: Icon(Icons.home_filled)), label: 'Dashboard'),
              BottomNavigationBarItem(icon: Padding(padding: EdgeInsets.only(bottom: 4), child: Icon(Icons.qr_code_scanner)), label: 'Scan'),
              BottomNavigationBarItem(icon: Padding(padding: EdgeInsets.only(bottom: 4), child: Icon(Icons.notifications_outlined)), label: 'Alerts'),
              BottomNavigationBarItem(icon: Padding(padding: EdgeInsets.only(bottom: 4), child: Icon(Icons.person_outline)), label: 'Profile'),
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
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: color.withOpacity(0.9))),
        ],
      ),
    );
  }

  Widget _buildToolCard(IconData icon, String title, Color iconColor) {
    return InkWell(
      onTap: () {}, // Add navigation mapping here
      borderRadius: BorderRadius.circular(20),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5),
          boxShadow: [
            BoxShadow(color: const Color(0xFF0A1930).withOpacity(0.04), blurRadius: 16, offset: const Offset(0, 6)),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(icon, size: 30, color: iconColor),
            ),
            const SizedBox(height: 14),
            Text(
              title,
              style: const TextStyle(
                color: Color(0xFF0A1930),
                fontWeight: FontWeight.w800,
                fontSize: 14,
                letterSpacing: 0.3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}