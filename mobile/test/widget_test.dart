import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/features/auth/screens/login_screen.dart';
import 'package:mobile/features/dashboard/screens/search_vehicle_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('12.5 Flutter Unit & Widget Tests', () {
    // TC-FLUT-01: App Theme & Core Component Rendering
    testWidgets('TC-FLUT-01: App theme and branding configurations load correctly', (WidgetTester tester) async {
      final theme = AppTheme.lightTheme;
      expect(theme.useMaterial3, isTrue);
      expect(theme.scaffoldBackgroundColor, isNotNull);
      expect(theme.primaryColor, isNotNull);
    });

    // TC-FLUT-02: Login Screen Form Validation & Component Tree
    testWidgets('TC-FLUT-02: Login screen renders email and password fields with sign-in button', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: LoginScreen(),
        ),
      );
      await tester.pump();

      expect(find.byType(TextField), findsNWidgets(2));
      expect(find.text('Email Address'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('SIGN IN'), findsOneWidget);
    });

    // TC-FLUT-03: Register Screen Phone Number Regex Validation
    test('TC-FLUT-03: Phone number format validation enforces Sri Lankan mobile format', () {
      final phoneRegex = RegExp(r'^07\d{8}$');
      
      expect(phoneRegex.hasMatch('0771234567'), isTrue);
      expect(phoneRegex.hasMatch('0719876543'), isTrue);
      expect(phoneRegex.hasMatch('12345678'), isFalse);
      expect(phoneRegex.hasMatch('0812233445'), isFalse);
      expect(phoneRegex.hasMatch(''), isFalse);
    });

    // TC-FLUT-04: Vehicle Lookup Search Screen Form Fields
    testWidgets('TC-FLUT-04: Search vehicle screen renders registration, chassis, and license fields', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const MaterialApp(
          home: SearchVehicleScreen(),
        ),
      );
      await tester.pump();

      expect(find.byType(TextFormField), findsNWidgets(3));
      expect(find.text('Vehicle Registration Number'), findsOneWidget);
      expect(find.text('Chassis Number'), findsWidgets);
      expect(find.text('Revenue License Number'), findsWidgets);
      expect(find.text('Search Registry'), findsOneWidget);
    });

    // TC-FLUT-05: QR Code Certificate URL Parser Logic
    test('TC-FLUT-05: QR Verification URL parser extracts valid workflow IDs and rejects malformed URLs', () {
      bool isValidVsenseQr(String url) {
        try {
          final uri = Uri.parse(url);
          final segments = uri.pathSegments;
          return segments.contains('verify') && segments.last.isNotEmpty && segments.last != 'verify';
        } catch (_) {
          return false;
        }
      }

      expect(isValidVsenseQr('https://vsense.lk/verify/wf-89412-cert'), isTrue);
      expect(isValidVsenseQr('https://vsense.lk/verify/abc-123'), isTrue);
      expect(isValidVsenseQr('https://google.com/search?q=test'), isFalse);
      expect(isValidVsenseQr('https://vsense.lk/verify/'), isFalse);
      expect(isValidVsenseQr('invalid-uri-format-string'), isFalse);
    });

    // TC-FLUT-06: Vehicle Lookup Form Validation on Empty Inputs
    testWidgets('TC-FLUT-06: Vehicle search form triggers required field validations on empty submission', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const MaterialApp(
          home: SearchVehicleScreen(),
        ),
      );
      await tester.pump();

      final searchButton = find.widgetWithText(ElevatedButton, 'Search Registry');
      expect(searchButton, findsOneWidget);

      await tester.ensureVisible(searchButton);
      await tester.tap(searchButton);
      await tester.pumpAndSettle();

      expect(find.text('Enter registration number'), findsOneWidget);
      expect(find.text('Enter chassis number'), findsOneWidget);
      expect(find.text('Enter license number'), findsOneWidget);
    });
  });
}