import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:payhere_mobilesdk_flutter/payhere_mobilesdk_flutter.dart';
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

  void _showTermsAndPaymentModal(String vehicleId) {
    bool isAgreed = false;

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            const Color navyDeep = Color(0xFF0A1930);
            const Color accentBlue = Color(0xFF2563EB);
            const Color textGrey = Color(0xFF64748B);

            return BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 5.0, sigmaY: 5.0),
              child: Dialog(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24.0)),
                backgroundColor: Colors.white,
                insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.gavel_rounded, color: accentBlue, size: 24),
                              SizedBox(width: 8),
                              Text(
                                'Verification Policy',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: navyDeep,
                                ),
                              ),
                            ],
                          ),
                          IconButton(
                            onPressed: () => Navigator.of(dialogContext).pop(),
                            icon: const Icon(Icons.close_rounded, color: textGrey),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 1),
                      const SizedBox(height: 16),
                      const Text(
                        'Please review the terms before linking your vehicle:',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: textGrey),
                      ),
                      const SizedBox(height: 12),
                      _buildPolicyPoint(
                        icon: Icons.all_inclusive_rounded,
                        title: 'One-Time Payment & Lifetime Access',
                        description: 'Paying LKR 1,500 grants lifetime digital verification and monitoring access for this vehicle on your account.',
                      ),
                      const SizedBox(height: 10),
                      _buildPolicyPoint(
                        icon: Icons.warning_amber_rounded,
                        title: 'Removal & Re-linking Policy',
                        description: 'If you un-link or remove this vehicle intentionally or accidentally, you will need to pay the verification fee again to re-link it.',
                      ),
                      const SizedBox(height: 10),
                      _buildPolicyPoint(
                        icon: Icons.support_agent_rounded,
                        title: 'Need Help?',
                        description: 'If you have questions or concerns, reach out to our support team at support@vsense.com.',
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 1),
                      const SizedBox(height: 12),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Checkbox(
                            value: isAgreed,
                            activeColor: accentBlue,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                            onChanged: (bool? value) {
                              setModalState(() {
                                isAgreed = value ?? false;
                              });
                            },
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setModalState(() {
                                  isAgreed = !isAgreed;
                                });
                              },
                              child: const Text(
                                'I understand and agree to the verification policy and terms.',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: navyDeep),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: isAgreed
                              ? () {
                            Navigator.of(dialogContext).pop();
                            _startPayHereCheckout(vehicleId);
                          }
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            disabledBackgroundColor: const Color(0xFFCBD5E1),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.payment_rounded, color: Colors.white, size: 20),
                              SizedBox(width: 8),
                              Text(
                                'Proceed to Pay (LKR 1,500)',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _startPayHereCheckout(String vehicleId) async {
    final userId = await _storage.read(key: 'user_id');
    if (userId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Session error. Please log in again.')),
        );
      }
      return;
    }

    Map<String, dynamic> paymentObject = {
      "sandbox": EnvConfig.payhereIsSandbox,
      "merchant_id": EnvConfig.payhereMerchantId,
      "merchant_secret": EnvConfig.payhereMerchantSecret,
      "notify_url": "${EnvConfig.apiUrl}/payments/payhere-notify",
      "order_id": "VSENSE_${DateTime.now().millisecondsSinceEpoch}",
      "items": "Vehicle Verification - ${_vehicleData?['registrationNumber'] ?? ''}",
      "amount": "1500.00",
      "currency": "LKR",
      "first_name": "Vehicle",
      "last_name": "Owner",
      "email": "owner@vsense.com",
      "phone": "0771234567",
      "address": "Colombo Road",
      "city": "Colombo",
      "country": "Sri Lanka",
      "delivery_address": "Colombo Road",
      "delivery_city": "Colombo",
      "delivery_country": "Sri Lanka",
      "custom_1": vehicleId,
      "custom_2": userId,
    };

    PayHere.startPayment(
      paymentObject,
          (paymentId) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment Successful! Ref: $paymentId'),
            backgroundColor: Colors.green,
          ),
        );
      },
          (error) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment Failed: $error'),
            backgroundColor: Colors.red,
          ),
        );
      },
          () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Payment cancelled')),
        );
      },
    );
  }

  Widget _buildPolicyPoint({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: const Color(0xFF2563EB).withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: const Color(0xFF2563EB), size: 18),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0A1930)),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.3),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    const Color navyDeep = Color(0xFF0A1930);
    const Color accentBlue = Color(0xFF2563EB);
    const Color backgroundLight = Color(0xFFF8FAFC);
    const Color textGrey = Color(0xFF64748B);
    const Color hintGrey = Color(0xFF94A3B8);

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
                            onPressed: () => _showTermsAndPaymentModal(_vehicleData!['id']),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                            ),
                            child: const Center(
                              child: Text(
                                'Proceed to Verify & Pay (LKR 1,500)',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
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