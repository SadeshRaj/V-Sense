import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import '../../../core/config/env_config.dart';

class AddVehicleScreen extends StatefulWidget {
  const AddVehicleScreen({super.key});

  @override
  State<AddVehicleScreen> createState() => _AddVehicleScreenState();
}

class _AddVehicleScreenState extends State<AddVehicleScreen> {
  final _formKey = GlobalKey<FormState>();
  final _storage = const FlutterSecureStorage();
  final ImagePicker _picker = ImagePicker();

  // Loading state
  bool _isLoading = false;

  // Selected Image File
  File? _selectedImage;

  // Text Controllers
  final _regNumController = TextEditingController();
  final _vinController = TextEditingController();
  final _makeController = TextEditingController();
  final _modelController = TextEditingController();
  final _yearController = TextEditingController();
  final _engineNumController = TextEditingController();
  final _chassisNumController = TextEditingController();
  final _colorController = TextEditingController();

  // Dropdown selections
  String _fuelType = 'Hybrid';
  String _transmission = 'CVT';

  final List<String> _fuelOptions = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
  final List<String> _transmissionOptions = ['Automatic', 'Manual', 'CVT'];

  @override
  void dispose() {
    _regNumController.dispose();
    _vinController.dispose();
    _makeController.dispose();
    _modelController.dispose();
    _yearController.dispose();
    _engineNumController.dispose();
    _chassisNumController.dispose();
    _colorController.dispose();
    super.dispose();
  }

