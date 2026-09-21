import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../core/config/env_config.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isOtpSent = false;
  bool _isPhoneVerified = false;
  bool _isLoading = false;
  bool _isOtpLoading = false;

  Future<void> _sendOtp() async {
    if (!RegExp(r'^07\d{8}$').hasMatch(_phoneController.text)) {
      _showError('Enter a valid 10-digit phone number starting with 07');
      return;
    }

    setState(() => _isOtpLoading = true);
    try {
      final response = await http.post(
        Uri.parse('${EnvConfig.apiUrl}/auth/forgot-password-otp'),
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
        Uri.parse('${EnvConfig.apiUrl}/auth/verify-forgot-password-otp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phoneNumber': _phoneController.text, 'otp': otp}),
      );

      if (response.statusCode == 200) {
        setState(() {
          _isPhoneVerified = true;
          _isOtpSent = false; // Hide OTP field
        });
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Phone Verified! You can now reset your password.'), backgroundColor: Colors.green, behavior: SnackBarBehavior.floating));
      } else {
        _showError(jsonDecode(response.body)['message'] ?? 'Invalid OTP');
      }
    } catch (e) {
      _showError('Connection error.');
    }
  }

  Future<void> _resetPassword() async {
    if (!_isPhoneVerified) {
      _showError('Please verify your phone number first.');
      return;
    }

    if (_passwordController.text.length < 6) {
      _showError('Password must be at least 6 characters');
      return;
    }

    setState(() => _isLoading = true);
    try {
      final response = await http.post(
        Uri.parse('${EnvConfig.apiUrl}/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phoneNumber': _phoneController.text,
          'newPassword': _passwordController.text
        }),
      );

      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password Reset Successful!'), backgroundColor: Colors.green, behavior: SnackBarBehavior.floating));
          Navigator.pop(context); // Send them back to Login Screen
        }
      } else {
        _showError(jsonDecode(response.body)['message'] ?? 'Reset failed');
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
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Reset Password', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFF0A1930))),
              const SizedBox(height: 8),
              const Text('Verify your phone number to update your password.', style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 32),

              TextField(
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
              ),

              if (_isOtpSent && !_isPhoneVerified) ...[
                const SizedBox(height: 16),
                TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  decoration: const InputDecoration(labelText: 'Enter 4-digit OTP'),
                  onChanged: (v) {
                    if (v.length == 4) _verifyOtp(v);
                  },
                ),
              ],

              if (_isPhoneVerified) ...[
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'New Password'),
                ),
                const SizedBox(height: 32),

                _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF0A1930)))
                    : ElevatedButton(onPressed: _resetPassword, child: const Text('RESET PASSWORD')),
              ],
            ],
          ),
        ),
      ),
    );
  }
}