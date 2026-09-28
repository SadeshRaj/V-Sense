import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../dashboard/screens/dashboard_screen.dart';
import '../../landing/screens/landing_screen.dart';

/// The very first screen the user sees on every app launch.
///
/// It paints a premium branded background immediately, then quietly runs
/// the JWT / biometric check logic. Because the background is visible the
/// moment the app starts, the system biometric dialog (fingerprint / Face ID)
/// always appears on top of a rich branded backdrop — never a blank screen.
class AuthGateScreen extends StatefulWidget {
  const AuthGateScreen({super.key});

  @override
  State<AuthGateScreen> createState() => _AuthGateScreenState();
}

class _AuthGateScreenState extends State<AuthGateScreen>
    with TickerProviderStateMixin {
  // ── Animation controllers ─────────────────────────────────────────────────
  late final AnimationController _fadeCtrl;
  late final AnimationController _pulseCtrl;
  late final AnimationController _ringCtrl;

  late final Animation<double> _fadeAnim;
  late final Animation<double> _pulseAnim;
  late final Animation<double> _ringAnim;

  String _statusText = '';
  bool _showBiometricHint = false;

  // ── Constants ─────────────────────────────────────────────────────────────
  static const _navyDeep  = Color(0xFF0A1930);
  static const _navyMid   = Color(0xFF0F2444);
  static const _accentBlue = Color(0xFF2563EB);
  static const _accentGlow = Color(0xFF3B82F6);

  @override
  void initState() {
    super.initState();

    // Fade-in controller (logo + text)
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnim = CurvedAnimation(parent: _fadeCtrl, curve: Curves.easeOut);

    // Pulse controller (fingerprint icon breathing)
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.92, end: 1.08).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );

    // Rotating ring controller
    _ringCtrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();
    _ringAnim = CurvedAnimation(parent: _ringCtrl, curve: Curves.linear);

    // Start fade-in, then run auth check
    _fadeCtrl.forward().then((_) => _runAuthCheck());
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    _pulseCtrl.dispose();
    _ringCtrl.dispose();
    super.dispose();
  }

  // ── Auth logic ─────────────────────────────────────────────────────────────

  Future<void> _runAuthCheck() async {
    try {
      const storage = FlutterSecureStorage();
      final savedToken = await storage.read(key: 'jwt_token');
      final savedEmail = await storage.read(key: 'saved_email');

      // No saved session → go to Landing
      if (savedToken == null || savedEmail == null) {
        await Future.delayed(const Duration(milliseconds: 600));
        _navigateTo(const LandingScreen());
        return;
      }

      final prefs = await SharedPreferences.getInstance();
      final biometricEnabled = prefs.getBool('biometric_enabled') ?? false;

      if (biometricEnabled) {
        // Show biometric hint in the UI before the system dialog appears
        if (mounted) {
          setState(() {
            _statusText = 'Verifying your identity…';
            _showBiometricHint = true;
          });
        }

        // Small pause so the user sees the hint text before the dialog
        await Future.delayed(const Duration(milliseconds: 300));

        bool authenticated = false;
        try {
          final localAuth = LocalAuthentication();
          final canCheck    = await localAuth.canCheckBiometrics;
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
            // Device lost capability — fall back to direct login
            authenticated = true;
          }
        } catch (_) {
          // Biometric failed unexpectedly — still let them in with the JWT
          authenticated = true;
        }

        if (!mounted) return;

        if (authenticated) {
          if (mounted) setState(() => _statusText = 'Welcome back!');
          await Future.delayed(const Duration(milliseconds: 400));
          _navigateTo(const DashboardScreen());
        } else {
          // User cancelled biometric → send to Landing/Login
          _navigateTo(const LandingScreen());
        }
      } else {
        // Save-login without biometrics → go straight to Dashboard
        if (mounted) setState(() => _statusText = 'Signing you in…');
        await Future.delayed(const Duration(milliseconds: 800));
        _navigateTo(const DashboardScreen());
      }
    } catch (_) {
      await Future.delayed(const Duration(milliseconds: 500));
      _navigateTo(const LandingScreen());
    }
  }

  void _navigateTo(Widget screen) {
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (_, a, b) => screen,
        transitionDuration: const Duration(milliseconds: 600),
        transitionsBuilder: (_, animation, b, child) {
          return FadeTransition(
            opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
            child: child,
          );
        },
      ),
    );
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: _navyDeep,
      body: Stack(
        children: [
          // ── Gradient background ──────────────────────────────────────────
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF0A1930),
                  Color(0xFF0F2444),
                  Color(0xFF0A1930),
                ],
                stops: [0.0, 0.5, 1.0],
              ),
            ),
          ),

          // ── Decorative glowing circles ───────────────────────────────────
          Positioned(
            top: -size.height * 0.12,
            right: -size.width * 0.2,
            child: _GlowCircle(size: size.width * 0.75, color: _accentBlue.withValues(alpha: 0.08)),
          ),
          Positioned(
            bottom: -size.height * 0.1,
            left: -size.width * 0.2,
            child: _GlowCircle(size: size.width * 0.65, color: _accentBlue.withValues(alpha: 0.06)),
          ),
          Positioned(
            top: size.height * 0.4,
            left: size.width * 0.1,
            child: _GlowCircle(size: size.width * 0.2, color: _accentGlow.withValues(alpha: 0.04)),
          ),

          // ── Grid / mesh pattern overlay ──────────────────────────────────
          CustomPaint(
            size: Size(size.width, size.height),
            painter: _GridPainter(),
          ),

          // ── Main content ─────────────────────────────────────────────────
          FadeTransition(
            opacity: _fadeAnim,
            child: SafeArea(
              child: Column(
                children: [
                  // Top spacer
                  SizedBox(height: size.height * 0.10),

                  // Logo
                  Image.asset(
                    'assets/logo_S.png',
                    height: 72,
                    errorBuilder: (context2, err, stack) => const Icon(
                      Icons.verified_user_rounded,
                      size: 72,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // App name
                  const Text(
                    'V-SENSE',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: 6,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'PREMIUM',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: _accentGlow.withValues(alpha: 0.85),
                      letterSpacing: 4,
                    ),
                  ),

                  const Spacer(),

                  // ── Biometric animation widget ───────────────────────────
                  SizedBox(
                    width: 160,
                    height: 160,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Rotating dashed ring
                        AnimatedBuilder(
                          animation: _ringAnim,
                          builder: (ctx, child) => Transform.rotate(
                            angle: _ringAnim.value * 2 * math.pi,
                            child: CustomPaint(
                              size: const Size(150, 150),
                              painter: _DashedRingPainter(
                                color: _accentBlue.withValues(alpha: 0.35),
                                strokeWidth: 1.5,
                                dashCount: 24,
                              ),
                            ),
                          ),
                        ),
                        // Slower counter-rotating ring
                        AnimatedBuilder(
                          animation: _ringAnim,
                          builder: (ctx, child) => Transform.rotate(
                            angle: -_ringAnim.value * 2 * math.pi * 0.6,
                            child: CustomPaint(
                              size: const Size(120, 120),
                              painter: _DashedRingPainter(
                                color: _accentGlow.withValues(alpha: 0.2),
                                strokeWidth: 1.0,
                                dashCount: 16,
                              ),
                            ),
                          ),
                        ),
                        // Glowing solid ring
                        Container(
                          width: 96,
                          height: 96,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _navyMid,
                            border: Border.all(
                              color: _accentBlue.withValues(alpha: 0.5),
                              width: 1.5,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: _accentBlue.withValues(alpha: 0.25),
                                blurRadius: 28,
                                spreadRadius: 4,
                              ),
                            ],
                          ),
                        ),
                        // Pulsing fingerprint icon
                        ScaleTransition(
                          scale: _pulseAnim,
                          child: Icon(
                            _showBiometricHint
                                ? Icons.fingerprint_rounded
                                : Icons.lock_open_rounded,
                            size: 52,
                            color: Colors.white.withValues(alpha: 0.92),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 32),

                  // Status text
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 400),
                    child: _statusText.isEmpty
                        ? const SizedBox(height: 22, key: ValueKey('empty'))
                        : Text(
                            _statusText,
                            key: ValueKey(_statusText),
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.white.withValues(alpha: 0.75),
                              letterSpacing: 0.4,
                            ),
                          ),
                  ),

                  const SizedBox(height: 12),

                  // Animated dots loader
                  _AnimatedDots(),

                  const Spacer(),

                  // Bottom tagline
                  Padding(
                    padding: const EdgeInsets.only(bottom: 40),
                    child: Text(
                      '© 2026 V-Sense  ·  All Rights Reserved',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.white.withValues(alpha: 0.25),
                        letterSpacing: 0.3,
                      ),
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper widgets & painters
// ─────────────────────────────────────────────────────────────────────────────

class _GlowCircle extends StatelessWidget {
  final double size;
  final Color color;
  const _GlowCircle({required this.size, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(shape: BoxShape.circle, color: color),
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF2563EB).withValues(alpha: 0.04)
      ..strokeWidth = 0.5;

    const step = 40.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(_GridPainter old) => false;
}

class _DashedRingPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;
  final int dashCount;

  const _DashedRingPainter({
    required this.color,
    required this.strokeWidth,
    required this.dashCount,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final radius = size.width / 2;
    final center = Offset(size.width / 2, size.height / 2);
    final dashAngle = (2 * math.pi) / dashCount;
    final gapFraction = 0.45; // fraction of each slot that is a gap

    for (int i = 0; i < dashCount; i++) {
      final startAngle = i * dashAngle;
      final sweepAngle = dashAngle * (1 - gapFraction);
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        false,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_DashedRingPainter old) =>
      old.color != color || old.strokeWidth != strokeWidth;
}

/// Three dots that fade in/out in sequence.
class _AnimatedDots extends StatefulWidget {
  @override
  State<_AnimatedDots> createState() => _AnimatedDotsState();
}

class _AnimatedDotsState extends State<_AnimatedDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            // Each dot's peak opacity is staggered by 1/3 of the cycle
            final t = (_ctrl.value - i / 3.0) % 1.0;
            final opacity = (math.sin(t * math.pi).clamp(0.0, 1.0) * 0.8) + 0.15;
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: opacity),
              ),
            );
          }),
        );
      },
    );
  }
}
