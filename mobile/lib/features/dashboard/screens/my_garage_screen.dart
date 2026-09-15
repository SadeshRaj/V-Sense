import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/config/env_config.dart';
import 'search_vehicle_screen.dart';

class MyGarageScreen extends StatefulWidget {
  const MyGarageScreen({super.key});

  @override
  State<MyGarageScreen> createState() => _MyGarageScreenState();
}

class _MyGarageScreenState extends State<MyGarageScreen> {
  List<dynamic> _vehicles = [];
  bool _isLoading = true;
  final _storage = const FlutterSecureStorage();

  @override
  void initState() {
    super.initState();
    _fetchMyVehicles();
  }

  Future<void> _fetchMyVehicles() async {
    setState(() => _isLoading = true);
    try {
      final token = await _storage.read(key: 'jwt_token');
      if (token == null) {
        if (mounted) setState(() => _isLoading = false);
        return;
      }

      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/vehicles/my-vehicles'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> vehicleData = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _vehicles = vehicleData;
            _isLoading = false;
          });
        }
      } else {
        if (mounted) setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    const Color backgroundLight = Color(0xFFF8FAFC);
    const Color navyDeep = Color(0xFF0A1930);
    const Color accentBlue = Color(0xFF2563EB);
    const Color textGrey = Color(0xFF64748B);

    return Scaffold(
      backgroundColor: backgroundLight,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: navyDeep),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'My Garage',
          style: TextStyle(color: navyDeep, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline_rounded, color: accentBlue, size: 26),
            tooltip: 'Link Vehicle',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SearchVehicleScreen()),
              ).then((_) => _fetchMyVehicles());
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _fetchMyVehicles,
          color: accentBlue,
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: accentBlue))
              : _vehicles.isEmpty
              ? _buildEmptyState(context, navyDeep, accentBlue, textGrey)
              : ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: _vehicles.length,
            itemBuilder: (context, index) {
              final vehicle = _vehicles[index];
              return _buildVehicleCard(vehicle, navyDeep, accentBlue, textGrey);
            },
          ),
        ),
      ),
    );
  }

  Widget _buildVehicleCard(dynamic vehicle, Color navyDeep, Color accentBlue, Color textGrey) {
    final regNo = vehicle['registrationNumber'] ?? vehicle['registration_number'] ?? 'N/A';
    final make = vehicle['make'] ?? '';
    final model = vehicle['model'] ?? '';
    final chassisOrVin = vehicle['chassisNumber'] ?? vehicle['chassis_number'] ?? vehicle['vin'] ?? 'N/A';
    final year = vehicle['manufacturingYear'] ?? vehicle['manufactureYear'] ?? '';

    final titleText = (make.isNotEmpty || model.isNotEmpty)
        ? '$make $model ${year.toString().isNotEmpty ? "($year)" : ""}'.trim()
        : regNo;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: navyDeep.withOpacity(0.04),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: accentBlue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(Icons.directions_car_rounded, color: accentBlue, size: 30),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  titleText,
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: navyDeep),
                ),
                if (make.isNotEmpty || model.isNotEmpty)
                  Text(
                    'Reg: $regNo',
                    style: TextStyle(fontSize: 13, color: textGrey, fontWeight: FontWeight.w600),
                  ),
                const SizedBox(height: 4),
                Text(
                  'Chassis: $chassisOrVin',
                  style: TextStyle(fontSize: 12, color: textGrey.withOpacity(0.8)),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'Active',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, Color navyDeep, Color accentBlue, Color textGrey) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      child: Container(
        height: MediaQuery.of(context).size.height * 0.7,
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: accentBlue.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.garage_outlined, size: 64, color: accentBlue.withOpacity(0.8)),
            ),
            const SizedBox(height: 24),
            Text(
              'Your Garage is Empty',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: navyDeep),
            ),
            const SizedBox(height: 8),
            Text(
              'No active vehicle ownerships found. Search and link your vehicle to manage certificates and reports.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: textGrey, height: 1.4),
            ),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SearchVehicleScreen()),
                ).then((_) => _fetchMyVehicles());
              },
              icon: const Icon(Icons.search_rounded, color: Colors.white),
              label: const Text('Link a Vehicle', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: accentBlue,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}