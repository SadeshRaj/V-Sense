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

  bool _isTorchOn = false;

  MobileScannerController cameraController = MobileScannerController(
    autoStart: true,
    detectionSpeed: DetectionSpeed.noDuplicates,
  );

  static const Color navyDeep = Color(0xFF0A1930);
  static const Color accentBlue = Color(0xFF2563EB);

  @override
  void dispose() {
    cameraController.dispose();
    super.dispose();
  }

  Future<void> _verifyCertificate(String url) async {
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
                child: Icon(Icons.circle, size: 6, color: accentBlue),
              ),
              Expanded(child: Text(cleanLine, style: const TextStyle(fontSize: 13, color: accentBlue, height: 1.4))),
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
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Verify Certificate',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          if (_status == 'scanning') ...[
            IconButton(
              icon: Icon(
                _isTorchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                color: _isTorchOn ? Colors.amber : Colors.white,
              ),
              onPressed: () async {
                await cameraController.toggleTorch();
                setState(() => _isTorchOn = !_isTorchOn);
              },
            ),
            IconButton(
              icon: const Icon(Icons.flip_camera_ios_rounded, color: Colors.white),
              onPressed: () => cameraController.switchCamera(),
            ),
          ] else
            IconButton(
              icon: const Icon(Icons.qr_code_scanner_rounded, color: Colors.white),
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
      extendBodyBehindAppBar: true,
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_status == 'scanning') {
      final scanAreaSize = MediaQuery.of(context).size.width * 0.72;

      return Stack(
        children: [
          // 1. Live Camera Stream
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

          // 2. Dimmed Translucent Screen Mask
          ColorFiltered(
            colorFilter: ColorFilter.mode(
              Colors.black.withOpacity(0.55),
              BlendMode.srcOut,
            ),
            child: Stack(
              children: [
                Container(
                  decoration: const BoxDecoration(
                    color: Colors.red,
                    backgroundBlendMode: BlendMode.dstOut,
                  ),
                ),
                Align(
                  alignment: Alignment.center,
                  child: Container(
                    width: scanAreaSize,
                    height: scanAreaSize,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 3. Clean Frame Brackets around Scan Window
          Align(
            alignment: Alignment.center,
            child: SizedBox(
              width: scanAreaSize,
              height: scanAreaSize,
              child: Stack(
                children: [
                  // Top-Left Corner Bracket
                  Positioned(
                    top: 0,
                    left: 0,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        border: Border(
                          top: BorderSide(color: accentBlue, width: 4),
                          left: BorderSide(color: accentBlue, width: 4),
                        ),
                        borderRadius: BorderRadius.only(topLeft: Radius.circular(24)),
                      ),
                    ),
                  ),
                  // Top-Right Corner Bracket
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        border: Border(
                          top: BorderSide(color: accentBlue, width: 4),
                          right: BorderSide(color: accentBlue, width: 4),
                        ),
                        borderRadius: BorderRadius.only(topRight: Radius.circular(24)),
                      ),
                    ),
                  ),
                  // Bottom-Left Corner Bracket
                  Positioned(
                    bottom: 0,
                    left: 0,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        border: Border(
                          bottom: BorderSide(color: accentBlue, width: 4),
                          left: BorderSide(color: accentBlue, width: 4),
                        ),
                        borderRadius: BorderRadius.only(bottomLeft: Radius.circular(24)),
                      ),
                    ),
                  ),
                  // Bottom-Right Corner Bracket
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        border: Border(
                          bottom: BorderSide(color: accentBlue, width: 4),
                          right: BorderSide(color: accentBlue, width: 4),
                        ),
                        borderRadius: BorderRadius.only(bottomRight: Radius.circular(24)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 4. Floating HUD Prompt Card at Bottom
          Positioned(
            bottom: 50,
            left: 24,
            right: 24,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: navyDeep.withOpacity(0.85),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.15)),
                boxShadow: const [
                  BoxShadow(
                    color: Colors.black45,
                    blurRadius: 16,
                    offset: Offset(0, 4),
                  )
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Icon(Icons.qr_code_scanner_rounded, color: accentBlue, size: 20),
                  SizedBox(width: 10),
                  Text(
                    'Align V-Sense QR code inside frame',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.2,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    }

    if (_status == 'loading') {
      return Container(
        color: const Color(0xFFF8FAFC),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: const [
              CircularProgressIndicator(color: accentBlue),
              SizedBox(height: 20),
              Text(
                'Verifying Cryptographic Signature...',
                style: TextStyle(fontWeight: FontWeight.bold, color: navyDeep, fontSize: 15),
              ),
            ],
          ),
        ),
      );
    }

    if (_status == 'invalid' || _status == 'error') {
      return Container(
        color: const Color(0xFFF8FAFC),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    color: Color(0xFFFEF2F2),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _status == 'invalid' ? Icons.cancel_outlined : Icons.warning_amber_rounded,
                    size: 60,
                    color: const Color(0xFFEF4444),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  _status == 'invalid' ? 'Verification Failed' : 'Connection Error',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: navyDeep),
                ),
                const SizedBox(height: 10),
                Text(
                  _message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 14, height: 1.4),
                ),
                const SizedBox(height: 28),
                ElevatedButton.icon(
                  onPressed: () {
                    setState(() => _status = 'scanning');
                    cameraController.start();
                  },
                  icon: const Icon(Icons.qr_code_scanner_rounded, color: Colors.white),
                  label: const Text('Scan Another Code', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: navyDeep,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                )
              ],
            ),
          ),
        ),
      );
    }

    if (_status == 'valid' && _verificationData != null) {
      final vehicle = _verificationData!['vehicle'] ?? {};
      final records = _verificationData!['records'] ?? [];
      final aiInsight = _verificationData!['aiInsight'] ?? '';

      return Container(
        color: const Color(0xFFF8FAFC),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 100, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  color: Color(0xFFECFDF5),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.verified_rounded, color: Color(0xFF10B981), size: 48),
              ),
              const SizedBox(height: 12),
              const Text(
                'Authentic Certificate',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: navyDeep),
              ),
              const SizedBox(height: 20),

              // Vehicle Details Card
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('VEHICLE INFORMATION', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFF94A3B8))),
                      const SizedBox(height: 8),
                      const Divider(height: 1),
                      const SizedBox(height: 8),
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
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'AI Condition Insight & Evidence',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E40AF)),
                      ),
                      const SizedBox(height: 10),
                      ..._buildAiInsight(aiInsight),
                    ],
                  ),
                ),
              const SizedBox(height: 16),

              // History Timeline
              const Text(
                'Maintenance & Service Timeline',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: navyDeep),
              ),
              const SizedBox(height: 10),
              if (records.isEmpty)
                const Text('No records found.', style: TextStyle(color: Color(0xFF64748B)))
              else
                ...records.map<Widget>((r) => Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(r['createdAt']?.toString().split('T').first ?? '', style: const TextStyle(fontWeight: FontWeight.bold, color: navyDeep)),
                            Text('${r['odometerReading']} km', style: const TextStyle(color: accentBlue, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(r['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: navyDeep)),
                        const SizedBox(height: 4),
                        Text(r['description'] ?? '', style: const TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                        const SizedBox(height: 8),
                        Text(
                          '${r['garageName']} ${r['garageVerified'] == true ? '(Verified)' : '(Unverified)'}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                        ),
                      ],
                    ),
                  ),
                )).toList(),
            ],
          ),
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
          Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 13)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, color: navyDeep, fontSize: 13)),
        ],
      ),
    );
  }
}