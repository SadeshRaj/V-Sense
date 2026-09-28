import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/theme/app_theme.dart';
import 'features/landing/screens/landing_screen.dart';
import 'features/dashboard/screens/dashboard_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");

  Widget initialScreen = const LandingScreen();

  try {
    const storage = FlutterSecureStorage();
    final savedToken = await storage.read(key: 'jwt_token');
    final savedEmail = await storage.read(key: 'saved_email');

    // Only attempt auto-login if the user checked "Save my login"
    // (both a JWT token AND a saved email must exist)
    if (savedToken != null && savedEmail != null) {
      final prefs = await SharedPreferences.getInstance();
      final biometricEnabled = prefs.getBool('biometric_enabled') ?? false;

      if (biometricEnabled) {
        // ── Biometric path ────────────────────────────────────────────────
        // Challenge the user with Face ID / fingerprint before going in.
        try {
          final localAuth = LocalAuthentication();
          final canCheck = await localAuth.canCheckBiometrics;
          final isSupported = await localAuth.isDeviceSupported();

          if (canCheck && isSupported) {
            final authenticated = await localAuth.authenticate(
              localizedReason: 'Use biometrics to sign in to V-Sense',
              options: const AuthenticationOptions(
                stickyAuth: true,
                biometricOnly: false,
              ),
            );
            if (authenticated) {
              initialScreen = const DashboardScreen();
            }
            // If authentication failed / cancelled → stay on Landing screen
          } else {
            // Device lost biometric capability — fall through to direct login
            initialScreen = const DashboardScreen();
          }
        } catch (_) {
          // Biometric challenge threw — go to Dashboard anyway because we
          // still have a valid JWT; the user already proved identity at some
          // point.
          initialScreen = const DashboardScreen();
        }
      } else {
        // ── Save-login (no biometric) path ────────────────────────────────
        // The user checked "Save my login" but did NOT enable biometrics.
        // Skip both Landing and Login screens and go straight to the Dashboard.
        initialScreen = const DashboardScreen();
      }
    }
  } catch (_) {
    // Any unexpected error → fall back to Landing screen gracefully.
  }

  runApp(VSenseApp(initialScreen: initialScreen));
}

class VSenseApp extends StatelessWidget {
  final Widget initialScreen;
  const VSenseApp({super.key, required this.initialScreen});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'V-Sense Premium',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: initialScreen,
    );
  }
}