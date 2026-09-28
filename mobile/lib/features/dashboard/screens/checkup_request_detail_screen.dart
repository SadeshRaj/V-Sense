import 'package:flutter/material.dart';

class CheckupRequestDetailScreen extends StatelessWidget {
  final Map<String, dynamic> request;

  const CheckupRequestDetailScreen({super.key, required this.request});

  static const Color navyDeep = Color(0xFF0A1930);
  static const Color accentBlue = Color(0xFF2563EB);
  static const Color textGrey = Color(0xFF64748B);

  Map<String, dynamic> _statusMeta(String? status) {
    switch (status) {
      case 'Confirmed':
        return {'label': 'Confirmed', 'color': const Color(0xFF10B981), 'icon': Icons.check_circle_outline_rounded};
      case 'AlternativeSuggested':
        return {'label': 'Alternative Suggested', 'color': accentBlue, 'icon': Icons.event_repeat_rounded};
      default:
        return {'label': 'Pending', 'color': const Color(0xFFD97706), 'icon': Icons.hourglass_top_rounded};
    }
  }

  String _formatDate(String? iso) {
    if (iso == null) return '—';
    final d = DateTime.tryParse(iso);
    if (d == null) return '—';
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${d.day} ${months[d.month - 1]} ${d.year}';
  }

  String _formatTime(String? iso) {
    if (iso == null) return '—';
    final d = DateTime.tryParse(iso);
    if (d == null) return '—';
    final hour = d.hour % 12 == 0 ? 12 : d.hour % 12;
    final period = d.hour >= 12 ? 'PM' : 'AM';
    final minute = d.minute.toString().padLeft(2, '0');
    return '$hour:$minute $period';
  }

  @override
  Widget build(BuildContext context) {
    final status = request['status'] as String?;
    final meta = _statusMeta(status);
    final vehicleReg = request['vehicleRegistrationNumber'] ?? 'Vehicle';
    final garageName = request['garageName'] ?? 'Garage';
    final ownerMessage = request['ownerMessage'] as String?;
    final garageResponse = request['garageResponse'] as String?;

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
          'Request Details',
          style: TextStyle(color: navyDeep, fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Status banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: (meta['color'] as Color).withOpacity(0.08),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: (meta['color'] as Color).withOpacity(0.25)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: (meta['color'] as Color).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(meta['icon'] as IconData, color: meta['color'] as Color, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            meta['label'] as String,
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: meta['color'] as Color),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            status == 'AlternativeSuggested'
                                ? 'The garage suggested a different time below'
                                : status == 'Confirmed'
                                ? 'Your checkup has been confirmed'
                                : 'Waiting for the garage to respond',
                            style: const TextStyle(fontSize: 12, color: textGrey),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              _sectionTitle('Vehicle & Garage'),
              const SizedBox(height: 10),
              _infoTile(Icons.directions_car_outlined, 'Vehicle', vehicleReg.toString()),
              const SizedBox(height: 10),
              _infoTile(Icons.store_mall_directory_outlined, 'Garage', garageName.toString()),

              const SizedBox(height: 24),
              _sectionTitle('Requested Schedule'),
              const SizedBox(height: 10),
              _infoTile(Icons.event_outlined, 'Date', _formatDate(request['requestedDate'] as String?)),
              const SizedBox(height: 10),
              _infoTile(Icons.access_time_rounded, 'Time', _formatTime(request['requestedTime'] as String?)),

              if (ownerMessage != null && ownerMessage.trim().isNotEmpty) ...[
                const SizedBox(height: 24),
                _sectionTitle('Your Message'),
                const SizedBox(height: 10),
                _messageCard(ownerMessage, const Color(0xFF334155), const Color(0xFFF1F5F9)),
              ],

              if (garageResponse != null && garageResponse.trim().isNotEmpty) ...[
                const SizedBox(height: 24),
                _sectionTitle('Garage Response'),
                const SizedBox(height: 10),
                _messageCard(garageResponse, accentBlue, accentBlue.withOpacity(0.06)),
              ],

              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: navyDeep, letterSpacing: 0.3),
    );
  }

  Widget _infoTile(IconData icon, String label, String value) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: accentBlue),
          const SizedBox(width: 12),
          Text(label, style: const TextStyle(fontSize: 13, color: textGrey, fontWeight: FontWeight.w500)),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(fontSize: 13, color: navyDeep, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _messageCard(String text, Color textColor, Color bgColor) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 13, color: textColor, height: 1.4, fontWeight: FontWeight.w500),
      ),
    );
  }
}