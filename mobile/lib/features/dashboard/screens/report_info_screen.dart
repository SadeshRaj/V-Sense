// lib/features/dashboard/screens/report_info_screen.dart
import 'package:flutter/material.dart';
import 'search_vehicle_screen.dart';
import 'digital_certs_screen.dart';
import '../../support/screens/support_chat_screen.dart';
import 'partnered_garages_screen.dart';

class ReportInfoScreen extends StatelessWidget {
  const ReportInfoScreen({super.key});

  static const Color navyDeep = Color(0xFF0A1930);
  static const Color accentGold = Color(0xFFD4AF37);
  static const Color accentBlue = Color(0xFF2563EB);
  static const Color accentEmerald = Color(0xFF10B981);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: navyDeep),
        title: const Text(
          'V-Sense Guide & Policies',
          style: TextStyle(color: navyDeep, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeroWithLogo(),
            const SizedBox(height: 32),

            // How to operate section
            const Text(
              'How to Operate V-Sense',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: navyDeep),
            ),
            const SizedBox(height: 6),
            const Text(
              'Follow these simple steps to manage your vehicles, generate reports, and verify certificates.',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            _buildStepCard(
              stepNumber: '1',
              title: 'Link Your Vehicle',
              description:
              'From the Dashboard, tap "Link Your Vehicle". Enter your vehicle registration number or VIN to automatically fetch official records from the national registry into "My Garage".',
              icon: Icons.directions_car_filled_outlined,
              color: accentBlue,
              actionLabel: 'Link Vehicle Now',
              onAction: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SearchVehicleScreen()),
                );
              },
            ),
            _buildStepCard(
              stepNumber: '2',
              title: 'Service at Partnered Garages',
              description:
              'Keep your vehicle history verified! Check the "Partnered Garages" directory to find authorized workshops that log authentic digital service receipts straight to your timeline.',
              icon: Icons.store_mall_directory_outlined,
              color: accentEmerald,
              actionLabel: 'Browse Garages',
              onAction: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const PartneredGaragesScreen()),
                );
              },
            ),
            _buildStepCard(
              stepNumber: '3',
              title: 'Request AI Audit & Digital Cert',
              description:
              'Go to "Digital Certs", select your vehicle, and request an AI audit. Our 4 specialized AI agents audit odometer rollbacks, police stolen/accident records, and repair descriptions.',
              icon: Icons.workspace_premium_outlined,
              color: accentGold,
              actionLabel: 'View Digital Certs',
              onAction: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const DigitalCertsScreen()),
                );
              },
            ),
            _buildStepCard(
              stepNumber: '4',
              title: 'Verification & Download PDF',
              description:
              'Once reviewed and certified, download your anti-tamper PDF report. Anyone can scan the printed QR code with their phone camera to verify the live cryptographic certificate online.',
              icon: Icons.qr_code_scanner_rounded,
              color: Colors.purple,
            ),
            _buildStepCard(
              stepNumber: '5',
              title: 'Contact Support & Dispute Data',
              description:
              'Have questions, need audit assistance, or want to dispute an incorrect garage entry? Tap "Support Chat" to connect directly with our technical support team.',
              icon: Icons.headset_mic_outlined,
              color: Colors.teal,
              actionLabel: 'Open Support Chat',
              onAction: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SupportChatScreen()),
                );
              },
            ),

            const SizedBox(height: 32),

            // What's included in a report
            const Text(
              'What\'s Included in an Audit?',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: navyDeep),
            ),
            const SizedBox(height: 16),
            _buildFeatureCard(
              Icons.local_police_outlined,
              'Police & Theft History',
              'Scans national crime and accident registries for active stolen reports, incident recovery flags, and police station notes.',
              Colors.red,
            ),
            _buildFeatureCard(
              Icons.speed_outlined,
              'Mileage Integrity Check',
              'Detects odometer rollbacks, cluster replacements, and same-day mileage spikes using deterministic chronometry.',
              accentBlue,
            ),
            _buildFeatureCard(
              Icons.shield_outlined,
              'Legal & Insurance Validation',
              'Snapshot status of active comprehensive insurance coverage, revenue license expiry, and ownership transfer counts.',
              accentEmerald,
            ),
            _buildFeatureCard(
              Icons.build_circle_outlined,
              'Maintenance & Collision Repairs',
              'Verified garage logs analyzing oil changes, structural replacements, and warning flags for suspicious placeholder entries.',
              Colors.orange,
            ),

            const SizedBox(height: 32),

            // Enterprise Policies & Legal
            const Text(
              'Platform Policies & Guarantees',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: navyDeep),
            ),
            const SizedBox(height: 16),
            _buildPolicyCard(
              'The V-Sense Accuracy Guarantee',
              'V-Sense operates on cryptographically backed data. If an official, registered police theft flag or total-loss salvage event was recorded in network registries prior to certificate generation and omitted by our audit, you are covered under our platform buyer-protection guarantee.',
            ),
            _buildPolicyCard(
              'Data Sourcing & Limitation Disclaimer',
              'V-Sense aggregates records from authorized partner garages, insurance partners, and police registries. V-Sense does not assume liability for undocumented, off-the-books repairs conducted outside verified networks. Reports are advisory and do not supersede a physical mechanical evaluation.',
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroWithLogo() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [navyDeep, Color(0xFF1E3A8A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: navyDeep.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Logo display with fallback
              Container(
                height: 60,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Image.asset(
                  'assets/logo_L2.png',
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return Image.asset(
                      'assets/logo_S.png',
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const Icon(
                        Icons.workspace_premium,
                        color: accentGold,
                        size: 36,
                      ),
                    );
                  },
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: accentGold.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: accentGold.withOpacity(0.5)),
                ),
                child: const Text(
                  'EST. 2026',
                  style: TextStyle(
                    color: accentGold,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Text(
            'Vehicle Authority & Verification Network',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Protecting Sri Lankan vehicle buyers and owners through multi-agent AI forensic audits, tamper-proof QR certificates, and verified maintenance logs.',
            style: TextStyle(
              fontSize: 13,
              color: Colors.white.withOpacity(0.85),
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepCard({
    required String stepNumber,
    required String title,
    required String description,
    required IconData icon,
    required Color color,
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: navyDeep.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  stepNumber,
                  style: TextStyle(fontWeight: FontWeight.w900, color: color, fontSize: 15),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: navyDeep),
                ),
              ),
              Icon(icon, color: color, size: 24),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            description,
            style: TextStyle(color: Colors.grey.shade700, fontSize: 13, height: 1.5),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: onAction,
                icon: Text(
                  actionLabel,
                  style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12),
                ),
                label: Icon(Icons.arrow_forward_rounded, color: color, size: 16),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  backgroundColor: color.withOpacity(0.08),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildFeatureCard(IconData icon, String title, String description, Color iconColor) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: navyDeep.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: iconColor, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: navyDeep),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 12.5, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPolicyCard(String title, String description) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: accentGold.withOpacity(0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accentGold.withOpacity(0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.gavel_rounded, color: accentGold, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: navyDeep),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            description,
            style: TextStyle(color: Colors.grey.shade800, fontSize: 12, height: 1.5),
          ),
        ],
      ),
    );
  }
}