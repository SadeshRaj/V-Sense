// lib/features/dashboard/screens/digital_certs_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:qr_flutter/qr_flutter.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../../../core/config/env_config.dart';

class DigitalCertsScreen extends StatefulWidget {
  const DigitalCertsScreen({super.key});

  @override
  State<DigitalCertsScreen> createState() => _DigitalCertsScreenState();
}

class _DigitalCertsScreenState extends State<DigitalCertsScreen> {
  final _storage = const FlutterSecureStorage();

  List<dynamic> _vehicles = [];
  List<dynamic> _pastWorkflows = [];
  String? _selectedVehicleId;
  String _userId = '';

  String _workflowStatus = 'idle';
  String? _workflowId;
  String _errorMessage = '';
  String _aiInsight = '';
  bool _isGeneratingPdf = false;

  static const Color navyDeep = Color(0xFF0A1930);
  static const Color accentGold = Color(0xFFD4AF37);
  static const Color accentBlue = Color(0xFF2563EB);

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    final userId = await _storage.read(key: 'user_id');
    if (userId != null) setState(() => _userId = userId);
    await _fetchMyVehicles();
  }

  Future<void> _fetchMyVehicles() async {
    try {
      final token = await _storage.read(key: 'jwt_token');
      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/vehicles/my-vehicles'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> vehicles = jsonDecode(response.body);
        setState(() {
          _vehicles = vehicles;
          if (vehicles.isNotEmpty) {
            _selectedVehicleId = vehicles.first['id'];
            _fetchPastWorkflows(_selectedVehicleId!);
          }
        });
      }
    } catch (e) {
      setState(() => _errorMessage = 'Failed to load vehicles.');
    }
  }

  Future<void> _fetchPastWorkflows(String vehicleId) async {
    try {
      final token = await _storage.read(key: 'jwt_token');
      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/workflows/my-workflows/$vehicleId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      if (response.statusCode == 200) {
        setState(() {
          _pastWorkflows = jsonDecode(response.body);
        });
      }
    } catch (e) {
      debugPrint("Failed to load past workflows: $e");
    }
  }

  Future<void> _generateCertificate() async {
    if (_selectedVehicleId == null) return;

    setState(() {
      _workflowStatus = 'processing';
      _errorMessage = '';
      _aiInsight = '';
    });

    try {
      final token = await _storage.read(key: 'jwt_token');
      final response = await http.post(
        Uri.parse('${EnvConfig.apiUrl}/workflows/vehicle-report'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'vehicle_id': _selectedVehicleId,
          'requested_by': _userId,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _workflowId = data['workflow_id'];
          _workflowStatus = data['approval_required'] == true ? 'pending_approval' : 'completed';
        });
        _fetchPastWorkflows(_selectedVehicleId!);
      } else {
        setState(() {
          _workflowStatus = 'failed';
          _errorMessage = 'AI Workflow failed to start.';
        });
      }
    } catch (e) {
      setState(() {
        _workflowStatus = 'failed';
        _errorMessage = 'Network error communicating with AI service.';
      });
    }
  }

  Future<void> _checkApprovalStatus() async {
    if (_workflowId == null) return;

    setState(() => _workflowStatus = 'processing');

    try {
      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/workflows/$_workflowId/status'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final status = data['status'];

        if (data['aiInsight'] != null) {
          _aiInsight = data['aiInsight'];
        }

        if (status == 'completed') {
          setState(() => _workflowStatus = 'completed');
        } else {
          setState(() => _workflowStatus = 'pending_approval');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Still awaiting admin confirmation...')),
            );
          }
        }
      } else {
        setState(() => _workflowStatus = 'pending_approval');
      }
    } catch (e) {
      setState(() => _workflowStatus = 'pending_approval');
    }
  }

  String _getVerificationUrl(String workflowId) {
    String base = EnvConfig.apiUrl.replaceAll(RegExp(r'/api/?$'), '');
    if (base.contains('5000')) {
      base = base.replaceAll('5000', '5173');
    } else if (base.contains('7193')) {
      base = base.replaceAll('7193', '5173');
    }
    return '$base/verify/$workflowId';
  }

  String _sanitizePdfText(String text) {
    return text
        .replaceAll('—', '-')
        .replaceAll('–', '-')
        .replaceAll('“', '"')
        .replaceAll('”', '"')
        .replaceAll('‘', "'")
        .replaceAll('’', "'")
        .replaceAll('•', '-');
  }

  List<pw.Widget> _buildBulletPoints(String text) {
    final sanitizedText = _sanitizePdfText(text);
    List<String> lines = sanitizedText.split('\n');
    List<pw.Widget> widgets = [];

    for (String line in lines) {
      if (line.trim().isEmpty) continue;
      String cleanLine = line.trim().replaceAll(RegExp(r'^[-*]\s*'), '');

      widgets.add(
        pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 6),
          child: pw.Row(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Container(
                margin: const pw.EdgeInsets.only(top: 4, right: 6),
                width: 4,
                height: 4,
                decoration: const pw.BoxDecoration(
                  color: PdfColors.blue900,
                  shape: pw.BoxShape.circle,
                ),
              ),
              pw.Expanded(
                  child: pw.Text(cleanLine,
                      style: const pw.TextStyle(
                          fontSize: 11,
                          color: PdfColors.blue900,
                          lineSpacing: 1.3))),
            ],
          ),
        ),
      );
    }
    return widgets;
  }

  Future<void> _downloadPDFCertificate() async {
    if (_workflowId == null || _selectedVehicleId == null) return;

    setState(() => _isGeneratingPdf = true);

    try {
      final token = await _storage.read(key: 'jwt_token');
      final reportResponse = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/workflows/report-data/$_selectedVehicleId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      Map<String, dynamic> reportData = {};
      if (reportResponse.statusCode == 200) {
        reportData = jsonDecode(reportResponse.body);
      }

      final vehicle = reportData['vehicle'] ?? {};
      final List<dynamic> records = reportData['records'] ?? [];
      final legalStatus = reportData['legalStatus'] ?? {};
      final List<dynamic> pastOwners = reportData['pastOwners'] ?? [];
      final List<dynamic> policeRecords = reportData['policeRecords'] ?? [];

      final String verificationUrl = _getVerificationUrl(_workflowId!);

      final double watermarkOpacity = 0.08;

      final ByteData headerImageByteData = await rootBundle.load('assets/logo_S.png');
      final Uint8List headerImageBytes = headerImageByteData.buffer.asUint8List();
      final pdfHeaderLogo = pw.MemoryImage(headerImageBytes);

      final ByteData watermarkByteData = await rootBundle.load('assets/logo_L2.png');
      final Uint8List watermarkBytes = watermarkByteData.buffer.asUint8List();
      final pdfWatermarkLogo = pw.MemoryImage(watermarkBytes);

      final pdf = pw.Document();
      final String generateDate = DateTime.now().toString().substring(0, 16);

      pdf.addPage(
        pw.MultiPage(
          pageTheme: pw.PageTheme(
            pageFormat: PdfPageFormat.a4,
            margin: const pw.EdgeInsets.all(36),
            buildBackground: (pw.Context context) {
              return pw.FullPage(
                ignoreMargins: false,
                child: pw.Center(
                  child: pw.Opacity(
                    opacity: watermarkOpacity,
                    child: pw.Image(pdfWatermarkLogo, width: 350),
                  ),
                ),
              );
            },
          ),
          footer: (pw.Context context) {
            return pw.Container(
              alignment: pw.Alignment.centerRight,
              margin: const pw.EdgeInsets.only(top: 10),
              child: pw.Text(
                'Generated on: $generateDate | Page ${context.pageNumber} of ${context.pagesCount} | V-Sense Confidential',
                style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey500),
              ),
            );
          },
          build: (pw.Context context) {
            return [
              pw.Header(
                level: 0,
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: pw.CrossAxisAlignment.center,
                  children: [
                    pw.Row(
                      crossAxisAlignment: pw.CrossAxisAlignment.center,
                      children: [
                        pw.Image(pdfHeaderLogo, height: 22),
                        pw.SizedBox(width: 16),
                        pw.Text('VEHICLE HISTORY CERTIFICATE',
                            style: pw.TextStyle(
                                fontSize: 16,
                                fontWeight: pw.FontWeight.bold,
                                color: PdfColors.blue900)),
                      ],
                    ),
                    pw.Text('CERTIFIED',
                        style: pw.TextStyle(
                            fontSize: 14,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColors.green800)),
                  ],
                ),
              ),
              pw.SizedBox(height: 12),

              pw.Container(
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  color: PdfColors.grey100,
                  borderRadius: pw.BorderRadius.circular(8),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Vehicle Information',
                        style: pw.TextStyle(
                            fontSize: 14, fontWeight: pw.FontWeight.bold)),
                    pw.Divider(thickness: 0.5),
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text(
                            'Make/Model: ${_sanitizePdfText(vehicle['make'] ?? 'N/A')} ${_sanitizePdfText(vehicle['model'] ?? '')}'),
                        pw.Text(
                            'Year: ${vehicle['manufacturingYear'] ?? 'N/A'}'),
                      ],
                    ),
                    pw.SizedBox(height: 4),
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text(
                            'Reg No: ${_sanitizePdfText(vehicle['registrationNumber'] ?? 'N/A')}'),
                        pw.Text('VIN: ${_sanitizePdfText(vehicle['vin'] ?? 'N/A')}'),
                      ],
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 12),

              pw.Container(
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  color: PdfColors.grey100,
                  borderRadius: pw.BorderRadius.circular(8),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Legal & Insurance Status',
                        style: pw.TextStyle(
                            fontSize: 14, fontWeight: pw.FontWeight.bold)),
                    pw.Divider(thickness: 0.5),
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text(
                            'Reg Status: ${_sanitizePdfText(legalStatus['registrationStatus'] ?? 'Unknown')}'),
                        pw.Text(
                            'License Expiry: ${legalStatus['revenueLicenseExpiryDate'] != null ? legalStatus['revenueLicenseExpiryDate'].toString().split('T').first : 'N/A'}'),
                      ],
                    ),
                    pw.SizedBox(height: 4),
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text(
                            'Insurance: ${_sanitizePdfText(legalStatus['insuranceStatus'] ?? 'Unknown')} (${_sanitizePdfText(legalStatus['insuranceType'] ?? '-')})'),
                        pw.Text(
                            'Ins Expiry: ${legalStatus['insuranceExpiryDate'] != null ? legalStatus['insuranceExpiryDate'].toString().split('T').first : 'N/A'}'),
                      ],
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 16),

              // NEW: Accident & Police History Block
              pw.Container(
                padding: const pw.EdgeInsets.all(12),
                decoration: pw.BoxDecoration(
                  color: policeRecords.isEmpty ? PdfColors.green50 : PdfColors.red50,
                  border: pw.Border.all(color: policeRecords.isEmpty ? PdfColors.green200 : PdfColors.red200),
                  borderRadius: pw.BorderRadius.circular(8),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Police & Accident Records',
                        style: pw.TextStyle(
                            fontSize: 14,
                            fontWeight: pw.FontWeight.bold,
                            color: policeRecords.isEmpty ? PdfColors.green900 : PdfColors.red900)),
                    pw.Divider(thickness: 0.5, color: policeRecords.isEmpty ? PdfColors.green200 : PdfColors.red200),

                    if (policeRecords.isEmpty)
                      pw.Padding(
                        padding: const pw.EdgeInsets.symmetric(vertical: 4),
                        child: pw.Text('No Stolen or Accident records found on the V-Sense Network.',
                            style: const pw.TextStyle(fontSize: 11, color: PdfColors.green800)),
                      )
                    else
                      pw.TableHelper.fromTextArray(
                        headers: ['Incident Date', 'Type', 'Severity', 'Police Station', 'Notes'],
                        data: policeRecords.map((p) {
                          return [
                            p['incidentDate'] != null ? p['incidentDate'].toString().split('T').first : '',
                            _sanitizePdfText(p['incidentType'] ?? 'Unknown'),
                            _sanitizePdfText(p['severity'] ?? 'Unknown'),
                            _sanitizePdfText(p['policeStation'] ?? 'N/A'),
                            _sanitizePdfText(p['description'] ?? 'No notes'),
                          ];
                        }).toList(),
                        headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white, fontSize: 9),
                        cellStyle: const pw.TextStyle(fontSize: 8),
                        headerDecoration: const pw.BoxDecoration(color: PdfColors.red900),
                        cellHeight: 25,
                      ),
                  ],
                ),
              ),
              pw.SizedBox(height: 16),

              if (_aiInsight.isNotEmpty) ...[
                pw.Container(
                  padding: const pw.EdgeInsets.all(12),
                  decoration: pw.BoxDecoration(
                    color: PdfColors.blue50,
                    border: pw.Border.all(color: PdfColors.blue200),
                    borderRadius: pw.BorderRadius.circular(8),
                  ),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('AI Condition Insight & Evidence',
                          style: pw.TextStyle(
                              fontSize: 12,
                              fontWeight: pw.FontWeight.bold,
                              color: PdfColors.blue900)),
                      pw.SizedBox(height: 8),
                      ..._buildBulletPoints(_aiInsight)
                    ],
                  ),
                ),
                pw.SizedBox(height: 16),
              ],

              pw.Text('Ownership History',
                  style: pw.TextStyle(
                      fontSize: 14, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 8),
              if (pastOwners.isEmpty)
                pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 8),
                  child: pw.Text(
                      'No previous ownership changes reported on platform.',
                      style: const pw.TextStyle(
                          fontSize: 11, color: PdfColors.grey700)),
                )
              else
                pw.TableHelper.fromTextArray(
                  headers: ['Owner Name', 'Start Date', 'End Date'],
                  data: pastOwners.map((o) {
                    return [
                      _sanitizePdfText(o['ownerName'] ?? 'Unknown'),
                      o['ownershipStartDate'] != null
                          ? o['ownershipStartDate'].toString().split('T').first
                          : '',
                      o['ownershipEndDate'] != null
                          ? o['ownershipEndDate'].toString().split('T').first
                          : 'Present',
                    ];
                  }).toList(),
                  headerStyle: pw.TextStyle(
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColors.white,
                      fontSize: 10),
                  cellStyle: const pw.TextStyle(fontSize: 9),
                  headerDecoration:
                  const pw.BoxDecoration(color: PdfColors.grey800),
                  cellHeight: 25,
                ),

              pw.SizedBox(height: 16),

              pw.Text('Detailed Maintenance & Service Timeline',
                  style: pw.TextStyle(
                      fontSize: 14, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 8),

              if (records.isEmpty)
                pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(vertical: 8),
                  child: pw.Text(
                      'No previous maintenance records reported on platform.',
                      style: const pw.TextStyle(
                          fontSize: 11, color: PdfColors.grey700)),
                )
              else
                pw.TableHelper.fromTextArray(
                  headers: [
                    'Date',
                    'Service',
                    'Details / Repairs Done',
                    'Mileage',
                    'Garage'
                  ],
                  data: records.map((r) {
                    final dateStr = r['createdAt'] != null
                        ? r['createdAt'].toString().split('T').first
                        : '';
                    return [
                      dateStr,
                      _sanitizePdfText(r['title'] ?? ''),
                      _sanitizePdfText(r['description'] ?? 'No details provided'),
                      '${r['odometerReading']} km',
                      '${_sanitizePdfText(r['garageName'] ?? 'Independent')}\n(${r['garageVerified'] == true ? 'Verified' : 'Unverified'})',
                    ];
                  }).toList(),
                  headerStyle: pw.TextStyle(
                      fontWeight: pw.FontWeight.bold,
                      color: PdfColors.white,
                      fontSize: 10),
                  cellStyle: const pw.TextStyle(fontSize: 9),
                  headerDecoration:
                  const pw.BoxDecoration(color: PdfColors.blue900),
                  cellHeight: 30,
                  columnWidths: {
                    0: const pw.FlexColumnWidth(1.2),
                    1: const pw.FlexColumnWidth(1.5),
                    2: const pw.FlexColumnWidth(2.5),
                    3: const pw.FlexColumnWidth(1.2),
                    4: const pw.FlexColumnWidth(1.5),
                  },
                  cellAlignments: {
                    0: pw.Alignment.centerLeft,
                    1: pw.Alignment.centerLeft,
                    2: pw.Alignment.topLeft,
                    3: pw.Alignment.centerRight,
                    4: pw.Alignment.center,
                  },
                ),

              pw.SizedBox(height: 24),
              pw.Divider(thickness: 1),

              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.center,
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Scan QR to verify authenticity online:',
                          style: pw.TextStyle(
                              fontWeight: pw.FontWeight.bold, fontSize: 10)),
                      pw.SizedBox(height: 4),
                      pw.Text('Workflow ID: $_workflowId',
                          style: const pw.TextStyle(
                              fontSize: 8, color: PdfColors.grey700)),
                      pw.Text('Anti-Tamper Cryptographic Audit Trail Active',
                          style: const pw.TextStyle(
                              fontSize: 8, color: PdfColors.green800)),
                    ],
                  ),
                  pw.BarcodeWidget(
                    barcode: pw.Barcode.qrCode(),
                    data: verificationUrl,
                    width: 70,
                    height: 70,
                  ),
                ],
              ),

              pw.SizedBox(height: 32),
              pw.Divider(thickness: 0.5, color: PdfColors.grey400),
              pw.SizedBox(height: 8),
              pw.Text('TERMS OF USE & LEGAL DISCLAIMER',
                  style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.grey700)),
              pw.SizedBox(height: 6),
              pw.Text(
                '1. Data Limitations: This V-Sense certificate is generated based on historical data provided by affiliated garages, insurers, and users. V-Sense does not guarantee that this report contains the complete history of the vehicle, as independent repairs, collisions, or modifications may not have been reported to our network.\n\n'
                    '2. AI Insights Advisory: The V-Sense Agentic AI insights, condition assessments, and future predictions are advisory only, generated via algorithmic analysis of service intervals. They do not constitute a warranty or guarantee, and they do not replace a physical inspection by a qualified mechanic. V-Sense accepts no liability for mechanical failures or undisclosed defects.\n\n'
                    '3. Legal & Ownership Status: Registration, licensing, and insurance statuses are snapshot references provided at the time of certificate generation. This document does not constitute legal proof of ownership or guarantee the absence of outstanding financial liens.',
                style: const pw.TextStyle(fontSize: 7, color: PdfColors.grey600, lineSpacing: 1.5),
              ),

            ];
          },
        ),
      );

      await Printing.sharePdf(
        bytes: await pdf.save(),
        filename: 'VSense_Certificate_${vehicle['registrationNumber'] ?? _workflowId}.pdf',
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to generate PDF: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isGeneratingPdf = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: navyDeep),
        title: const Text('Digital Certificates',
            style: TextStyle(color: navyDeep, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_workflowStatus == 'idle' ||
                  _workflowStatus == 'failed') ...[
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _buildHeader(),
                        const SizedBox(height: 32),
                        _buildVehicleSelector(),
                        const SizedBox(height: 24),
                        _buildPastWorkflowsList(),
                      ],
                    ),
                  ),
                ),
                if (_errorMessage.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: Text(
                      _errorMessage,
                      style: const TextStyle(color: Colors.red),
                      textAlign: TextAlign.center,
                    ),
                  ),
                _buildGenerateButton(),
              ] else if (_workflowStatus == 'processing') ...[
                _buildProcessingUI(),
              ] else if (_workflowStatus == 'pending_approval') ...[
                _buildPendingReviewUI(),
              ] else if (_workflowStatus == 'completed') ...[
                _buildCertificateUI(),
              ]
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
              color: accentGold.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12)),
          child:
          const Icon(Icons.workspace_premium, color: accentGold, size: 32),
        ),
        const SizedBox(height: 16),
        const Text('Generate V-Sense Report',
            style: TextStyle(
                fontSize: 24, fontWeight: FontWeight.w900, color: navyDeep)),
        const SizedBox(height: 8),
        const Text(
            'Our Agentic AI will analyze your vehicle\'s history, cross-check for fraud, and issue a cryptographically verifiable certificate.',
            style: TextStyle(color: Colors.grey, height: 1.5)),
      ],
    );
  }

  Widget _buildVehicleSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
              color: navyDeep.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 4))
        ],
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _selectedVehicleId,
          isExpanded: true,
          hint: const Text('Select a vehicle...'),
          icon: const Icon(Icons.keyboard_arrow_down, color: navyDeep),
          items: _vehicles.map((v) {
            return DropdownMenuItem<String>(
              value: v['id'],
              child: Text(
                  '${v['make']} ${v['model']} (${v['registrationNumber']})',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, color: navyDeep)),
            );
          }).toList(),
          onChanged: (val) {
            setState(() {
              _selectedVehicleId = val;
              _workflowStatus = 'idle';
              _workflowId = null;
            });
            if (val != null) _fetchPastWorkflows(val);
          },
        ),
      ),
    );
  }

  Widget _buildPastWorkflowsList() {
    if (_pastWorkflows.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Text('No previous reports found for this vehicle.',
            textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Previous Reports',
            style: TextStyle(
                fontWeight: FontWeight.bold, fontSize: 16, color: navyDeep)),
        const SizedBox(height: 12),
        ..._pastWorkflows.map((w) {
          final isCompleted = w['status'] == 'completed';
          final isPending = w['status'] == 'pending_approval';

          return Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade200)),
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Icon(
                isCompleted
                    ? Icons.verified
                    : (isPending ? Icons.pending_actions : Icons.error),
                color: isCompleted
                    ? Colors.green
                    : (isPending ? Colors.orange : Colors.red),
              ),
              title: Text('Report ID: ${w['id'].toString().substring(0, 8)}...',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 13)),
              subtitle: Text(isCompleted
                  ? 'Ready to Download'
                  : (isPending ? 'Under Admin Review' : 'Failed')),
              trailing: const Icon(Icons.arrow_forward_ios, size: 14),
              onTap: () {
                setState(() {
                  _workflowId = w['id'];
                  _workflowStatus = w['status'];
                });
                if (isCompleted || isPending) {
                  _checkApprovalStatus();
                }
              },
            ),
          );
        }).toList(),
      ],
    );
  }

  Widget _buildGenerateButton() {
    return ElevatedButton(
      onPressed: _vehicles.isEmpty ? null : _generateCertificate,
      style: ElevatedButton.styleFrom(
        backgroundColor: navyDeep,
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 8,
        shadowColor: navyDeep.withOpacity(0.5),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.auto_awesome, color: accentGold),
          SizedBox(width: 12),
          Flexible(
            child: Text(
              'Request New AI Report',
              style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  letterSpacing: 1.2),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProcessingUI() {
    return Expanded(
      child: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(
                  color: accentGold, strokeWidth: 3),
              const SizedBox(height: 32),
              const Text('AI Agents at Work',
                  style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: navyDeep)),
              const SizedBox(height: 12),
              const Text(
                  'Agent 2 is pulling records...\nAgent 3 is checking for odometer rollbacks...\nAgent 4 is validating condition...',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, height: 1.8)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPendingReviewUI() {
    return Expanded(
      child: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.gavel_rounded, size: 64, color: Colors.orange),
              const SizedBox(height: 24),
              const Text('Manual Review Required',
                  style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: navyDeep)),
              const SizedBox(height: 12),
              const Text(
                  'All reports require manual approval before generating a verifiable certificate. An admin will review this shortly.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, height: 1.5)),
              const SizedBox(height: 40),
              OutlinedButton.icon(
                onPressed: _checkApprovalStatus,
                icon: const Icon(Icons.refresh),
                label: const Text('Check Approval Status'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: navyDeep,
                  padding:
                  const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => setState(() => _workflowStatus = 'idle'),
                child: const Text('Back to Dashboard',
                    style: TextStyle(
                        color: accentBlue, fontWeight: FontWeight.bold)),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCertificateUI() {
    final String verificationUrl = _getVerificationUrl(_workflowId!);

    return Expanded(
      child: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(32),
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
                        offset: const Offset(0, 10))
                  ],
                ),
                child: Column(
                  children: [
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.verified, color: accentGold, size: 28),
                        SizedBox(width: 8),
                        Text('V-SENSE CERTIFIED',
                            style: TextStyle(
                                color: accentGold,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 2)),
                      ],
                    ),
                    const SizedBox(height: 32),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16)),
                      child: QrImageView(
                        data: verificationUrl,
                        version: QrVersions.auto,
                        size: 200.0,
                        backgroundColor: Colors.white,
                        eyeStyle: const QrEyeStyle(
                            eyeShape: QrEyeShape.square, color: navyDeep),
                        dataModuleStyle: const QrDataModuleStyle(
                            dataModuleShape: QrDataModuleShape.square,
                            color: navyDeep),
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text('Scan to Verify Authenticity',
                        style: TextStyle(color: Colors.white70, fontSize: 14)),
                    const SizedBox(height: 8),
                    Text(_workflowId ?? '',
                        style: const TextStyle(
                            color: Colors.white30,
                            fontSize: 10,
                            fontFamily: 'monospace')),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _isGeneratingPdf ? null : _downloadPDFCertificate,
                icon: _isGeneratingPdf
                    ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.picture_as_pdf, color: Colors.white),
                label: Text(
                  _isGeneratingPdf
                      ? 'Generating PDF...'
                      : 'Download PDF Certificate',
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: accentBlue,
                  padding:
                  const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => setState(() => _workflowStatus = 'idle'),
                child: const Text('Back to Dashboard',
                    style: TextStyle(
                        color: accentBlue, fontWeight: FontWeight.bold)),
              )
            ],
          ),
        ),
      ),
    );
  }
}