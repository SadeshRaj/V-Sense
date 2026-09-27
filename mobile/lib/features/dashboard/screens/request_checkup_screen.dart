import 'package:flutter/material.dart';

/// TEMPORARY PLACEHOLDER
/// This will be replaced with the full 3-step Request Checkup wizard
/// (Select Vehicle -> Select Garage -> Schedule) plus the
/// "New Request" / "My Requests" tab toggle, in the next step.
class RequestCheckupScreen extends StatelessWidget {
  const RequestCheckupScreen({super.key});

  static const Color navyDeep = Color(0xFF0A1930);
  static const Color accentBlue = Color(0xFF2563EB);

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
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Text(
            'Coming soon: select your vehicle, choose a garage, and pick a date & time.',
            textAlign: TextAlign.center,
            style: TextStyle(color: accentBlue, fontWeight: FontWeight.w600, fontSize: 14),
          ),
        ),
      ),
    );
  }
}