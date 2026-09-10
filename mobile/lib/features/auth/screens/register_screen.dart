import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/config/env_config.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _nicController = TextEditingController();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isLoading = false;
  bool _isOtpLoading = false;
  bool _isOtpSent = false;
  bool _isPhoneVerified = false;

  Future<void> _sendOtp() async {
    if (!RegExp(r'^07\d{8}$').hasMatch(_phoneController.text)) {
      _showError('Enter a valid 10-digit phone number starting with 07');
      return;
    }

    setState(() => _isOtpLoading = true);
    try {
      final response = await http.post(
        Uri.parse('${EnvConfig.apiUrl}/auth/send-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phoneNumber': _phoneController.text}),
      );

      if (response.statusCode == 200) {
        setState(() => _isOtpSent = true);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('OTP Sent!'), backgroundColor: Colors.green, behavior: SnackBarBehavior.floating));
      } else {
        _showError(jsonDecode(response.body)['message'] ?? 'Failed to send OTP');
      }
    } catch (e) {
      _showError('Connection error.');
    } finally {
      setState(() => _isOtpLoading = false);
    }
  }

  Future<void> _verifyOtp(String otp) async {
    try {
      final response = await http.post(
        Uri.parse('${EnvConfig.apiUrl}/auth/verify-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phoneNumber': _phoneController.text, 'otp': otp}),
      );

      if (response.statusCode == 200) {
        setState(() {
          _isPhoneVerified = true;
          _isOtpSent = false; // Hide OTP field
        });
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Phone Verified!'), backgroundColor: Colors.green, behavior: SnackBarBehavior.floating));
      } else {
        _showError(jsonDecode(response.body)['message'] ?? 'Invalid OTP');
      }
    } catch (e) {
      _showError('Connection error.');
    }
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_isPhoneVerified) {
      _showError('Please verify your phone number first.');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final response = await http.post(
        Uri.parse('${EnvConfig.apiUrl}/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'fullName': _nameController.text,
          'nic': _nicController.text,
          'phoneNumber': _phoneController.text,
          'email': _emailController.text,
          'password': _passwordController.text,
        }),
      );

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Registration Successful!'), backgroundColor: Colors.green, behavior: SnackBarBehavior.floating));
          Navigator.pop(context);
        }
      } else {
        _showError(jsonDecode(response.body)['message'] ?? 'Registration failed');
      }
    } catch (e) {
      _showError('Connection error.');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), backgroundColor: Colors.redAccent, behavior: SnackBarBehavior.floating));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0A1930)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 32.0, vertical: 16.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Join V-Sense', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFF0A1930))),
                const SizedBox(height: 8),
                const Text('Register for your verified digital certificates.', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 32),
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Full Name'),
                  validator: (v) => v!.isEmpty ? 'Name is required' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _nicController,
                  decoration: const InputDecoration(labelText: 'National Identity Card (NIC)'),
                  validator: (v) => v!.isEmpty ? 'NIC is required' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  enabled: !_isPhoneVerified,
                  onChanged: (v) => setState(() {}),
                  decoration: InputDecoration(
                    labelText: 'Phone Number (07XXXXXXXX)',
                    suffixIcon: _isPhoneVerified
                        ? const Icon(Icons.check_circle, color: Colors.green)
                        : (_phoneController.text.length == 10)
                            ? TextButton(
                                onPressed: _isOtpLoading ? null : _sendOtp,
                                child: _isOtpLoading
                                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                  : Text(_isOtpSent ? 'Resend' : 'Get OTP'),
                              )
                            : null,
                  ),
                  validator: (v) {
                    if (v == null || v.isEmpty) return 'Phone is required';
                    if (!RegExp(r'^07\d{8}$').hasMatch(v)) return 'Must be 10 digits starting with 07';
                    return null;
                  },
                ),
                if (_isOtpSent && !_isPhoneVerified) ...[
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _otpController,
                    keyboardType: TextInputType.number,
                    maxLength: 4,
                    decoration: const InputDecoration(labelText: 'Enter 4-digit OTP'),
                    onChanged: (v) {
                      if (v.length == 4) _verifyOtp(v);
                    },
                  ),
                ],
                const SizedBox(height: 16),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email Address'),
                  validator: (v) => v!.contains('@') ? null : 'Enter a valid email',
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Password'),
                  validator: (v) => v!.length < 6 ? 'Minimum 6 characters' : null,
                ),
                const SizedBox(height: 32),
                _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF0A1930)))
                    : ElevatedButton(
                        onPressed: _isPhoneVerified ? _register : null,
                        child: const Text('REGISTER')
                      ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}