import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('App loads smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame using your actual app class
    await tester.pumpWidget(const VSenseApp());

    // Verify that the app mounts without crashing
    expect(find.byType(VSenseApp), findsOneWidget);
  });
}