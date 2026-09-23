// lib/features/dashboard/screens/qr_scanner_screen.dart
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../../core/config/env_config.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  String _status = 'scanning'; // scanning, loading, valid, invalid, error
  String _message = '';
  Map<String, dynamic>? _verificationData;
  MobileScannerController cameraController = MobileScannerController(autoStart: false);

  static const Color navyDeep = Color(0xFF0A1930);

  @override
  void initState() {
    super.initState();
    _startCamera();
  }

  Future<void> _startCamera() async {
    try {
      await cameraController.start();
    } catch (e) {
      debugPrint('Camera error: $e');
    }
  }

  Future<void> _verifyCertificate(String url) async {
    // Extract the UUID from the scanned URL (e.g., http://.../verify/1234-5678-...)
    final Uri parsedUrl = Uri.parse(url);
    final List<String> segments = parsedUrl.pathSegments;

    if (!segments.contains('verify') || segments.last.isEmpty) {
      setState(() {
        _status = 'invalid';
        _message = 'Not a valid V-Sense QR Code.';
      });
      return;
    }

    final String workflowId = segments.last;

    setState(() => _status = 'loading');

    try {
      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/workflows/verify/$workflowId'),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['valid'] == true) {
        setState(() {
          _status = 'valid';
          _verificationData = data;
        });
      } else {
        setState(() {
          _status = 'invalid';
          _message = data['message'] ?? 'Invalid or pending certificate.';
        });
      }
    } catch (e) {
      setState(() {
        _status = 'error';
        _message = 'Network error while verifying. Please try again.';
      });
    }
  }

  List<Widget> _buildAiInsight(String text) {
    if (text.isEmpty) return [];
    List<String> lines = text.split('\n');
    List<Widget> widgets = [];

    for (String line in lines) {
      if (line.trim().isEmpty) continue;
      String cleanLine = line.trim().replaceAll(RegExp(r'^[-*]\s*'), '');
      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 4, right: 6),
                child: Icon(Icons.circle, size: 6, color: Colors.blue),
              ),
              Expanded(child: Text(cleanLine, style: const TextStyle(fontSize: 13, color: Colors.blue, height: 1.4))),
            ],
          ),
        ),
      );
    }
    return widgets;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: navyDeep),
        title: const Text('Verify Certificate', style: TextStyle(color: navyDeep, fontWeight: FontWeight.bold)),
        actions: [
          if (_status != 'scanning')
            IconButton(
              icon: const Icon(Icons.qr_code_scanner),
              onPressed: () {
                setState(() {
                  _status = 'scanning';
                  _verificationData = null;
                });
                cameraController.start();
              },
            )
        ],
      ),
      body: SafeArea(
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_status == 'scanning') {
      return Stack(
        children: [
          MobileScanner(
            controller: cameraController,
            onDetect: (capture) {
              final List<Barcode> barcodes = capture.barcodes;
              for (final barcode in barcodes) {
                if (barcode.rawValue != null) {
                  cameraController.stop();
                  _verifyCertificate(barcode.rawValue!);
                  break;
                }
              }
            },
          ),
          Container(
            decoration: ShapeDecoration(
              shape: QrScannerOverlayShape(
                borderColor: Colors.blue,
                borderRadius: 10,
                borderLength: 30,
                borderWidth: 10,
                cutOutSize: 300,
              ),
            ),
          ),
          const Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Text(
              'Align QR code within the frame',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      );
    }

    if (_status == 'loading') {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: navyDeep),
            SizedBox(height: 24),
            Text('Verifying Cryptographic Signature...', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }

    if (_status == 'invalid' || _status == 'error') {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(_status == 'invalid' ? Icons.cancel : Icons.warning_amber_rounded, size: 80, color: Colors.red),
              const SizedBox(height: 24),
              Text(_status == 'invalid' ? 'Verification Failed' : 'Connection Error', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: navyDeep)),
              const SizedBox(height: 12),
              Text(_message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red, fontSize: 16)),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: () {
                  setState(() => _status = 'scanning');
                  cameraController.start();
                },
                icon: const Icon(Icons.qr_code_scanner, color: Colors.white),
                label: const Text('Scan Another Code', style: TextStyle(color: Colors.white)),
                style: ElevatedButton.styleFrom(backgroundColor: navyDeep, padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12)),
              )
            ],
          ),
        ),
      );
    }

    if (_status == 'valid' && _verificationData != null) {
      final vehicle = _verificationData!['vehicle'] ?? {};
      final records = _verificationData!['records'] ?? [];
      final aiInsight = _verificationData!['aiInsight'] ?? '';

      return SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.verified, color: Colors.green, size: 64),
            const SizedBox(height: 16),
            const Text('Authentic Certificate', textAlign: TextAlign.center, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: navyDeep)),
            const SizedBox(height: 24),

            // Vehicle Details
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.grey.shade200)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Vehicle Information', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                    const Divider(),
                    _buildDetailRow('Make/Model', '${vehicle['make'] ?? 'N/A'} ${vehicle['model'] ?? ''}'),
                    _buildDetailRow('Year', '${vehicle['year'] ?? 'N/A'}'),
                    _buildDetailRow('Reg No', '${vehicle['registrationNumber'] ?? 'N/A'}'),
                    _buildDetailRow('VIN', '${vehicle['vin'] ?? 'N/A'}'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // AI Insight
            if (aiInsight.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.blue.shade200)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('AI Condition Insight & Evidence', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade900)),
                    const SizedBox(height: 12),
                    ..._buildAiInsight(aiInsight),
                  ],
                ),
              ),
            const SizedBox(height: 16),

            // History Timeline
            const Text('Maintenance & Service Timeline', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navyDeep)),
            const SizedBox(height: 12),
            if (records.isEmpty)
              const Text('No records found.', style: TextStyle(color: Colors.grey))
            else
              ...records.map<Widget>((r) => Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(r['createdAt']?.toString().split('T').first ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                          Text('${r['odometerReading']} km', style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(r['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 4),
                      Text(r['description'] ?? '', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                      const SizedBox(height: 8),
                      Text('${r['garageName']} ${r['garageVerified'] == true ? '(Verified)' : '(Unverified)'}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              )).toList(),
          ],
        ),
      );
    }
    return const SizedBox.shrink();
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}

// Custom overlay shape for the QR scanner
class QrScannerOverlayShape extends ShapeBorder {
  final Color borderColor;
  final double borderWidth;
  final Color overlayColor;
  final double borderRadius;
  final double borderLength;
  final double cutOutSize;

  QrScannerOverlayShape({
    this.borderColor = Colors.white,
    this.borderWidth = 3.0,
    this.overlayColor = const Color.fromRGBO(0, 0, 0, 80),
    this.borderRadius = 0,
    this.borderLength = 40,
    this.cutOutSize = 250,
  });

  @override
  EdgeInsetsGeometry get dimensions => const EdgeInsets.all(10);

  @override
  Path getInnerPath(Rect rect, {TextDirection? textDirection}) {
    return Path()
      ..fillType = PathFillType.evenOdd
      ..addPath(getOuterPath(rect), Offset.zero);
  }

  @override
  Path getOuterPath(Rect rect, {TextDirection? textDirection}) {
    Path _getLeftTopPath(Rect rect) {
      return Path()
        ..moveTo(rect.left, rect.bottom)
        ..lineTo(rect.left, rect.top)
        ..lineTo(rect.right, rect.top);
    }
    return _getLeftTopPath(rect)
      ..lineTo(rect.right, rect.bottom)
      ..lineTo(rect.left, rect.bottom)
      ..lineTo(rect.left, rect.top);
  }

  @override
  void paint(Canvas canvas, Rect rect, {TextDirection? textDirection}) {
    final width = rect.width;
    final borderWidthSize = width / 2;
    final height = rect.height;
    final borderOffset = borderWidth / 2;
    final _borderLength = borderLength > cutOutSize / 2 + borderWidthSize ? borderWidthSize / 2 : borderLength;
    final _cutOutSize = cutOutSize < width ? cutOutSize : width - borderOffset;

    final backgroundPaint = Paint()
      ..color = overlayColor
      ..style = PaintingStyle.fill;

    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = borderWidth;

    final boxPaint = Paint()
      ..color = Colors.transparent
      ..style = PaintingStyle.fill
      ..blendMode = BlendMode.dstOut;

    final cutOutRect = Rect.fromLTWH(
      rect.left + width / 2 - _cutOutSize / 2 + borderOffset,
      rect.top + height / 2 - _cutOutSize / 2 + borderOffset,
      _cutOutSize - borderOffset * 2,
      _cutOutSize - borderOffset * 2,
    );

    canvas
      ..saveLayer(rect, backgroundPaint)
      ..drawRect(rect, backgroundPaint)
      ..drawRRect(
        RRect.fromRectAndRadius(cutOutRect, Radius.circular(borderRadius)),
        boxPaint,
      )
      ..restore();

    canvas
      ..drawPath(
        Path()
          ..moveTo(cutOutRect.left, cutOutRect.top + _borderLength)
          ..lineTo(cutOutRect.left, cutOutRect.top + borderRadius)
          ..arcToPoint(Offset(cutOutRect.left + borderRadius, cutOutRect.top), radius: Radius.circular(borderRadius))
          ..lineTo(cutOutRect.left + _borderLength, cutOutRect.top),
        borderPaint,
      )
      ..drawPath(
        Path()
          ..moveTo(cutOutRect.right, cutOutRect.top + _borderLength)
          ..lineTo(cutOutRect.right, cutOutRect.top + borderRadius)
          ..arcToPoint(Offset(cutOutRect.right - borderRadius, cutOutRect.top), radius: Radius.circular(borderRadius))
          ..lineTo(cutOutRect.right - _borderLength, cutOutRect.top),
        borderPaint,
      )
      ..drawPath(
        Path()
          ..moveTo(cutOutRect.right, cutOutRect.bottom - _borderLength)
          ..lineTo(cutOutRect.right, cutOutRect.bottom - borderRadius)
          ..arcToPoint(Offset(cutOutRect.right - borderRadius, cutOutRect.bottom), radius: Radius.circular(borderRadius))
          ..lineTo(cutOutRect.right - _borderLength, cutOutRect.bottom),
        borderPaint,
      )
      ..drawPath(
        Path()
          ..moveTo(cutOutRect.left, cutOutRect.bottom - _borderLength)
          ..lineTo(cutOutRect.left, cutOutRect.bottom - borderRadius)
          ..arcToPoint(Offset(cutOutRect.left + borderRadius, cutOutRect.bottom), radius: Radius.circular(borderRadius))
          ..lineTo(cutOutRect.left + _borderLength, cutOutRect.bottom),
        borderPaint,
      );
  }

  @override
  ShapeBorder scale(double t) => QrScannerOverlayShape(
    borderColor: borderColor,
    borderWidth: borderWidth * t,
    overlayColor: overlayColor,
    borderRadius: borderRadius * t,
    borderLength: borderLength * t,
    cutOutSize: cutOutSize * t,
  );
}