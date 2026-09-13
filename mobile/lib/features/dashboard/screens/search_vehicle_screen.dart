import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/config/env_config.dart';

class SearchVehicleScreen extends StatefulWidget {
  const SearchVehicleScreen({super.key});

  @override
  State<SearchVehicleScreen> createState() => _SearchVehicleScreenState();
}

class _SearchVehicleScreenState extends State<SearchVehicleScreen> {
  final _formKey = GlobalKey<FormState>();
  final _regController = TextEditingController();
  final _chassisController = TextEditingController();
  final _licenseController = TextEditingController();
  final _storage = const FlutterSecureStorage();

  bool _isSearching = false;
  Map<String, dynamic>? _vehicleData;
  String? _errorMessage;

  @override
  void dispose() {
    _regController.dispose();
    _chassisController.dispose();
    _licenseController.dispose();
    super.dispose();
  }

  Future<void> _performSearch() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSearching = true;
      _errorMessage = null;
      _vehicleData = null;
    });

    try {
      final token = await _storage.read(key: 'jwt_token');

      final response = await http.post(
        Uri.parse('${EnvConfig.apiUrl}/vehicles/verify-lookup'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'registrationNumber': _regController.text.trim(),
          'chassisNumber': _chassisController.text.trim(),
          'licenseNumber': _licenseController.text.trim(),
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        setState(() {
          _vehicleData = data;
          _isSearching = false;
        });
      } else {
        setState(() {
          _errorMessage = data['message'] ?? 'Vehicle not found or already registered.';
          _isSearching = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Network error. Please check your internet connection.';
        _isSearching = false;
      });
    }
  }

  Future<void> _initiatePayment(String vehicleId) async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Initiating PayHere checkout for Vehicle ID: $vehicleId')),
    );
  }

  @override
  Widget build(BuildContext context) {
    const Color navyDeep = Color(0xFF0A1930);
    const Color accentBlue = Color(0xFF2563EB);
    const Color backgroundLight = Color(0xFFF8FAFC);
    const Color textGrey = Color(0xFF64748B);
    const Color hintGrey = Color(0xFF94A3B8); // Standard soft grey for hints

    return Scaffold(
      backgroundColor: backgroundLight,
      appBar: AppBar(
        title: const Text(
          'Verify & Link Vehicle',
          style: TextStyle(color: navyDeep, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: navyDeep),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Lookup Government Database',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: navyDeep),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Enter the vehicle credentials to search state registry records.',
                  style: TextStyle(fontSize: 14, color: textGrey),
                ),
                const SizedBox(height: 20),

                // Document Helper Guide Card
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Where to find these details:',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textGrey),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.asset(
                                    'assets/images/chassis_guide.jpeg',
                                    height: 90,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Chassis Number',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: navyDeep),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.asset(
                                    'assets/images/license_guide.jpeg',
                                    height: 90,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'License Number',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: navyDeep),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Registration Number Input
                TextFormField(
                  controller: _regController,
                  textCapitalization: TextCapitalization.characters,
                  style: const TextStyle(color: navyDeep, fontWeight: FontWeight.w600),
                  decoration: InputDecoration(
                    labelText: 'Vehicle Registration Number',
                    hintText: 'e.g., WP CBE-9154',
                    hintStyle: const TextStyle(color: hintGrey, fontWeight: FontWeight.normal),
                    prefixIcon: const Icon(Icons.badge_outlined, color: accentBlue),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  validator: (value) =>
                  value == null || value.trim().isEmpty ? 'Enter registration number' : null,
                ),
                const SizedBox(height: 16),

                // Chassis Number Input
                TextFormField(
                  controller: _chassisController,
                  textCapitalization: TextCapitalization.characters,
                  style: const TextStyle(color: navyDeep, fontWeight: FontWeight.w600),
                  decoration: InputDecoration(
                    labelText: 'Chassis Number',
                    hintText: 'e.g., N786543322',
                    hintStyle: const TextStyle(color: hintGrey, fontWeight: FontWeight.normal),
                    prefixIcon: const Icon(Icons.tag_outlined, color: accentBlue),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  validator: (value) =>
                  value == null || value.trim().isEmpty ? 'Enter chassis number' : null,
                ),
                const SizedBox(height: 16),

                // Revenue License Number Input
                TextFormField(
                  controller: _licenseController,
                  textCapitalization: TextCapitalization.characters,
                  style: const TextStyle(color: navyDeep, fontWeight: FontWeight.w600),
                  decoration: InputDecoration(
                    labelText: 'Revenue License Number',
                    hintText: 'e.g., 0039016',
                    hintStyle: const TextStyle(color: hintGrey, fontWeight: FontWeight.normal),
                    prefixIcon: const Icon(Icons.receipt_long_outlined, color: accentBlue),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  validator: (value) =>
                  value == null || value.trim().isEmpty ? 'Enter license number' : null,
                ),
                const SizedBox(height: 24),

                // Search Button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isSearching ? null : _performSearch,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accentBlue,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: _isSearching
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search_rounded, color: Colors.white),
                        SizedBox(width: 8),
                        Text('Search Registry', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Error Banner
                if (_errorMessage != null)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFFECACA)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline_rounded, color: Color(0xFFEF4444)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(_errorMessage!, style: const TextStyle(color: Color(0xFF991B1B), fontSize: 13, fontWeight: FontWeight.w600)),
                        ),
                      ],
                    ),
                  ),

                // Found Vehicle Preview Result
                if (_vehicleData != null) ...[
                  const Divider(height: 32),
                  const Text(
                    'Vehicle Match Found',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: navyDeep),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: accentBlue.withOpacity(0.3)),
                      boxShadow: [
                        BoxShadow(color: navyDeep.withOpacity(0.05), blurRadius: 14, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Column(
                      children: [
                        _buildDetailRow('Registration', _vehicleData!['registrationNumber'] ?? '-'),
                        _buildDetailRow('Make & Model', '${_vehicleData!['make'] ?? ''} ${_vehicleData!['model'] ?? ''}'),
                        _buildDetailRow('Manufacturing Year', '${_vehicleData!['manufacturingYear'] ?? '-'}'),
                        _buildDetailRow('Fuel Type', _vehicleData!['fuelType'] ?? '-'),
                        _buildDetailRow('Vehicle Type', _vehicleData!['type'] ?? '-'),
                        const Divider(height: 24),
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            onPressed: () => _initiatePayment(_vehicleData!['id']),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            child: const Text('Proceed to Verify & Pay (LKR 1,500)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 13, fontWeight: FontWeight.w500)),
          Text(value, style: const TextStyle(color: Color(0xFF0A1930), fontSize: 14, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}