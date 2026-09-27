import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import '../../../core/config/env_config.dart';
import 'checkup_request_detail_screen.dart';

class RequestCheckupScreen extends StatefulWidget {
  const RequestCheckupScreen({super.key});

  @override
  State<RequestCheckupScreen> createState() => _RequestCheckupScreenState();
}

class _RequestCheckupScreenState extends State<RequestCheckupScreen>
    with SingleTickerProviderStateMixin {
  static const Color navyDeep = Color(0xFF0A1930);
  static const Color accentBlue = Color(0xFF2563EB);
  static const Color accentEmerald = Color(0xFF10B981);
  static const Color textGrey = Color(0xFF64748B);

  final _storage = const FlutterSecureStorage();
  late TabController _tabController;

  // ---- Wizard state ----
  int _currentStep = 0; // 0: vehicle, 1: garage, 2: schedule

  // Step 1 — Vehicles
  List<dynamic> _vehicles = [];
  bool _loadingVehicles = true;
  Map<String, dynamic>? _selectedVehicle;

  // Step 2 — Garages
  List<dynamic> _garages = [];
  List<dynamic> _filteredGarages = [];
  bool _loadingGarages = false;
  bool _garagesFetchedOnce = false;
  String _garageSearch = '';
  double? _selectedRadius = 20.0;
  Map<String, dynamic>? _selectedGarage;

  final List<Map<String, dynamic>> _radiusOptions = [
    {'label': '20 km', 'value': 20.0},
    {'label': '50 km', 'value': 50.0},
    {'label': '100 km', 'value': 100.0},
    {'label': 'All', 'value': null},
  ];

  // Step 3 — Schedule
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  final TextEditingController _messageController = TextEditingController();
  bool _submitting = false;

  // ---- My Requests tab state ----
  List<dynamic> _myRequests = [];
  bool _loadingRequests = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (_tabController.index == 1 && !_tabController.indexIsChanging) {
        _fetchMyRequests();
      }
      setState(() {}); // refresh segmented control highlight
    });
    _fetchVehicles();
    _fetchMyRequests();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  // ───────────────────────── Data fetching ─────────────────────────

  Future<Map<String, String>> _authHeaders() async {
    final token = await _storage.read(key: 'jwt_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<void> _fetchVehicles() async {
    setState(() => _loadingVehicles = true);
    try {
      final headers = await _authHeaders();
      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/vehicles/my-vehicles'),
        headers: headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        if (mounted) setState(() => _vehicles = data);
      }
    } catch (_) {
      // ignore, empty state will show
    } finally {
      if (mounted) setState(() => _loadingVehicles = false);
    }
  }

  Future<void> _fetchGarages() async {
    setState(() => _loadingGarages = true);

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
      // continue without location
    }

    try {
      final headers = await _authHeaders();
      List<String> queryParams = [];
      if (userLat != null && userLng != null) {
        queryParams.add('userLat=$userLat');
        queryParams.add('userLng=$userLng');
      }
      queryParams.add('radiusKm=${_selectedRadius != null ? _selectedRadius!.toInt() : 0}');

      final endpoint = '${EnvConfig.apiUrl}/Garages/partnered?${queryParams.join('&')}';
      final response = await http.get(Uri.parse(endpoint), headers: headers);

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _garages = data;
            _filteredGarages = _applyGarageSearch(data);
          });
        }
      }
    } catch (_) {
      // ignore, empty state will show
    } finally {
      if (mounted) setState(() => _loadingGarages = false);
    }
  }

  List<dynamic> _applyGarageSearch(List<dynamic> source) {
    if (_garageSearch.trim().isEmpty) return source;
    final q = _garageSearch.toLowerCase();
    return source.where((g) {
      final name = (g['name'] ?? g['businessName'] ?? '').toString().toLowerCase();
      final address = (g['address'] ?? g['adress'] ?? '').toString().toLowerCase();
      return name.contains(q) || address.contains(q);
    }).toList();
  }

  Future<void> _fetchMyRequests() async {
    setState(() => _loadingRequests = true);
    try {
      final headers = await _authHeaders();
      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/CheckupRequests/my-requests'),
        headers: headers,
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        if (mounted) setState(() => _myRequests = data);
      }
    } catch (_) {
      // ignore, empty state will show
    } finally {
      if (mounted) setState(() => _loadingRequests = false);
    }
  }

  Future<void> _submitRequest() async {
    if (_selectedVehicle == null || _selectedGarage == null || _selectedDate == null || _selectedTime == null) {
      return;
    }

    setState(() => _submitting = true);

    final requestedDate = DateTime(_selectedDate!.year, _selectedDate!.month, _selectedDate!.day);
    final requestedTime = DateTime(2000, 1, 1, _selectedTime!.hour, _selectedTime!.minute);

    try {
      final headers = await _authHeaders();
      final body = jsonEncode({
        'vehicleId': _selectedVehicle!['id'],
        'organizationId': _selectedGarage!['id'],
        'requestedDate': requestedDate.toIso8601String(),
        'requestedTime': requestedTime.toIso8601String(),
        'ownerMessage': _messageController.text.trim().isEmpty ? null : _messageController.text.trim(),
      });

      final response = await http.post(
        Uri.parse('${EnvConfig.apiUrl}/CheckupRequests'),
        headers: headers,
        body: body,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Checkup request submitted successfully.'),
              backgroundColor: accentEmerald,
            ),
          );
          _resetWizard();
          _tabController.animateTo(1);
          _fetchMyRequests();
        }
      } else {
        final data = jsonDecode(response.body);
        _showError(data['message'] ?? 'Could not submit your request. Please try again.');
      }
    } catch (_) {
      _showError('Something went wrong. Please check your connection and try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: const Color(0xFFEF4444)),
    );
  }

  void _resetWizard() {
    setState(() {
      _currentStep = 0;
      _selectedVehicle = null;
      _selectedGarage = null;
      _selectedDate = null;
      _selectedTime = null;
      _messageController.clear();
      _garagesFetchedOnce = false;
    });
  }

  // ───────────────────────── Navigation helpers ─────────────────────────

  void _goNext() {
    if (_currentStep == 0 && _selectedVehicle == null) return;
    if (_currentStep == 1 && _selectedGarage == null) return;

    if (_currentStep < 2) {
      setState(() => _currentStep += 1);
      if (_currentStep == 1 && !_garagesFetchedOnce) {
        _garagesFetchedOnce = true;
        _fetchGarages();
      }
    } else {
      _submitRequest();
    }
  }

  void _goBack() {
    if (_currentStep > 0) {
      setState(() => _currentStep -= 1);
    } else {
      Navigator.pop(context);
    }
  }

  bool get _canGoNext {
    if (_currentStep == 0) return _selectedVehicle != null;
    if (_currentStep == 1) return _selectedGarage != null;
    return _selectedDate != null && _selectedTime != null && !_submitting;
  }

  // ───────────────────────── Build ─────────────────────────

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
          'Request Checkup',
          style: TextStyle(color: navyDeep, fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            _buildSegmentedToggle(),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _buildNewRequestTab(),
                  _buildMyRequestsTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSegmentedToggle() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(14),
        ),
        padding: const EdgeInsets.all(4),
        child: Row(
          children: [
            Expanded(child: _segmentButton('New Request', 0)),
            Expanded(child: _segmentButton('My Requests', 1)),
          ],
        ),
      ),
    );
  }

  Widget _segmentButton(String label, int index) {
    final isActive = _tabController.index == index;
    return GestureDetector(
      onTap: () => _tabController.animateTo(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          boxShadow: isActive
              ? [BoxShadow(color: navyDeep.withOpacity(0.08), blurRadius: 8, offset: const Offset(0, 2))]
              : [],
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: isActive ? navyDeep : textGrey,
          ),
        ),
      ),
    );
  }

  // ───────────────────────── New Request tab ─────────────────────────

  Widget _buildNewRequestTab() {
    return Column(
      children: [
        _buildStepIndicator(),
        Expanded(
          child: IndexedStack(
            index: _currentStep,
            children: [
              _buildVehicleStep(),
              _buildGarageStep(),
              _buildScheduleStep(),
            ],
          ),
        ),
        _buildBottomBar(),
      ],
    );
  }

  Widget _buildStepIndicator() {
    final labels = ['Vehicle', 'Garage', 'Schedule'];
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
      child: Row(
        children: List.generate(3, (i) {
          final isActive = i <= _currentStep;
          return Expanded(
            child: Row(
              children: [
                Column(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: isActive ? accentBlue : const Color(0xFFE2E8F0),
                        shape: BoxShape.circle,
                      ),
                      child: i < _currentStep
                          ? const Icon(Icons.check_rounded, color: Colors.white, size: 16)
                          : Text(
                        '${i + 1}',
                        style: TextStyle(
                          color: isActive ? Colors.white : textGrey,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      labels[i],
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: isActive ? navyDeep : textGrey,
                      ),
                    ),
                  ],
                ),
                if (i < 2)
                  Expanded(
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 20),
                      height: 2,
                      color: i < _currentStep ? accentBlue : const Color(0xFFE2E8F0),
                    ),
                  ),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildBottomBar() {
    final isLastStep = _currentStep == 2;
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: navyDeep.withOpacity(0.06), blurRadius: 12, offset: const Offset(0, -4))],
      ),
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: _submitting ? null : _goBack,
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                side: const BorderSide(color: Color(0xFFE2E8F0)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: Text(_currentStep == 0 ? 'Cancel' : 'Back',
                  style: const TextStyle(color: navyDeep, fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: ElevatedButton(
              onPressed: _canGoNext ? _goNext : null,
              style: ElevatedButton.styleFrom(
                elevation: 0,
                backgroundColor: accentBlue,
                disabledBackgroundColor: const Color(0xFFCBD5E1),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _submitting
                  ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
              )
                  : Text(
                isLastStep ? 'Submit Request' : 'Next',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ---- Step 1: Vehicle ----

  Widget _buildVehicleStep() {
    if (_loadingVehicles) {
      return const Center(child: CircularProgressIndicator(color: accentBlue));
    }
    if (_vehicles.isEmpty) {
      return _emptyState(
        icon: Icons.directions_car_outlined,
        title: 'No Vehicles Linked',
        message: 'Link a vehicle to your garage first before requesting a checkup.',
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      itemCount: _vehicles.length,
      itemBuilder: (context, index) {
        final vehicle = _vehicles[index];
        final isSelected = _selectedVehicle != null && _selectedVehicle!['id'] == vehicle['id'];
        return GestureDetector(
          onTap: () => setState(() => _selectedVehicle = Map<String, dynamic>.from(vehicle)),
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: isSelected ? accentBlue : const Color(0xFFE2E8F0), width: isSelected ? 1.5 : 1),
              boxShadow: [BoxShadow(color: navyDeep.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 3))],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: accentBlue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.directions_car_rounded, color: accentBlue, size: 22),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(vehicle['registrationNumber']?.toString() ?? 'Vehicle',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: navyDeep)),
                      const SizedBox(height: 2),
                      Text(
                        '${vehicle['make'] ?? ''} ${vehicle['model'] ?? ''}'.trim().isEmpty
                            ? 'Details unavailable'
                            : '${vehicle['make'] ?? ''} ${vehicle['model'] ?? ''}',
                        style: const TextStyle(fontSize: 12, color: textGrey, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                ),
                Icon(
                  isSelected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
                  color: isSelected ? accentBlue : const Color(0xFFCBD5E1),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ---- Step 2: Garage ----

  Widget _buildGarageStep() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
          child: Column(
            children: [
              TextField(
                onChanged: (val) {
                  setState(() {
                    _garageSearch = val;
                    _filteredGarages = _applyGarageSearch(_garages);
                  });
                },
                decoration: InputDecoration(
                  hintText: 'Search garages...',
                  hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                  prefixIcon: const Icon(Icons.search_rounded, color: accentBlue, size: 20),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
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
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.near_me_outlined, size: 15, color: textGrey),
                  const SizedBox(width: 6),
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
                                  setState(() => _selectedRadius = opt['value']);
                                  _fetchGarages();
                                }
                              },
                              selectedColor: accentBlue,
                              backgroundColor: const Color(0xFFF1F5F9),
                              labelStyle: TextStyle(
                                color: isSelected ? Colors.white : navyDeep,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                fontSize: 11,
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                                side: BorderSide(color: isSelected ? accentBlue : const Color(0xFFE2E8F0)),
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
        Expanded(
          child: _loadingGarages
              ? const Center(child: CircularProgressIndicator(color: accentBlue))
              : _filteredGarages.isEmpty
              ? _emptyState(
            icon: Icons.store_mall_directory_outlined,
            title: 'No Garages Found',
            message: 'Try expanding your search radius or clearing the search.',
          )
              : ListView.builder(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            itemCount: _filteredGarages.length,
            itemBuilder: (context, index) => _buildGarageCard(_filteredGarages[index]),
          ),
        ),
      ],
    );
  }

  Widget _buildGarageCard(dynamic garage) {
    final name = garage['name'] ?? garage['businessName'] ?? 'Partner Garage';
    final address = garage['address'] ?? garage['adress'] ?? 'Address not listed';
    final distanceKm = garage['distanceInKm'];
    final isSelected = _selectedGarage != null && _selectedGarage!['id'] == garage['id'];

    return GestureDetector(
      onTap: () => setState(() => _selectedGarage = Map<String, dynamic>.from(garage)),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: isSelected ? accentBlue : const Color(0xFFE2E8F0), width: isSelected ? 1.5 : 1),
          boxShadow: [BoxShadow(color: navyDeep.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 3))],
        ),
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
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name.toString(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: navyDeep)),
                  const SizedBox(height: 2),
                  Text(address.toString(),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: textGrey, fontWeight: FontWeight.w500)),
                  if (distanceKm != null) ...[
                    const SizedBox(height: 2),
                    Text('${distanceKm.toString()} km away',
                        style: const TextStyle(fontSize: 11, color: accentBlue, fontWeight: FontWeight.w600)),
                  ],
                ],
              ),
            ),
            Icon(
              isSelected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded,
              color: isSelected ? accentBlue : const Color(0xFFCBD5E1),
            ),
          ],
        ),
      ),
    );
  }

  // ---- Step 3: Schedule ----

  Widget _buildScheduleStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: navyDeep,
              borderRadius: BorderRadius.circular(18),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.directions_car_rounded, color: Colors.white70, size: 16),
                    const SizedBox(width: 8),
                    Text(_selectedVehicle?['registrationNumber']?.toString() ?? '—',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.store_mall_directory_outlined, color: Colors.white70, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _selectedGarage?['name'] ?? _selectedGarage?['businessName'] ?? '—',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          const Text('Preferred Date', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navyDeep)),
          const SizedBox(height: 8),
          _pickerTile(
            icon: Icons.event_outlined,
            label: _selectedDate == null ? 'Select a date' : _formatDate(_selectedDate!),
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: DateTime.now().add(const Duration(days: 1)),
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 180)),
              );
              if (picked != null) setState(() => _selectedDate = picked);
            },
          ),
          const SizedBox(height: 18),

          const Text('Preferred Time', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navyDeep)),
          const SizedBox(height: 8),
          _pickerTile(
            icon: Icons.access_time_rounded,
            label: _selectedTime == null ? 'Select a time' : _selectedTime!.format(context),
            onTap: () async {
              final picked = await showTimePicker(
                context: context,
                initialTime: const TimeOfDay(hour: 9, minute: 0),
              );
              if (picked != null) setState(() => _selectedTime = picked);
            },
          ),
          const SizedBox(height: 18),

          const Text('Message (optional)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: navyDeep)),
          const SizedBox(height: 8),
          TextField(
            controller: _messageController,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'Anything the garage should know? e.g. "Brakes feel loose"',
              hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.all(14),
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
        ],
      ),
    );
  }

  Widget _pickerTile({required IconData icon, required String label, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          children: [
            Icon(icon, size: 18, color: accentBlue),
            const SizedBox(width: 12),
            Text(label, style: const TextStyle(fontSize: 13, color: navyDeep, fontWeight: FontWeight.w600)),
            const Spacer(),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime d) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${d.day} ${months[d.month - 1]} ${d.year}';
  }

  // ───────────────────────── My Requests tab ─────────────────────────

  Widget _buildMyRequestsTab() {
    if (_loadingRequests) {
      return const Center(child: CircularProgressIndicator(color: accentBlue));
    }
    if (_myRequests.isEmpty) {
      return _emptyState(
        icon: Icons.event_note_outlined,
        title: 'No Requests Yet',
        message: 'Once you request a checkup, it will show up here with its status.',
      );
    }
    return RefreshIndicator(
      onRefresh: _fetchMyRequests,
      color: accentBlue,
      child: ListView.builder(
        padding: const EdgeInsets.all(20),
        itemCount: _myRequests.length,
        itemBuilder: (context, index) => _buildRequestCard(_myRequests[index]),
      ),
    );
  }

  Widget _buildRequestCard(dynamic request) {
    final status = request['status'] as String?;
    final meta = _statusMeta(status);
    final vehicleReg = request['vehicleRegistrationNumber'] ?? 'Vehicle';
    final garageName = request['garageName'] ?? 'Garage';

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => CheckupRequestDetailScreen(request: Map<String, dynamic>.from(request)),
          ),
        ).then((_) => _fetchMyRequests());
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [BoxShadow(color: navyDeep.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 3))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(garageName.toString(),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: navyDeep)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: (meta['color'] as Color).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    meta['label'] as String,
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: meta['color'] as Color),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.directions_car_outlined, size: 14, color: textGrey),
                const SizedBox(width: 6),
                Text(vehicleReg.toString(), style: const TextStyle(fontSize: 12, color: textGrey, fontWeight: FontWeight.w600)),
                const SizedBox(width: 14),
                const Icon(Icons.event_outlined, size: 14, color: textGrey),
                const SizedBox(width: 6),
                Text(_formatIso(request['requestedDate'] as String?),
                    style: const TextStyle(fontSize: 12, color: textGrey, fontWeight: FontWeight.w600)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Map<String, dynamic> _statusMeta(String? status) {
    switch (status) {
      case 'Confirmed':
        return {'label': 'Confirmed', 'color': accentEmerald};
      case 'AlternativeSuggested':
        return {'label': 'Alternative Suggested', 'color': accentBlue};
      default:
        return {'label': 'Pending', 'color': const Color(0xFFD97706)};
    }
  }

  String _formatIso(String? iso) {
    if (iso == null) return '—';
    final d = DateTime.tryParse(iso);
    if (d == null) return '—';
    return _formatDate(d);
  }

  // ───────────────────────── Shared empty state ─────────────────────────

  Widget _emptyState({required IconData icon, required String title, required String message}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: accentBlue.withOpacity(0.08), shape: BoxShape.circle),
              child: Icon(icon, size: 44, color: accentBlue.withOpacity(0.8)),
            ),
            const SizedBox(height: 18),
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: navyDeep)),
            const SizedBox(height: 6),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: textGrey, height: 1.4)),
          ],
        ),
      ),
    );
  }
}