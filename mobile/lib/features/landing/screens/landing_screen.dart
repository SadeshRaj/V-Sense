import 'dart:ui';
import 'package:flutter/material.dart';
import '../../auth/screens/login_screen.dart';
import '../../auth/screens/register_screen.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const Color pureWhite = Colors.white;
    const Color backgroundLight = Color(0xFFF8FAFC);
    const Color navyDeep = Color(0xFF0A1930);
    const Color textGrey = Color(0xFF4A5568);
    const Color accentBlue = Color(0xFF2563EB);

    return Scaffold(
      backgroundColor: backgroundLight,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. High-Key Premium Automotive Hero (Bright Studio Car)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: MediaQuery.of(context).size.height * 0.65,
            child: Image.network(
              'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&q=80&w=1200',
              fit: BoxFit.cover,
              alignment: Alignment.center,
              errorBuilder: (context, error, stackTrace) => Container(
                color: const Color(0xFFE2E8F0),
                child: const Center(
                  child: Icon(Icons.directions_car_outlined, size: 80, color: Color(0xFF94A3B8)),
                ),
              ),
            ),
          ),

          // 2. Smooth White Gradient Fade
          // This blends the bottom of the photo seamlessly into the white background
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: MediaQuery.of(context).size.height * 0.65,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    backgroundLight.withOpacity(0.0),
                    backgroundLight.withOpacity(0.7),
                    backgroundLight,
                  ],
                  stops: const [0.0, 0.6, 1.0],
                ),
              ),
            ),
          ),

          // 3. Foreground Interface
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Brand Bar & Live Status Tag
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: pureWhite,
                              borderRadius: BorderRadius.circular(10),
                              boxShadow: [
                                BoxShadow(color: navyDeep.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 2)),
                              ],
                            ),
                            child: const Icon(Icons.verified_outlined, size: 18, color: accentBlue),
                          ),
                          const SizedBox(width: 10),
                          const Text(
                            'V-SENSE',
                            style: TextStyle(
                              color: navyDeep,
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 2.5,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFD1FAE5)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: Color(0xFF10B981),
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Text(
                              'AI REGISTRY ACTIVE',
                              style: TextStyle(
                                color: Color(0xFF059669),
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.0,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const Spacer(),

                  // Value Badges
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildChip('DMT Verified Records', Icons.assured_workload_outlined),
                      _buildChip('Agentic Fraud Detection', Icons.auto_awesome),
                      _buildChip('Digital Certificates', Icons.workspace_premium_outlined),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Hero Headlines
                  const Text(
                    'The Vehicle\nAuthority.',
                    style: TextStyle(
                      color: navyDeep,
                      fontSize: 38,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.5,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Sri Lanka’s central platform for multi-agent verified histories, accident detection, and valuation certs.',
                    style: TextStyle(
                      color: textGrey,
                      fontSize: 14,
                      height: 1.5,
                      letterSpacing: 0.2,
                      fontWeight: FontWeight.w500,
                    ),
                  ),

                  const SizedBox(height: 28),

                  // 4. Clean Frosted Glass Interaction Pod
                  ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: pureWhite.withOpacity(0.7),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: pureWhite, width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: navyDeep.withOpacity(0.04),
                              blurRadius: 24,
                              offset: const Offset(0, 8),
                            )
                          ],
                        ),
                        child: Column(
                          children: [
                            // Sign In Button
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: () {
                                  Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: navyDeep,
                                  foregroundColor: pureWhite,
                                  elevation: 4,
                                  shadowColor: navyDeep.withOpacity(0.3),
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                child: const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text('ACCESS PORTAL', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: 1.2, fontSize: 14)),
                                    SizedBox(width: 8),
                                    Icon(Icons.arrow_forward, size: 16),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Register Button
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton(
                                onPressed: () {
                                  Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen()));
                                },
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: navyDeep,
                                  backgroundColor: pureWhite.withOpacity(0.5),
                                  side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                child: const Text('CREATE ACCOUNT', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2, fontSize: 14)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Trust & Integration Footer
                  Center(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.lock_outline, size: 12, color: Color(0xFF94A3B8)),
                        const SizedBox(width: 6),
                        const Text(
                          'PAYHERE SECURED • 256-BIT ENCRYPTION • © 2026 V-SENSE',
                          style: TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Helper widget for the feature pills
  static Widget _buildChip(String label, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: const Color(0xFF0A1930).withOpacity(0.03), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: const Color(0xFF2563EB)),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF4A5568),
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }
}