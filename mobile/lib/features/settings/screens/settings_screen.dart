import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:image_cropper/image_cropper.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/config/env_config.dart';
import '../../auth/screens/login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const Color backgroundLight = Color(0xFFF8FAFC);
  static const Color navyDeep = Color(0xFF0A1930);
  static const Color accentBlue = Color(0xFF2563EB);
  static const Color textGrey = Color(0xFF64748B);
  static const Color dangerRed = Color(0xFFEF4444);

  final _storage = const FlutterSecureStorage();
  final _picker = ImagePicker();
  final _formKey = GlobalKey<FormState>();

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();

  // Snapshot of the loaded values, used to restore the form on Cancel.
  String _originalName = '';
  String _originalEmail = '';
  String _originalPhone = '';

  String? _nic;
  String _role = 'Client';
  DateTime? _memberSince;

  File? _pickedImage;
  String? _profilePictureUrl;

  bool _isLoading = true;
  bool _isEditing = false;
  bool _isSaving = false;
  bool _isUploadingPhoto = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    try {
      final token = await _storage.read(key: 'jwt_token');
      if (token == null) {
        setState(() => _isLoading = false);
        return;
      }

      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/users/me'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _originalName = data['fullName'] ?? '';
        _originalEmail = data['email'] ?? '';
        _originalPhone = data['phoneNumber'] ?? '';
        _nic = data['nic'];
        _role = data['role'] ?? 'Client';
        _profilePictureUrl = data['profilePictureUrl'];
        if (data['createdAt'] != null) {
          _memberSince = DateTime.tryParse(data['createdAt']);
        }

        _nameController.text = _originalName;
        _emailController.text = _originalEmail;
        _phoneController.text = _originalPhone;
      } else {
        if (mounted) _showSnackBar('Could not load your profile.', isError: true);
      }
    } catch (e) {
      if (mounted) {
        _showSnackBar('Could not load your profile. Check your connection and try again.', isError: true);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _enterEditMode() {
    setState(() => _isEditing = true);
  }

  void _cancelEdit() {
    setState(() {
      _nameController.text = _originalName;
      _emailController.text = _originalEmail;
      _phoneController.text = _originalPhone;
      _pickedImage = null;
      _isEditing = false;
    });
  }

  void _showImageSourceSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.photo_camera_outlined, color: accentBlue),
                  title: const Text('Take a photo', style: TextStyle(fontWeight: FontWeight.w600)),
                  onTap: () {
                    Navigator.pop(context);
                    _pickAndCropImage(ImageSource.camera);
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.photo_library_outlined, color: accentBlue),
                  title: const Text('Choose from gallery', style: TextStyle(fontWeight: FontWeight.w600)),
                  onTap: () {
                    Navigator.pop(context);
                    _pickAndCropImage(ImageSource.gallery);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _pickAndCropImage(ImageSource source) async {
    try {
      final XFile? file = await _picker.pickImage(
        source: source,
        maxWidth: 1600,
        imageQuality: 90,
      );
      if (file == null) return;

      final croppedFile = await ImageCropper().cropImage(
        sourcePath: file.path,
        aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
        compressQuality: 90,
        uiSettings: [
          AndroidUiSettings(
            toolbarTitle: 'Crop Photo',
            toolbarColor: navyDeep,
            toolbarWidgetColor: Colors.white,
            activeControlsWidgetColor: accentBlue,
            initAspectRatio: CropAspectRatioPreset.square,
            lockAspectRatio: true,
            cropStyle: CropStyle.circle,
            hideBottomControls: false,
          ),
          IOSUiSettings(
            title: 'Crop Photo',
            aspectRatioLockEnabled: true,
            resetAspectRatioEnabled: false,
            cropStyle: CropStyle.circle,
          ),
        ],
      );

      if (croppedFile != null) {
        setState(() => _pickedImage = File(croppedFile.path));
      }
    } catch (e) {
      _showSnackBar('Could not process that photo. Please try another.', isError: true);
    }
  }

  // Uploads the cropped photo to the generic image endpoint and returns
  // its Cloudinary URL. Returns the existing URL unchanged if no new photo
  // was picked.
  Future<String?> _uploadPickedImage(String token) async {
    if (_pickedImage == null) return _profilePictureUrl;

    setState(() => _isUploadingPhoto = true);
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${EnvConfig.apiUrl}/uploads/image'),
      );
      request.headers['Authorization'] = 'Bearer $token';
      request.files.add(await http.MultipartFile.fromPath('file', _pickedImage!.path));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['url'] as String?;
      }
      final message = _extractErrorMessage(response.body) ?? 'Photo upload failed.';
      throw Exception(message);
    } finally {
      if (mounted) setState(() => _isUploadingPhoto = false);
    }
  }

  Future<void> _saveChanges() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    try {
      final token = await _storage.read(key: 'jwt_token');
      if (token == null) {
        _showSnackBar('Your session expired. Please log in again.', isError: true);
        return;
      }

      String? uploadedUrl;
      try {
        uploadedUrl = await _uploadPickedImage(token);
      } catch (e) {
        _showSnackBar(e.toString().replaceFirst('Exception: ', ''), isError: true);
        return;
      }

      final response = await http.put(
        Uri.parse('${EnvConfig.apiUrl}/users/me'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'fullName': _nameController.text.trim(),
          'email': _emailController.text.trim(),
          'phoneNumber': _phoneController.text.trim(),
          'profilePictureUrl': uploadedUrl,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _originalName = data['fullName'] ?? _nameController.text.trim();
          _originalEmail = data['email'] ?? _emailController.text.trim();
          _originalPhone = data['phoneNumber'] ?? _phoneController.text.trim();
          _profilePictureUrl = data['profilePictureUrl'];
          _pickedImage = null;
          _isEditing = false;
        });
        await _storage.write(key: 'user_name', value: _originalName);
        if (mounted) _showSnackBar('Your profile has been updated.');
      } else {
        final message = _extractErrorMessage(response.body) ?? 'Could not save your changes.';
        _showSnackBar(message, isError: true);
      }
    } catch (e) {
      _showSnackBar('Something went wrong. Please check your connection and try again.', isError: true);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  String? _extractErrorMessage(String body) {
    try {
      final data = jsonDecode(body);
      return data['message'] ?? data['title'];
    } catch (_) {
      return null;
    }
  }

  Future<void> _confirmLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Log out?', style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text('You\'ll need to sign in again to access your account.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel', style: TextStyle(color: textGrey, fontWeight: FontWeight.w600)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Log Out', style: TextStyle(color: dangerRed, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _storage.deleteAll();
      if (mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const LoginScreen()),
              (route) => false,
        );
      }
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(fontWeight: FontWeight.w600)),
        backgroundColor: isError ? dangerRed : navyDeep,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundLight,
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: accentBlue))
            : RefreshIndicator(
          color: accentBlue,
          onRefresh: _loadProfile,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      InkWell(
                        onTap: () => Navigator.pop(context),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: navyDeep.withOpacity(0.06),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: navyDeep),
                        ),
                      ),
                      const SizedBox(width: 16),
                      const Text(
                        'Settings',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: navyDeep,
                          letterSpacing: -0.3,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // Profile picture
                  Center(
                    child: Stack(
                      children: [
                        Container(
                          width: 104,
                          height: 104,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 4),
                            boxShadow: [
                              BoxShadow(
                                color: navyDeep.withOpacity(0.12),
                                blurRadius: 16,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: ClipOval(
                            child: _isUploadingPhoto
                                ? Container(
                              color: accentBlue.withOpacity(0.1),
                              child: const Center(
                                child: CircularProgressIndicator(color: accentBlue, strokeWidth: 2.5),
                              ),
                            )
                                : _buildAvatarImage(),
                          ),
                        ),
                        if (_isEditing)
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: InkWell(
                              onTap: _showImageSourceSheet,
                              borderRadius: BorderRadius.circular(20),
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: accentBlue,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 3),
                                ),
                                child: const Icon(Icons.camera_alt_rounded, size: 16, color: Colors.white),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  if (_isEditing) ...[
                    const SizedBox(height: 8),
                    Center(
                      child: TextButton(
                        onPressed: _showImageSourceSheet,
                        child: const Text(
                          'Change photo',
                          style: TextStyle(color: accentBlue, fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                      ),
                    ),
                  ] else
                    const SizedBox(height: 16),
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: accentBlue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '${_role.toUpperCase()} ACCOUNT',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: accentBlue),
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Personal information card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5),
                      boxShadow: [
                        BoxShadow(
                          color: navyDeep.withOpacity(0.04),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Personal Information',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: navyDeep),
                            ),
                            if (!_isEditing)
                              InkWell(
                                onTap: _enterEditMode,
                                borderRadius: BorderRadius.circular(10),
                                child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: accentBlue.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.edit_outlined, size: 18, color: accentBlue),
                                ),
                              )
                            else
                              InkWell(
                                onTap: _isSaving ? null : _cancelEdit,
                                borderRadius: BorderRadius.circular(10),
                                child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(Icons.close_rounded, size: 18, color: textGrey),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _buildLabel('Full Name'),
                        _isEditing
                            ? _buildTextField(
                          controller: _nameController,
                          hint: 'Enter your full name',
                          icon: Icons.person_outline_rounded,
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Please enter your name';
                            }
                            return null;
                          },
                        )
                            : _buildReadOnlyRow(_originalName, Icons.person_outline_rounded),
                        const SizedBox(height: 16),
                        _buildLabel('Email Address'),
                        _isEditing
                            ? _buildTextField(
                          controller: _emailController,
                          hint: 'Enter your email',
                          icon: Icons.email_outlined,
                          keyboardType: TextInputType.emailAddress,
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Please enter your email';
                            }
                            final emailPattern = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
                            if (!emailPattern.hasMatch(value.trim())) {
                              return 'Enter a valid email address';
                            }
                            return null;
                          },
                        )
                            : _buildReadOnlyRow(_originalEmail, Icons.email_outlined),
                        const SizedBox(height: 16),
                        _buildLabel('Phone Number'),
                        _isEditing
                            ? _buildTextField(
                          controller: _phoneController,
                          hint: 'Enter your phone number',
                          icon: Icons.phone_outlined,
                          keyboardType: TextInputType.phone,
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Please enter your phone number';
                            }
                            final phonePattern = RegExp(r'^0[0-9]{9}$');
                            if (!phonePattern.hasMatch(value.trim())) {
                              return 'Enter a valid 10-digit phone number';
                            }
                            return null;
                          },
                        )
                            : _buildReadOnlyRow(_originalPhone, Icons.phone_outlined),
                      ],
                    ),
                  ),

                  if (_isEditing) ...[
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _isSaving ? null : _cancelEdit,
                            style: OutlinedButton.styleFrom(
                              foregroundColor: textGrey,
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            ),
                            child: const Text('Cancel', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton(
                            onPressed: (_isSaving || _isUploadingPhoto) ? null : _saveChanges,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: accentBlue,
                              disabledBackgroundColor: accentBlue.withOpacity(0.5),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              elevation: 0,
                            ),
                            child: (_isSaving || _isUploadingPhoto)
                                ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                            )
                                : const Text(
                              'Save Changes',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],

                  const SizedBox(height: 20),

                  // Account details (read-only, always)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Account Details',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: navyDeep),
                        ),
                        const SizedBox(height: 16),
                        _buildLabel('NIC'),
                        _buildReadOnlyRow(
                          (_nic == null || _nic!.isEmpty) ? 'Not provided' : _nic!,
                          Icons.badge_outlined,
                        ),
                        if (_memberSince != null) ...[
                          const SizedBox(height: 16),
                          _buildLabel('Member Since'),
                          _buildReadOnlyRow(_formatDate(_memberSince!), Icons.calendar_today_outlined),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Logout
                  InkWell(
                    onTap: _confirmLogout,
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.logout_rounded, color: dangerRed, size: 22),
                          ),
                          const SizedBox(width: 16),
                          const Text(
                            'Log Out',
                            style: TextStyle(color: Color(0xFF991B1B), fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                          const Spacer(),
                          const Icon(Icons.chevron_right, color: dangerRed),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[date.month - 1]} ${date.year}';
  }

  Widget _buildAvatarImage() {
    if (_pickedImage != null) {
      return Image.file(_pickedImage!, fit: BoxFit.cover);
    }
    if (_profilePictureUrl != null && _profilePictureUrl!.isNotEmpty) {
      return Image.network(
        _profilePictureUrl!,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => _buildAvatarPlaceholder(),
      );
    }
    return _buildAvatarPlaceholder();
  }

  Widget _buildAvatarPlaceholder() {
    return Container(
      color: accentBlue.withOpacity(0.1),
      child: const Icon(Icons.person_rounded, size: 48, color: accentBlue),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: textGrey),
      ),
    );
  }

  // Read-only display for view mode — same shape as the editable field so
  // nothing shifts visually when toggling edit mode.
  Widget _buildReadOnlyRow(String value, IconData icon) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: textGrey),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value.isEmpty ? '—' : value,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: navyDeep),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      validator: validator,
      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: navyDeep),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(fontSize: 14, color: Color(0xFFCBD5E1), fontWeight: FontWeight.w500),
        prefixIcon: Icon(icon, size: 20, color: textGrey),
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFFF1F5F9), width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: accentBlue, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: dangerRed, width: 1.5),
        ),
      ),
    );
  }
}