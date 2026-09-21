import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/config/env_config.dart';

class NotificationService {
  final _storage = const FlutterSecureStorage();

  Future<List<dynamic>> getMyNotifications() async {
    final token = await _storage.read(key: 'jwt_token');
    if (token == null) return [];

    final response = await http.get(
      Uri.parse('${EnvConfig.apiUrl}/notifications/my-notifications'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    return [];
  }

  Future<int> getUnreadCount() async {
    final token = await _storage.read(key: 'jwt_token');
    if (token == null) return 0;

    final response = await http.get(
      Uri.parse('${EnvConfig.apiUrl}/notifications/unread-count'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['count'] ?? 0;
    }
    return 0;
  }

  Future<void> markAsRead(String id) async {
    final token = await _storage.read(key: 'jwt_token');
    if (token == null) return;

    await http.patch(
      Uri.parse('${EnvConfig.apiUrl}/notifications/$id/read'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    );
  }
}

