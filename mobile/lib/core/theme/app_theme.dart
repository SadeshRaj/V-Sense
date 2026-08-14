import 'package:flutter/material.dart';

class AppTheme {
  static ThemeData get lightTheme {
    const darkBlue = Color(0xFF0A1930);
    const pureWhite = Colors.white;

    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: const Color(0xFFF8F9FA),
      primaryColor: darkBlue,
      colorScheme: const ColorScheme.light(
        primary: darkBlue,
        secondary: Color(0xFF1E3A8A),
        surface: pureWhite,
      ),
      textTheme: const TextTheme(
        bodyLarge: TextStyle(color: darkBlue),
        bodyMedium: TextStyle(color: Color(0xFF4A5568)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: pureWhite,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: darkBlue, width: 1.5),
        ),
        labelStyle: const TextStyle(color: Color(0xFF718096)),
        prefixIconColor: const Color(0xFF718096),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: darkBlue,
          foregroundColor: pureWhite,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(vertical: 16),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1),
          elevation: 2,
        ),
      ),
    );
  }
}