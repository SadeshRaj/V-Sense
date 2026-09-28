import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/config/env_config.dart';
import '../../dashboard/screens/dashboard_screen.dart'; // Unified Client Dashboard
import 'register_screen.dart';
import 'ForgotPasswordScreen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _storage = const FlutterSecureStorage();
  bool _isLoading = false;
  bool _obscurePassword = true;

  // "Save my login" — persists email + a flag so biometric / auto-fill can use it
  bool _saveLogin = false;

  @override
  void initState() {
    super.initState();
    _loadSavedCredentials();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  /// Pre-fill the email field if the user had previously saved their login.
  Future<void> _loadSavedCredentials() async {
    try {
      final savedEmail = await _storage.read(key: 'saved_email');
      if (savedEmail != null && savedEmail.isNotEmpty) {
        setState(() {
          _emailController.text = savedEmail;
          _saveLogin = true; // mirror the checkbox state
        });
      }
    } catch (_) {}
  }

  Future<void> _login() async {
    setState(() => _isLoading = true);
    try {
      final response = await http.post(
        Uri.parse('${EnvConfig.apiUrl}/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': _emailController.text,
          'password': _passwordController.text,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        // Save JWT and User Name securely
        await _storage.write(key: 'jwt_token', value: data['token']);
        await _storage.write(key: 'user_name', value: data['fullName']);
        await _storage.write(key: 'user_id', value: data['id'].toString());

        // Persist (or clear) the saved-login email based on the checkbox
        if (_saveLogin) {
          await _storage.write(key: 'saved_email', value: _emailController.text.trim());
        } else {
          await _storage.delete(key: 'saved_email');
          // Also disable biometric if the user chose not to save login
          final prefs = await SharedPreferences.getInstance();
          await prefs.setBool('biometric_enabled', false);
        }

        if (mounted) {
          // Direct navigation to the unified Dashboard
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const DashboardScreen()),
          );
        }
      } else {
        final error = jsonDecode(response.body)['message'] ?? 'Login failed';
        _showError(error);
      }
    } catch (e) {
      _showError('Connection error. Please check your network.');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.redAccent,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const navyDeep = Color(0xFF0A1930);
    const accentBlue = Color(0xFF2563EB);
    const textGrey = Color(0xFF64748B);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF0A1930)),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [

                // Logo
                Image.asset(
                  'assets/logo_L2.png',
                  height: 300,
                  errorBuilder: (context, error, stackTrace) {
                    return const Icon(Icons.verified_user_outlined, size: 72, color: Color(0xFF1E3A8A));
                  },
                ),

                const SizedBox(height: 48),

                // Email field
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email Address',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                ),
                const SizedBox(height: 16),

                // Password field with show/hide toggle
                TextField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                        color: textGrey,
                        size: 20,
                      ),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                ),

                // Forgot password
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
                    ),
                    child: const Text('Forgot Password?', style: TextStyle(color: Colors.grey)),
                  ),
                ),

                // ── Save Login checkbox ──────────────────────────────────────
                Container(
                  decoration: BoxDecoration(
                    color: accentBlue.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _saveLogin ? accentBlue.withOpacity(0.3) : const Color(0xFFE2E8F0),
                      width: 1.5,
                    ),
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => setState(() => _saveLogin = !_saveLogin),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 20,
                            height: 20,
                            child: Checkbox(
                              value: _saveLogin,
                              activeColor: accentBlue,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              onChanged: (val) => setState(() => _saveLogin = val ?? false),
                            ),
                          ),
                          const SizedBox(width: 10),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Save my login',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: navyDeep,
                                  ),
                                ),
                                Text(
                                  'Skip this screen automatically next time',
                                  style: TextStyle(fontSize: 11, color: textGrey),
                                ),
                              ],
                            ),
                          ),
                          Icon(
                            Icons.shield_outlined,
                            size: 18,
                            color: _saveLogin ? accentBlue : textGrey,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                // ────────────────────────────────────────────────────────────

                const SizedBox(height: 20),

                // Sign In button
                _isLoading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF0A1930)))
                    : ElevatedButton(onPressed: _login, child: const Text('SIGN IN')),

                const SizedBox(height: 16),

                // Create account link
                TextButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const RegisterScreen()),
                  ),
                  child: const Text(
                    'Create an Account',
                    style: TextStyle(color: Color(0xFF1E3A8A), fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}