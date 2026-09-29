import 'package:flutter/material.dart';
import '../services/notification_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final NotificationService _notificationService = NotificationService();
  List<dynamic> _notifications = [];
  bool _isLoading = true;
  String _selectedCategory = 'All';

  // Category definitions matching backend categories
  final List<Map<String, dynamic>> _categories = [
    {'label': 'All', 'icon': Icons.all_inbox_rounded},
    {'label': 'Promotional', 'icon': Icons.campaign_rounded},
    {'label': 'Reminder', 'icon': Icons.alarm_rounded},
    {'label': 'Urgent', 'icon': Icons.warning_amber_rounded},
    {'label': 'System', 'icon': Icons.info_outline_rounded},
  ];

  static const Color navyDeep = Color(0xFF0A1930);
  static const Color backgroundLight = Color(0xFFF8FAFC);

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    try {
      final notifications = await _notificationService.getMyNotifications();

      if (mounted) {
        setState(() {
          _notifications = notifications;
          _isLoading = false;
        });
      }

      // Mark unread notifications as read
      for (var notification in _notifications) {
        final isRead = notification['isRead'] ?? false;
        if (!isRead && notification['id'] != null) {
          _notificationService.markAsRead(notification['id'].toString());
        }
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _markAsRead(dynamic notification) async {
    if (notification['isRead'] == true) return;

    setState(() {
      notification['isRead'] = true;
    });

    if (notification['id'] != null) {
      await _notificationService.markAsRead(notification['id'].toString());
    }
  }

  // Filter notifications according to the selected chip
  List<dynamic> get _filteredNotifications {
    if (_selectedCategory == 'All') {
      return _notifications;
    }
    return _notifications.where((n) {
      final category = (n['category'] ?? 'System').toString().toLowerCase();
      return category == _selectedCategory.toLowerCase();
    }).toList();
  }

  int _getCategoryCount(String categoryLabel) {
    if (categoryLabel == 'All') return _notifications.length;
    return _notifications.where((n) {
      final cat = (n['category'] ?? 'System').toString().toLowerCase();
      return cat == categoryLabel.toLowerCase();
    }).length;
  }

  // Category aesthetic mappings (Colors & Icons)
  Map<String, dynamic> _getCategoryStyle(String? rawCategory) {
    final cat = (rawCategory ?? 'System').toLowerCase();
    switch (cat) {
      case 'promotional':
        return {
          'color': const Color(0xFFFF3366),
          'bgColor': const Color(0xFFFFF0F3),
          'icon': Icons.local_offer_rounded,
          'label': 'Promotion',
        };
      case 'urgent':
        return {
          'color': const Color(0xFFEF4444),
          'bgColor': const Color(0xFFFEF2F2),
          'icon': Icons.error_rounded,
          'label': 'Urgent',
        };
      case 'reminder':
        return {
          'color': const Color(0xFFF59E0B),
          'bgColor': const Color(0xFFFFFBEB),
          'icon': Icons.notifications_active_rounded,
          'label': 'Reminder',
        };
      case 'system':
      default:
        return {
          'color': const Color(0xFF2563EB),
          'bgColor': const Color(0xFFEFF6FF),
          'icon': Icons.shield_rounded,
          'label': 'System',
        };
    }
  }

  String _formatDateTime(dynamic dateStr) {
    if (dateStr == null) return '';
    try {
      final raw = dateStr.toString();
      final safeStr = raw.endsWith('Z') ? raw : '${raw}Z';
      final dt = DateTime.tryParse(safeStr)?.toLocal();
      if (dt == null) return '';

      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final itemDay = DateTime(dt.year, dt.month, dt.day);

      final hourStr = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final minuteStr = dt.minute.toString().padLeft(2, '0');
      final period = dt.hour >= 12 ? 'PM' : 'AM';
      final timeFormatted = '$hourStr:$minuteStr $period';

      if (itemDay == today) {
        return 'Today • $timeFormatted';
      } else if (itemDay == today.subtract(const Duration(days: 1))) {
        return 'Yesterday • $timeFormatted';
      } else {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
      }
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredList = _filteredNotifications;

    return Scaffold(
      backgroundColor: backgroundLight,
      appBar: AppBar(
        title: const Text(
          'Notifications',
          style: TextStyle(color: navyDeep, fontWeight: FontWeight.w800, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        shadowColor: Colors.black.withOpacity(0.08),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: navyDeep, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          // Daraz-Style Horizontal Pill Categories Bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: SizedBox(
              height: 38,
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                scrollDirection: Axis.horizontal,
                itemCount: _categories.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final label = cat['label'] as String;
                  final isSelected = _selectedCategory.toLowerCase() == label.toLowerCase();
                  final count = _getCategoryCount(label);

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedCategory = label;
                      });
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? navyDeep : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? navyDeep : const Color(0xFFE2E8F0),
                          width: 1.2,
                        ),
                        boxShadow: isSelected
                            ? [
                          BoxShadow(
                            color: navyDeep.withOpacity(0.18),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          )
                        ]
                            : null,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            cat['icon'] as IconData,
                            size: 15,
                            color: isSelected ? Colors.white : const Color(0xFF64748B),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            label,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                              color: isSelected ? Colors.white : const Color(0xFF475569),
                            ),
                          ),
                          if (count > 0) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? Colors.white.withOpacity(0.25)
                                    : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                count.toString(),
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isSelected ? Colors.white : const Color(0xFF64748B),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ),

          // Notification List Area
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
                : RefreshIndicator(
              onRefresh: _loadNotifications,
              color: const Color(0xFF2563EB),
              child: filteredList.isEmpty
                  ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  SizedBox(height: MediaQuery.of(context).size.height * 0.2),
                  Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 70,
                          height: 70,
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.notifications_off_outlined,
                            size: 32,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _selectedCategory == 'All'
                              ? 'No notifications yet'
                              : 'No $_selectedCategory notifications',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: navyDeep,
                          ),
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'We will notify you when new updates arrive.',
                          style: TextStyle(fontSize: 12.5, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                ],
              )
                  : ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                itemCount: filteredList.length,
                itemBuilder: (context, index) {
                  final notification = filteredList[index];
                  final isRead = notification['isRead'] ?? false;
                  final style = _getCategoryStyle(notification['category']);
                  final dateFormatted = _formatDateTime(notification['createdAt']);

                  // Handle multiple images from Cloudinary (comma-separated)
                  final rawImages = notification['imageUrl']?.toString() ?? '';
                  final imageUrls = rawImages
                      .split(',')
                      .map((u) => u.trim())
                      .where((u) => u.isNotEmpty)
                      .toList();

                  return GestureDetector(
                    onTap: () => _markAsRead(notification),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isRead ? const Color(0xFFE2E8F0) : (style['color'] as Color).withOpacity(0.35),
                          width: isRead ? 1 : 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: isRead
                                ? Colors.black.withOpacity(0.02)
                                : (style['color'] as Color).withOpacity(0.08),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: IntrinsicHeight(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Left category accent strip
                              Container(
                                width: 4.5,
                                color: style['color'] as Color,
                              ),
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Category chip & Date
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: style['bgColor'] as Color,
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(style['icon'] as IconData, size: 13, color: style['color'] as Color),
                                                const SizedBox(width: 4),
                                                Text(
                                                  style['label'] as String,
                                                  style: TextStyle(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.bold,
                                                    color: style['color'] as Color,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          Row(
                                            children: [
                                              if (dateFormatted.isNotEmpty)
                                                Text(
                                                  dateFormatted,
                                                  style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.w500),
                                                ),
                                              if (!isRead) ...[
                                                const SizedBox(width: 6),
                                                Container(
                                                  width: 8,
                                                  height: 8,
                                                  decoration: const BoxDecoration(
                                                    color: Color(0xFFEF4444),
                                                    shape: BoxShape.circle,
                                                  ),
                                                ),
                                              ],
                                            ],
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 10),

                                      // Notification Title
                                      Text(
                                        notification['title'] ?? 'Notification',
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: isRead ? FontWeight.w600 : FontWeight.w800,
                                          color: navyDeep,
                                          height: 1.25,
                                        ),
                                      ),
                                      const SizedBox(height: 6),

                                      // Notification Message Body
                                      Text(
                                        notification['message'] ?? '',
                                        style: const TextStyle(
                                          fontSize: 13.5,
                                          color: Color(0xFF64748B),
                                          height: 1.4,
                                        ),
                                      ),

                                      // Attached Images
                                      if (imageUrls.isNotEmpty) ...[
                                        const SizedBox(height: 12),
                                        Column(
                                          children: imageUrls.map((url) {
                                            return Container(
                                              margin: const EdgeInsets.only(bottom: 8),
                                              child: ClipRRect(
                                                borderRadius: BorderRadius.circular(10),
                                                child: Image.network(
                                                  url,
                                                  height: 160,
                                                  width: double.infinity,
                                                  fit: BoxFit.cover,
                                                  loadingBuilder: (_, child, progress) {
                                                    if (progress == null) return child;
                                                    return Container(
                                                      height: 160,
                                                      color: const Color(0xFFF1F5F9),
                                                      child: const Center(
                                                        child: CircularProgressIndicator(strokeWidth: 2),
                                                      ),
                                                    );
                                                  },
                                                  errorBuilder: (_, __, ___) => const SizedBox(),
                                                ),
                                              ),
                                            );
                                          }).toList(),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}