  // Pick Image from Gallery or Camera
  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1920,
      );

      if (pickedFile != null) {
        setState(() {
          _selectedImage = File(pickedFile.path);
        });
      }
    } catch (e) {
      _showSnackBar('Failed to pick image: $e', isError: true);
    }
  }

  // Upload Image to Backend (Cloudinary)
  Future<String?> _uploadImageToCloudinary(String token) async {
    if (_selectedImage == null) return null;

    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${EnvConfig.apiUrl}/Uploads/image'),
      );

      request.headers['Authorization'] = 'Bearer $token';

      request.files.add(
        await http.MultipartFile.fromPath('file', _selectedImage!.path),
      );

      final streamedResponse = await request.send().timeout(const Duration(seconds: 20));
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return data['url'] as String?;
      } else {
        _showSnackBar('Image upload failed with status ${response.statusCode}', isError: true);
        return null;
      }
    } catch (e) {
      _showSnackBar('Failed to upload image. Please try again.', isError: true);
      return null;
    }
  }

  // Form Submission
  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final token = await _storage.read(key: 'jwt_token');

      if (token == null) {
        if (mounted) {
          _showSnackBar('Session expired. Please log in again.', isError: true);
        }
        return;
      }

      // Step 1: Upload Image if selected
      String? imageUrl;
      if (_selectedImage != null) {
        imageUrl = await _uploadImageToCloudinary(token);
        if (imageUrl == null) {
          setState(() => _isLoading = false);
          return; // Stop execution if upload fails
        }
      }

      // Step 2: Build Vehicle Payload
      final payload = {
        'registrationNumber': _regNumController.text.trim(),
        'vin': _vinController.text.trim().isEmpty ? null : _vinController.text.trim(),
        'make': _makeController.text.trim().isEmpty ? null : _makeController.text.trim(),
        'model': _modelController.text.trim().isEmpty ? null : _modelController.text.trim(),
        'manufacturingYear': int.tryParse(_yearController.text.trim()),
        'engineNumber': _engineNumController.text.trim().isEmpty ? null : _engineNumController.text.trim(),
        'chassisNumber': _chassisNumController.text.trim().isEmpty ? null : _chassisNumController.text.trim(),
        'fuelType': _fuelType,
        'transmission': _transmission,
        'color': _colorController.text.trim().isEmpty ? null : _colorController.text.trim(),
        'imageUrl': imageUrl, // Saved Cloudinary URL
      };

      // Step 3: Register Vehicle
      final response = await http.post(
        Uri.parse('${EnvConfig.apiUrl}/vehicles'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(payload),
      ).timeout(const Duration(seconds: 10));

      if (response.statusCode == 201 || response.statusCode == 200) {
        if (mounted) {
          _showSnackBar('Vehicle Registered Successfully!');
          Navigator.pop(context, true);
        }
      } else {
        final errorData = jsonDecode(response.body);
        final errorMessage = errorData['message'] ?? 'Failed to register vehicle.';
        if (mounted) {
          _showSnackBar(errorMessage, isError: true);
        }
      }
    } catch (e) {
      if (mounted) {
        _showSnackBar('Connection error or timeout. Please check backend.', isError: true);
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red.shade600 : Colors.green.shade600,
      ),
    );
  }

  void _showImagePickerModal() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return SafeArea(
          child: Wrap(
            children: [
              ListTile(
                leading: const Icon(Icons.photo_library_rounded),
                title: const Text('Choose from Gallery'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.gallery);
                },
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt_rounded),
                title: const Text('Take a Photo'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.camera);
                },
              ),
            ],
          ),
        );
      },
    );
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
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: navyDeep, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Register Vehicle',
          style: TextStyle(color: navyDeep, fontWeight: FontWeight.bold, fontSize: 18),
        ),
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
                  'Vehicle Information',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: navyDeep),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Enter registration details as shown on your CR book.',
                  style: TextStyle(fontSize: 14, color: textGrey),
                ),
                const SizedBox(height: 24),

                // Image Selection Box
                Center(
                  child: GestureDetector(
                    onTap: _showImagePickerModal,
                    child: Container(
                      width: double.infinity,
                      height: 160,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade300),
                        image: _selectedImage != null
                            ? DecorationImage(
                          image: FileImage(_selectedImage!),
                          fit: BoxFit.cover,
                        )
                            : null,
                      ),
                      child: _selectedImage == null
                          ? Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.add_a_photo_rounded, size: 36, color: accentBlue),
                          SizedBox(height: 8),
                          Text(
                            'Upload Vehicle Photo',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: navyDeep),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'PNG, JPG up to 10MB',
                            style: TextStyle(fontSize: 12, color: textGrey),
                          ),
                        ],
                      )
                          : Stack(
                        children: [
                          Positioned(
                            top: 8,
                            right: 8,
                            child: GestureDetector(
                              onTap: () => setState(() => _selectedImage = null),
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: const BoxDecoration(
                                  color: Colors.black54,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close, color: Colors.white, size: 18),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Registration & VIN
                _buildTextField('Registration Number *', _regNumController, 'e.g. WP CBA-1234', required: true),
                _buildTextField('VIN', _vinController, 'e.g. JTDKN3DU5F0435678'),

                // Make & Model Row
                Row(
                  children: [
                    Expanded(child: _buildTextField('Company', _makeController, 'e.g. Toyota')),
                    const SizedBox(width: 12),
                    Expanded(child: _buildTextField('Model', _modelController, 'e.g. Prius')),
                  ],
                ),

                // Manufacturing Year & Color
                Row(
                  children: [
                    Expanded(child: _buildTextField('Manufacturing Year', _yearController, 'e.g. 2020', isNumber: true)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildTextField('Color', _colorController, 'e.g. White')),
                  ],
                ),

                // Engine & Chassis
                _buildTextField('Engine Number', _engineNumController, 'e.g. 2ZR-123456'),
                _buildTextField('Chassis Number', _chassisNumController, 'e.g. JTDKN3DU5F0435678'),

                // Dropdowns Row
                Row(
                  children: [
                    Expanded(
                      child: _buildDropdown('Fuel Type', _fuelType, _fuelOptions, (val) {
                        if (val != null) setState(() => _fuelType = val);
                      }),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildDropdown('Gearbox Type', _transmission, _transmissionOptions, (val) {
                        if (val != null) setState(() => _transmission = val);
                      }),
                    ),
                  ],
                ),

                const SizedBox(height: 32),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _submitForm,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: accentBlue,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 2,
                    ),
                    child: _isLoading
                        ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                    )
                        : const Text(
                      'Save Vehicle',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(
      String label,
      TextEditingController controller,
      String hint, {
        bool required = false,
        bool isNumber = false,
      }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0A1930))),
          const SizedBox(height: 6),
          TextFormField(
            controller: controller,
            keyboardType: isNumber ? TextInputType.number : TextInputType.text,
            validator: (value) {
              if (required && (value == null || value.trim().isEmpty)) {
                return 'This field is required';
              }
              return null;
            },
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDropdown(String label, String value, List<String> items, ValueChanged<String?> onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0A1930))),
          const SizedBox(height: 6),
          DropdownButtonFormField<String>(
            value: value,
            onChanged: onChanged,
            items: items.map((item) => DropdownMenuItem(value: item, child: Text(item, style: const TextStyle(fontSize: 14)))).toList(),
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
            ),
          ),
        ],
      ),
    );
  }
}