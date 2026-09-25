import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import '../../../core/config/env_config.dart';

class PartneredGaragesScreen extends StatefulWidget {
  const PartneredGaragesScreen({super.key});

  @override
  State<PartneredGaragesScreen> createState() => _PartneredGaragesScreenState();
}

class _PartneredGaragesScreenState extends State<PartneredGaragesScreen> {
  List<dynamic> _garages = [];
  List<dynamic> _filteredGarages = [];
  bool _isLoading = true;
  String _searchQuery = '';
  double? _selectedRadius = 20.0; // Default to 20Km (null = All)

  final _storage = const FlutterSecureStorage();

  static const Color navyDeep = Color(0xFF0A1930);
  static const Color accentBlue = Color(0xFF2563EB);
  static const Color accentEmerald = Color(0xFF10B981);
  static const Color textGrey = Color(0xFF64748B);

  final List<Map<String, dynamic>> _radiusOptions = [
    {'label': '20 km', 'value': 20.0},
    {'label': '50 km', 'value': 50.0},
    {'label': '100 km', 'value': 100.0},
    {'label': 'All', 'value': null},
  ];

  @override
  void initState() {
    super.initState();
    _fetchGarages();
  }

  Future<void> _fetchGarages() async {
    setState(() => _isLoading = true);

    double? userLat;
    double? userLng;

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      LocationPermission permission = await Geolocator.checkPermission();

      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (serviceEnabled &&
          (permission == LocationPermission.whileInUse || permission == LocationPermission.always)) {
        Position? position = await Geolocator.getLastKnownPosition();

        position ??= await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.low,
          timeLimit: const Duration(seconds: 4),
        );

        userLat = position.latitude;
        userLng = position.longitude;
      }
    } catch (_) {
      // If GPS fails/times out, continue without userLat/userLng
    }

    try {
      final token = await _storage.read(key: 'jwt_token');

      List<String> queryParams = [];
      if (userLat != null && userLng != null) {
        queryParams.add('userLat=$userLat');
        queryParams.add('userLng=$userLng');
      }

      if (_selectedRadius != null) {
        queryParams.add('radiusKm=${_selectedRadius!.toInt()}');
      } else {
        queryParams.add('radiusKm=0'); // 0 signals ALL garages on backend
      }

      String endpoint = '${EnvConfig.apiUrl}/Garages/partnered?${queryParams.join('&')}';

      final response = await http.get(
        Uri.parse(endpoint),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _garages = data;
            _filteredGarages = data;
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

  void _filterGarages(String query) {
    setState(() {
      _searchQuery = query;
      if (query.trim().isEmpty) {
        _filteredGarages = _garages;
      } else {
        final q = query.toLowerCase();
        _filteredGarages = _garages.where((g) {
          final name = (g['name'] ?? g['businessName'] ?? '').toString().toLowerCase();
          final address = (g['address'] ?? g['adress'] ?? '').toString().toLowerCase();
          final contact = (g['contactPersonName'] ?? g['fullName'] ?? '').toString().toLowerCase();
          final type = (g['type'] ?? g['role'] ?? '').toString().toLowerCase();
          return name.contains(q) || address.contains(q) || contact.contains(q) || type.contains(q);
        }).toList();
      }
    });
  }

  Future<void> _openMap(dynamic lat, dynamic lng, String address) async {
    Uri url;
    if (lat != null && lng != null && lat.toString().isNotEmpty && lng.toString().isNotEmpty) {
      url = Uri.parse('https://www.google.com/maps/search/?api=1&query=$lat,$lng');
    } else {
      final encodedAddress = Uri.encodeComponent(address);
      url = Uri.parse('https://www.google.com/maps/search/?api=1&query=$encodedAddress');
    }

    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _makePhoneCall(String phoneNumber) async {
    if (phoneNumber.isEmpty) return;
    final Uri url = Uri.parse('tel:$phoneNumber');
    if (await canLaunchUrl(url)) {
      await launchUrl(url);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: navyDeep, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Partnered Garages',
          style: TextStyle(color: navyDeep, fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Header Search & Distance Filter Chips
            Container(
              color: Colors.white,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: Column(
                children: [
                  TextField(
                    onChanged: _filterGarages,
                    decoration: InputDecoration(
                      hintText: 'Search by garage name or city...',
                      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                      prefixIcon: const Icon(Icons.search_rounded, color: accentBlue, size: 22),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: const BorderSide(color: accentBlue, width: 1.5),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Distance Filter Chips Row
                  Row(
                    children: [
                      const Icon(Icons.near_me_outlined, size: 16, color: textGrey),
                      const SizedBox(width: 8),
                      const Text('Radius:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textGrey)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: _radiusOptions.map((opt) {
                              final isSelected = _selectedRadius == opt['value'];
                              return Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: ChoiceChip(
                                  label: Text(opt['label']),
                                  selected: isSelected,
                                  onSelected: (selected) {
                                    if (selected) {
                                      setState(() {
                                        _selectedRadius = opt['value'];
                                      });
                                      _fetchGarages();
                                    }
                                  },
                                  selectedColor: accentBlue,
                                  backgroundColor: const Color(0xFFF1F5F9),
                                  labelStyle: TextStyle(
                                    color: isSelected ? Colors.white : navyDeep,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                    fontSize: 12,
                                  ),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                    side: BorderSide(
                                      color: isSelected ? accentBlue : const Color(0xFFE2E8F0),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Content List
            Expanded(
              child: RefreshIndicator(
                onRefresh: _fetchGarages,
                color: accentBlue,
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: accentBlue))
                    : _filteredGarages.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _filteredGarages.length,
                  itemBuilder: (context, index) {
                    final garage = _filteredGarages[index];
                    return _buildGarageCard(garage);
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGarageCard(dynamic garage) {
    final name = garage['name'] ?? garage['businessName'] ?? 'Partner Garage';
    final role = garage['type'] ?? garage['role'] ?? 'Official Garage';
    final address = garage['address'] ?? garage['adress'] ?? 'Address not listed';
    final contactPerson = garage['contactPersonName'] ?? garage['fullName'] ?? '';
    final phone = garage['phone'] ?? '';
    final lat = garage['latitude'] ?? garage['Latitude'];
    final lng = garage['longitude'] ?? garage['Longitude'];
    final distanceKm = garage['distanceInKm'];

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: navyDeep.withOpacity(0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: accentEmerald.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.verified_outlined, color: accentEmerald, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: navyDeep,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              role,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: accentBlue),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: accentEmerald.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'Partnered',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: accentEmerald),
                      ),
                    ),
                    if (distanceKm != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        '${distanceKm.toString()} km away',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: textGrey),
                      ),
                    ],
                  ],
                ),
              ],
            ),

            const SizedBox(height: 12),
            const Divider(height: 1, color: Color(0xFFF1F5F9)),
            const SizedBox(height: 12),

            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.location_on_outlined, size: 18, color: textGrey),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    address,
                    style: const TextStyle(fontSize: 13, color: Color(0xFF334155), height: 1.3),
                  ),
                ),
              ],
            ),

            if (contactPerson.toString().isNotEmpty) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.person_outline_rounded, size: 18, color: textGrey),
                  const SizedBox(width: 8),
                  Text(
                    'Contact: $contactPerson',
                    style: const TextStyle(fontSize: 12, color: textGrey, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ],

            const SizedBox(height: 14),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      side: const BorderSide(color: Color(0xFFE2E8F0)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => _openMap(lat, lng, address),
                    icon: const Icon(Icons.map_outlined, size: 16, color: accentBlue),
                    label: const Text('Google Maps', style: TextStyle(color: accentBlue, fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ),
                if (phone.toString().isNotEmpty) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        elevation: 0,
                        backgroundColor: navyDeep,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => _makePhoneCall(phone.toString()),
                      icon: const Icon(Icons.call_outlined, size: 16, color: Colors.white),
                      label: const Text('Call Garage', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    final bool isRadiusFiltered = _selectedRadius != null;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      child: Container(
        height: MediaQuery.of(context).size.height * 0.55,
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: accentBlue.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(
                isRadiusFiltered ? Icons.location_off_outlined : Icons.store_mall_directory_outlined,
                size: 50,
                color: accentBlue.withOpacity(0.8),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              isRadiusFiltered ? 'No Garages Within ${_selectedRadius!.toInt()} km' : 'No Garages Found',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: navyDeep),
            ),
            const SizedBox(height: 8),
            Text(
              _searchQuery.isNotEmpty
                  ? 'No partnered garages matched "$_searchQuery".'
                  : isRadiusFiltered
                  ? 'We couldn\'t find any active V-Sense service centers within ${_selectedRadius!.toInt()} km of your location. Try expanding your search radius.'
                  : 'There are currently no active partnered service centers registered.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: textGrey, height: 1.4),
            ),
            if (isRadiusFiltered) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  setState(() => _selectedRadius = null);
                  _fetchGarages();
                },
                icon: const Icon(Icons.explore_outlined, color: Colors.white, size: 18),
                label: const Text('View All Registered Garages', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: navyDeep,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}