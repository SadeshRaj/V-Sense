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

  // Determine the initial screen based on saved credentials + biometric preference
  Widget initialScreen = const LandingScreen();

  try {
    final prefs = await SharedPreferences.getInstance();
    final biometricEnabled = prefs.getBool('biometric_enabled') ?? false;

    if (biometricEnabled) {
      const storage = FlutterSecureStorage();
      final savedToken = await storage.read(key: 'jwt_token');
      final savedEmail = await storage.read(key: 'saved_email');

      // Only attempt biometric auto-login if we have both a JWT token and saved email
      if (savedToken != null && savedEmail != null) {
        final localAuth = LocalAuthentication();
        final canCheckBiometrics = await localAuth.canCheckBiometrics;
        final isDeviceSupported = await localAuth.isDeviceSupported();

        if (canCheckBiometrics && isDeviceSupported) {
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
        }
      }
    }
  } catch (_) {
    // If anything fails, fall back to the Landing screen gracefully
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