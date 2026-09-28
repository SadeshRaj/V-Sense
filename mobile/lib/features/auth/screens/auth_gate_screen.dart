import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../dashboard/screens/dashboard_screen.dart';
import '../../landing/screens/landing_screen.dart';

/// Clean, professional auth gate matching the light V-SENSE dashboard theme.
class AuthGateScreen extends StatefulWidget {
  const AuthGateScreen({super.key});

  @override
  State createState() => _AuthGateScreenState();
}

class _AuthGateScreenState extends State {
  String _statusText = 'Initializing…';
  bool _showBiometricIcon = false;

  // ── Brand Color Palette ────────────────────────────────────────────────────
  static const _bgLight       = Color(0xFFF8FAFC);
  static const _textNavy      = Color(0xFF0F172A);
  static const _textSecondary = Color(0xFF64748B);
  static const _brandPrimary  = Color(0xFF2563EB);
  static const _cardBg        = Color(0xFFFFFFFF);
  static const _borderColor   = Color(0xFFE2E8F0);

  @override
  void initState() {
    super.initState();
    _runAuthCheck();
  }

  // ── Auth logic ─────────────────────────────────────────────────────────────

  Future _runAuthCheck() async {
    try {
      const storage = FlutterSecureStorage();
      final savedToken = await storage.read(key: 'jwt_token');
      final savedEmail = await storage.read(key: 'saved_email');

      // No saved session → go to Landing
      if (savedToken == null || savedEmail == null) {
        await Future.delayed(const Duration(milliseconds: 300));
        _navigateTo(const LandingScreen());
        return;
      }

      final prefs = await SharedPreferences.getInstance();
      final biometricEnabled = prefs.getBool('biometric_enabled') ?? false;

      if (biometricEnabled) {
        if (mounted) {
          setState(() {
            _statusText = 'Verifying identity…';
            _showBiometricIcon = true;
          });
        }

        bool authenticated = false;
        try {
          final localAuth = LocalAuthentication();
          final canCheck = await localAuth.canCheckBiometrics;
          final isSupported = await localAuth.isDeviceSupported();

          if (canCheck && isSupported) {
            authenticated = await localAuth.authenticate(
              localizedReason: 'Use biometrics to sign in to V-Sense',
              options: const AuthenticationOptions(
                stickyAuth: true,
                biometricOnly: false,
              ),
            );
          } else {
            authenticated = true;
          }
        } catch (_) {
          authenticated = true;
        }

        if (!mounted) return;

        if (authenticated) {
          setState(() => _statusText = 'Welcome back');
          await Future.delayed(const Duration(milliseconds: 200));
          _navigateTo(const DashboardScreen());
        } else {
          _navigateTo(const LandingScreen());
        }
      } else {
        if (mounted) setState(() => _statusText = 'Signing in…');
        await Future.delayed(const Duration(milliseconds: 400));
        _navigateTo(const DashboardScreen());
      }
    } catch (_) {
      await Future.delayed(const Duration(milliseconds: 300));
      _navigateTo(const LandingScreen());
    }
  }

  void _navigateTo(Widget screen) {
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (_, a, b) => screen,
        transitionDuration: const Duration(milliseconds: 300),
        transitionsBuilder: (_, animation, b, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgLight,
      body: SafeArea(
        child: Column(
          children: [
            const Spacer(flex: 2),

            // Logo & Header Branding
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  'assets/logo_S.png',
                  height: 38,
                  errorBuilder: (context, err, stack) => const Icon(
                    Icons.shield_rounded,
                    size: 38,
                    color: _brandPrimary,
                  ),
                ),
                const SizedBox(width: 10),
                RichText(
                  text: const TextSpan(
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                    ),
                    children: [
                      TextSpan(
                        text: 'V',
                        style: TextStyle(color: Color(0xFF10B981)), // Teal accent
                      ),
                      TextSpan(
                        text: 'SENSE',
                        style: TextStyle(color: _textNavy),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 48),

            // Static Biometric / Key Card Container
            Container(
              width: 110,
              height: 110,
              decoration: BoxDecoration(
                color: _cardBg,
                shape: BoxShape.circle,
                border: Border.all(color: _borderColor, width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Center(
                child: Icon(
                  _showBiometricIcon
                      ? Icons.fingerprint_rounded
                      : Icons.lock_outline_rounded,
                  size: 48,
                  color: _brandPrimary,
                ),
              ),
            ),

            const SizedBox(height: 28),

            // Status Text
            Text(
              _statusText,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: _textNavy,
                letterSpacing: 0.2,
              ),
            ),

            const SizedBox(height: 8),

            const Text(
              'Secure Verification System',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: _textSecondary,
              ),
            ),

            const Spacer(flex: 3),

            // Subtle Footer
            const Padding(
              padding: EdgeInsets.only(bottom: 24),
              child: Text(
                '© 2026 V-Sense · All Rights Reserved',
                style: TextStyle(
                  fontSize: 11,
                  color: _textSecondary,
                  letterSpacing: 0.3,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}