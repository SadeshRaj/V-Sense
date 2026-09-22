import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';
import '../../../core/config/env_config.dart';

class VehicleServiceHistoryScreen extends StatefulWidget {
  final String vehicleId;
  final String vehicleNumber;

  const VehicleServiceHistoryScreen({
    super.key,
    required this.vehicleId,
    required this.vehicleNumber,
  });

  @override
  State<VehicleServiceHistoryScreen> createState() => _VehicleServiceHistoryScreenState();
}

class _VehicleServiceHistoryScreenState extends State<VehicleServiceHistoryScreen> {
  final _storage = const FlutterSecureStorage();
  bool _isLoading = true;
  List<dynamic> _records = [];
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _fetchServiceHistory();
  }

  Future<void> _fetchServiceHistory() async {
    try {
      final token = await _storage.read(key: 'jwt_token');
      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/ServiceRecords/vehicle/${widget.vehicleId}'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        setState(() {
          _records = jsonDecode(response.body);
          _isLoading = false;
        });
      } else if (response.statusCode == 403) {
        setState(() {
          _errorMessage = 'You do not have permission to view this vehicle\'s history.';
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = 'Failed to load service records. Server returned ${response.statusCode}.';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Network error. Please check your connection.';
        _isLoading = false;
      });
    }
  }

  void _showImagePreview(BuildContext context, String imageUrl) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(10),
        child: Stack(
          alignment: Alignment.center,
          children: [
            InteractiveViewer(
              panEnabled: true,
              minScale: 0.5,
              maxScale: 4.0,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  imageUrl,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      padding: const EdgeInsets.all(40),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                      child: const Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.broken_image_rounded, color: Colors.grey, size: 60),
                          SizedBox(height: 16),
                          Text("Image not found on server", style: TextStyle(color: Colors.grey)),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),
            Positioned(
              top: 10,
              right: 10,
              child: IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white, size: 30),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const Color navyDeep = Color(0xFF0A1930);
    const Color accentBlue = Color(0xFF2563EB);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Maintenance History', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            Text(widget.vehicleNumber, style: TextStyle(fontSize: 12, color: Colors.white.withOpacity(0.8))),
          ],
        ),
        backgroundColor: navyDeep,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: _buildBody(accentBlue, navyDeep),
    );
  }

  Widget _buildBody(Color accentBlue, Color navyDeep) {
    if (_isLoading) {
      return Center(child: CircularProgressIndicator(color: accentBlue));
    }

    if (_errorMessage.isNotEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 60),
              const SizedBox(height: 16),
              Text(_errorMessage, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16, color: Colors.black87)),
            ],
          ),
        ),
      );
    }

    if (_records.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history_toggle_off_rounded, color: Colors.grey, size: 60),
            SizedBox(height: 16),
            Text('No maintenance records found.', style: TextStyle(fontSize: 16, color: Colors.grey, fontWeight: FontWeight.w600)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _records.length,
      itemBuilder: (context, index) {
        final record = _records[index];
        final date = DateTime.parse(record['createdAt']);
        final formattedDate = DateFormat('MMM dd, yyyy').format(date);
        final photos = List<String>.from(record['photoUrls'] ?? []);

        return Card(
          elevation: 2,
          margin: const EdgeInsets.only(bottom: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title and Date
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        record['title'] ?? 'Service Record',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF0A1930)),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(formattedDate, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF2563EB))),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Specs Row
                Row(
                  children: [
                    const Icon(Icons.speed_rounded, size: 16, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text('${record['odometerReading']} km', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black87)),
                    const SizedBox(width: 16),
                    const Icon(Icons.payment_rounded, size: 16, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text(
                      record['paymentMethod'] == 'InsuranceClaim' ? 'Insurance' : 'Customer',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: record['paymentMethod'] == 'InsuranceClaim' ? Colors.purple : Colors.green
                      ),
                    ),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(height: 1, color: Color(0xFFE2E8F0)),
                ),

                // Description
                Text(
                  record['description'] ?? '',
                  style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.5),
                ),

                // Images
                if (photos.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Text('Evidence Photos', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 80,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: photos.length,
                      itemBuilder: (context, photoIndex) {
                        return GestureDetector(
                          onTap: () => _showImagePreview(context, photos[photoIndex]),
                          child: Container(
                            width: 80,
                            margin: const EdgeInsets.only(right: 12),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(11),
                              child: Image.network(
                                photos[photoIndex],
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) {
                                  return Container(
                                    color: Colors.grey.shade100,
                                    child: const Icon(Icons.image_not_supported_rounded, color: Colors.grey, size: 28),
                                  );
                                },
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}