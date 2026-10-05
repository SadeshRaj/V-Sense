import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:signalr_netcore/signalr_client.dart';
import '../../../core/config/env_config.dart';

class SupportChatScreen extends StatefulWidget {
  const SupportChatScreen({super.key});

  @override
  State<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends State<SupportChatScreen> {
  final List<dynamic> _messages = [];
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool _isLoading = true;
  bool _isSending = false;
  bool _isUploadingAttachment = false;
  bool _showScrollDown = false;

  int _skip = 0;
  final int _take = 30;
  bool _hasMore = true;
  bool _isLoadingOlder = false;

  String _ticketStatus = "Open";

  String? _stagedAttachmentUrl;
  String? _stagedFileName;
  Map<String, dynamic>? _replyingToMessage;

  HubConnection? _hubConnection;

  static const Color navyDeep = Color(0xFF0A1930);
  static const Color accentBlue = Color(0xFF2563EB);
  static const Color backgroundLight = Color(0xFFE5E7EB);

  @override
  void initState() {
    super.initState();
    _fetchTicketStatus();
    _fetchMessages().then((_) {
      _initSignalR();
    });

    _scrollController.addListener(() {
      if (_scrollController.hasClients) {
        final isScrolledUp = _scrollController.position.pixels > 150;
        if (isScrolledUp != _showScrollDown) {
          setState(() => _showScrollDown = isScrolledUp);
        }

        if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 100 && !_isLoadingOlder && _hasMore) {
          _fetchMessages(loadMore: true);
        }
      }
    });
  }

  @override
  void dispose() {
    _hubConnection?.stop();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchTicketStatus() async {
    try {
      final token = await _storage.read(key: 'jwt_token');
      if (token == null) return;
      final res = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/support/ticket-status'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        setState(() => _ticketStatus = data['status']);
      }
    } catch (_) {}
  }

  // --- FIX FOR FLUTTER WEB JWT PADDING ---
  String _normalizeBase64(String input) {
    String output = input.replaceAll('-', '+').replaceAll('_', '/');
    switch (output.length % 4) {
      case 0:
        break;
      case 2:
        output += '==';
        break;
      case 3:
        output += '=';
        break;
      default:
        throw Exception('Illegal base64url string!');
    }
    return output;
  }

  Future<void> _initSignalR() async {
    final token = await _storage.read(key: 'jwt_token');
    if (token == null) return;

    final hubUrl = EnvConfig.apiUrl.replaceAll('/api', '/hubs/support');

    _hubConnection = HubConnectionBuilder()
        .withUrl(hubUrl, options: HttpConnectionOptions(
      accessTokenFactory: () async => token,
    ))
        .withAutomaticReconnect()
        .build();

    _hubConnection?.on("ReceiveMessage", _handleNewMessage);

    _hubConnection?.on("TicketStatusChanged", (parameters) {
      if (parameters != null && parameters.isNotEmpty) {
        setState(() {
          _ticketStatus = parameters[0].toString();
        });
      }
    });

    try {
      await _hubConnection?.start();

      final parts = token.split('.');
      if (parts.length == 3) {
        // Fix: Use correct base64 padding so it doesn't fail silently on Flutter Web
        final String payloadBase64 = _normalizeBase64(parts[1]);
        final payload = jsonDecode(utf8.decode(base64Decode(payloadBase64)));
        final userId = payload['sub'] ?? payload['nameid'] ?? payload['id'];

        if (userId != null) {
          await _hubConnection?.invoke("JoinChat", args: [userId]);
        }
      }
    } catch (e) {
      debugPrint("SignalR Connection Error: $e");
    }
  }

  void _handleNewMessage(List<dynamic>? parameters) {
    if (parameters != null && parameters.isNotEmpty) {
      final newMsg = parameters[0];

      if (_messages.any((msg) => msg['id'] == newMsg['id'])) return;

      if (mounted) {
        setState(() {
          _messages.insert(0, newMsg);
        });
        _scrollToBottom();
      }
    }
  }

  Future<void> _fetchMessages({bool loadMore = false}) async {
    if (loadMore) {
      _skip += _take;
      setState(() => _isLoadingOlder = true);
    } else {
      _skip = 0;
      _hasMore = true;
      if (mounted) setState(() => _isLoading = true);
    }

    try {
      final token = await _storage.read(key: 'jwt_token');
      if (token == null) return;

      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/support/my-messages?skip=$_skip&take=$_take'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        final reversedData = data.reversed.toList();

        if (mounted) {
          setState(() {
            if (data.length < _take) _hasMore = false;

            if (loadMore) {
              _messages.addAll(reversedData);
              _isLoadingOlder = false;
            } else {
              _messages.clear();
              _messages.addAll(reversedData);
              _isLoading = false;
            }
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() {
        _isLoading = false;
        _isLoadingOlder = false;
      });
    }
  }

  Future<void> _pickAndUploadDocument() async {
    try {
      final PlatformFile? pickedFile = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      );

      if (pickedFile == null) return;

      setState(() => _isUploadingAttachment = true);

      final token = await _storage.read(key: 'jwt_token');
      final fileName = pickedFile.name;

      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${EnvConfig.apiUrl}/support/upload-attachment'),
      );
      request.headers['Authorization'] = 'Bearer $token';

      if (kIsWeb) {
        final fileBytes = await pickedFile.readAsBytes();
        request.files.add(
          http.MultipartFile.fromBytes('file', fileBytes, filename: fileName),
        );
      } else {
        final filePath = pickedFile.path;
        if (filePath == null) throw Exception('File path is not available.');
        request.files.add(
          await http.MultipartFile.fromPath('file', filePath),
        );
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _stagedAttachmentUrl = data['url'];
          _stagedFileName = fileName;
        });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to upload attachment')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingAttachment = false);
    }
  }

  Future<void> _sendMessage() async {
    String text = _messageController.text.trim();
    final attachmentUrl = _stagedAttachmentUrl;

    if ((text.isEmpty && attachmentUrl == null) || _isSending) return;

    if (_replyingToMessage != null) {
      final replyContent = _parseReply(_replyingToMessage!['message'] ?? '');
      String quoteText = replyContent != null ? replyContent['content']! : _replyingToMessage!['message'];

      if (quoteText.trim().isEmpty) quoteText = 'Attached Document';
      text = '[REPLY_TO]$quoteText[/REPLY_TO]\n$text';
    }

    _messageController.clear();
    setState(() {
      _isSending = true;
      _stagedAttachmentUrl = null;
      _stagedFileName = null;
      _replyingToMessage = null;
      _ticketStatus = 'Open';
    });

    try {
      final token = await _storage.read(key: 'jwt_token');
      if (token == null) return;

      final response = await http.post(
        Uri.parse('${EnvConfig.apiUrl}/support/send'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'message': text,
          'attachmentUrl': attachmentUrl,
        }),
      );

      if (response.statusCode == 200) {
        final savedMsg = jsonDecode(response.body);
        if (!_messages.any((m) => m['id'] == savedMsg['id'])) {
          setState(() {
            _messages.insert(0, savedMsg);
          });
          _scrollToBottom();
        }
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          0.0,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOutCubic,
        );
      }
    });
  }

  Map<String, String>? _parseReply(String rawText) {
    final regex = RegExp(r'^\[REPLY_TO\]([\s\S]*?)\[\/REPLY_TO\]\n?([\s\S]*)$');
    final match = regex.firstMatch(rawText);
    if (match != null) {
      return { 'quote': match.group(1)!, 'content': match.group(2)! };
    }
    return null;
  }

  bool _isImage(String url) {
    return url.contains('.jpg') ||
        url.contains('.jpeg') ||
        url.contains('.png') ||
        url.contains('.webp') ||
        url.contains('/image/upload/');
  }

  DateTime? _parseDateTime(dynamic dateStr) {
    if (dateStr == null) return null;
    final rawTime = dateStr.toString();
    final safeTimeStr = rawTime.endsWith('Z') ? rawTime : '${rawTime}Z';
    return DateTime.tryParse(safeTimeStr)?.toLocal();
  }

  bool _isSameDay(DateTime? d1, DateTime? d2) {
    if (d1 == null || d2 == null) return false;
    return d1.year == d2.year && d1.month == d2.month && d1.day == d2.day;
  }

  String _getDateHeaderText(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final target = DateTime(date.year, date.month, date.day);

    if (target == today) return 'Today';
    if (target == yesterday) return 'Yesterday';

    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[date.month - 1]} ${date.day}, ${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundLight,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
        shadowColor: Colors.black12,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: navyDeep, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Stack(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: _ticketStatus == 'Resolved' ? Colors.grey.shade400 : accentBlue,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.headset_mic_rounded, color: Colors.white, size: 20),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    width: 14,
                    height: 14,
                    decoration: BoxDecoration(
                      color: _ticketStatus == 'Resolved' ? Colors.grey.shade500 : const Color(0xFF10B981),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2.5),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 14),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'V-Sense Support',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: navyDeep),
                ),
                Text(
                  _ticketStatus == 'Resolved' ? 'Ticket Resolved' : 'Official Helpdesk • Online',
                  style: TextStyle(
                      fontSize: 12,
                      color: _ticketStatus == 'Resolved' ? Colors.grey.shade600 : const Color(0xFF10B981),
                      fontWeight: FontWeight.w600
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      body: Stack(
        children: [
          Column(
            children: [
              if (_ticketStatus == 'Resolved')
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                  color: Colors.grey.shade200,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check_circle_outline, size: 16, color: Colors.grey.shade700),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          'This ticket is marked as resolved. Send a message to reopen.',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade800, fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                )
              else
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                  color: const Color(0xFFE2E8F0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.lock_outline, size: 14, color: Color(0xFF475569)),
                      const SizedBox(width: 6),
                      const Flexible(
                        child: Text(
                          'End-to-end verified authority channel',
                          style: TextStyle(fontSize: 12, color: Color(0xFF475569), fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),

              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator(color: accentBlue))
                    : _messages.isEmpty
                    ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.mark_chat_read_rounded, size: 72, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      const Text(
                        'How can we help you today?',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: navyDeep),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Send a message or attach documents.',
                        style: TextStyle(fontSize: 14, color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                )
                    : ListView.builder(
                  controller: _scrollController,
                  reverse: true,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                  itemCount: _messages.length + (_hasMore ? 1 : 0),
                  itemBuilder: (context, index) {

                    if (index == _messages.length) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 20),
                        child: Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.grey))),
                      );
                    }

                    final msg = _messages[index];
                    final isUser = msg['senderType'] == 'Client';
                    final attachmentUrl = msg['attachmentUrl'] as String?;

                    final replyData = _parseReply(msg['message'] ?? '');
                    final displayMessage = replyData != null ? replyData['content'] : msg['message'];
                    final quoteMessage = replyData?['quote'];

                    final currentMsgDate = _parseDateTime(msg['createdAt']);
                    DateTime? previousMsgDate;

                    if (index < _messages.length - 1) {
                      previousMsgDate = _parseDateTime(_messages[index + 1]['createdAt']);
                    }

                    bool showDateSeparator = false;
                    if (currentMsgDate != null) {
                      if (index == _messages.length - 1) {
                        showDateSeparator = true;
                      } else if (!_isSameDay(currentMsgDate, previousMsgDate)) {
                        showDateSeparator = true;
                      }
                    }

                    String timeStr = '';
                    if (currentMsgDate != null) {
                      timeStr = TimeOfDay.fromDateTime(currentMsgDate).format(context);
                    }

                    final radius = BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: isUser ? const Radius.circular(16) : const Radius.circular(4),
                      bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(16),
                    );

                    return Column(
                      children: [
                        if (showDateSeparator && currentMsgDate != null)
                          Container(
                            margin: const EdgeInsets.only(top: 24, bottom: 12),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              _getDateHeaderText(currentMsgDate),
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black87),
                            ),
                          ),
                        Align(
                          alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: isUser ? const Color(0xFFDCF8C6) : Colors.white,
                              borderRadius: radius,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.05),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                              children: [
                                if (quoteMessage != null)
                                  Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withOpacity(0.05),
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border(left: BorderSide(color: isUser ? const Color(0xFF128C7E) : accentBlue, width: 4)),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Replying to',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: isUser ? const Color(0xFF128C7E) : accentBlue,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          quoteMessage,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontStyle: FontStyle.italic,
                                            color: Colors.black87,
                                          ),
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),

                                if (attachmentUrl != null && attachmentUrl.isNotEmpty) ...[
                                  if (_isImage(attachmentUrl))
                                    GestureDetector(
                                      onTap: () {
                                        Navigator.push(context, MaterialPageRoute(
                                          builder: (_) => Scaffold(
                                            backgroundColor: Colors.black,
                                            appBar: AppBar(backgroundColor: Colors.black, iconTheme: const IconThemeData(color: Colors.white), elevation: 0),
                                            body: Center(
                                              child: InteractiveViewer(
                                                panEnabled: true,
                                                minScale: 0.5,
                                                maxScale: 4.0,
                                                child: Image.network(attachmentUrl, fit: BoxFit.contain, width: double.infinity, height: double.infinity),
                                              ),
                                            ),
                                          ),
                                        ));
                                      },
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(12),
                                        child: Image.network(
                                          attachmentUrl,
                                          fit: BoxFit.cover,
                                          height: 200,
                                          width: double.infinity,
                                          loadingBuilder: (_, child, progress) {
                                            if (progress == null) return child;
                                            return const SizedBox(height: 200, child: Center(child: CircularProgressIndicator(strokeWidth: 2)));
                                          },
                                        ),
                                      ),
                                    )
                                  else
                                    GestureDetector(
                                      onTap: () async {
                                        final cleanUrl = attachmentUrl.replaceAll('/raw/upload/fl_attachment/', '/raw/upload/').replaceAll('/fl_attachment/', '/');
                                        final url = Uri.parse(cleanUrl);
                                        if (await canLaunchUrl(url)) {
                                          await launchUrl(url, mode: LaunchMode.inAppBrowserView);
                                        }
                                      },
                                      child: Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: Colors.black.withOpacity(0.04),
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(color: Colors.black12),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.insert_drive_file_rounded, color: isUser ? const Color(0xFF128C7E) : accentBlue, size: 28),
                                            const SizedBox(width: 10),
                                            Flexible(
                                              child: Text(
                                                'View Document',
                                                style: TextStyle(color: navyDeep, fontWeight: FontWeight.bold, fontSize: 13),
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Icon(Icons.open_in_new, color: navyDeep, size: 14),
                                          ],
                                        ),
                                      ),
                                    ),
                                  const SizedBox(height: 8),
                                ],

                                if (displayMessage != null && (displayMessage as String).isNotEmpty)
                                  Text(
                                    displayMessage,
                                    style: const TextStyle(
                                      color: Colors.black87,
                                      fontSize: 15,
                                      height: 1.3,
                                    ),
                                  ),
                                const SizedBox(height: 6),

                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    GestureDetector(
                                      onTap: () => setState(() => _replyingToMessage = msg),
                                      child: Row(
                                        children: [
                                          Icon(Icons.reply_rounded, size: 14, color: Colors.black54),
                                          const SizedBox(width: 4),
                                          Text(
                                              'Reply',
                                              style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.bold,
                                                  color: Colors.black54
                                              )
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Text(
                                      timeStr,
                                      style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w500),
                                    ),
                                    if (isUser) ...[
                                      const SizedBox(width: 4),
                                      Icon(
                                        Icons.done_all,
                                        size: 16,
                                        color: (msg['isReadByAdmin'] == true) ? const Color(0xFF34B7F1) : Colors.black38,
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),

              if (_replyingToMessage != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    border: Border(top: BorderSide(color: Colors.grey.shade300)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(color: accentBlue.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                        child: Icon(Icons.reply_rounded, color: accentBlue, size: 22),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Replying to message',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: accentBlue),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _parseReply(_replyingToMessage!['message'] ?? '')?['content'] ?? _replyingToMessage!['message'] ?? 'Attached Document',
                              style: TextStyle(fontSize: 13, color: Colors.grey.shade700, fontStyle: FontStyle.italic),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 24, color: Colors.grey),
                        onPressed: () => setState(() => _replyingToMessage = null),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ),

              if (_stagedAttachmentUrl != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    border: Border(top: BorderSide(color: Colors.blue.shade200)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.attach_file_rounded, size: 22, color: accentBlue),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _stagedFileName ?? 'File Ready',
                          style: const TextStyle(fontSize: 13, color: accentBlue, fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => setState(() {
                          _stagedAttachmentUrl = null;
                          _stagedFileName = null;
                        }),
                        child: const Icon(Icons.cancel_rounded, size: 24, color: Colors.redAccent),
                      ),
                    ],
                  ),
                ),

              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                decoration: const BoxDecoration(
                  color: Colors.white,
                ),
                child: SafeArea(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Container(
                          constraints: const BoxConstraints(maxHeight: 120),
                          padding: const EdgeInsets.only(left: 4, right: 16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(28),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              IconButton(
                                onPressed: _isUploadingAttachment ? null : _pickAndUploadDocument,
                                icon: _isUploadingAttachment
                                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5))
                                    : const Icon(Icons.add_circle_outline_rounded, color: Color(0xFF64748B), size: 28),
                                tooltip: 'Attach',
                                padding: const EdgeInsets.only(bottom: 10, left: 4),
                                constraints: const BoxConstraints(),
                              ),
                              Expanded(
                                child: TextField(
                                  controller: _messageController,
                                  textCapitalization: TextCapitalization.sentences,
                                  maxLines: null,
                                  keyboardType: TextInputType.multiline,
                                  decoration: InputDecoration(
                                    hintText: _ticketStatus == 'Resolved' ? 'Type to reopen...' : 'Message',
                                    hintStyle: const TextStyle(fontSize: 16, color: Color(0xFF94A3B8)),
                                    border: InputBorder.none,
                                    contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      Container(
                        margin: const EdgeInsets.only(bottom: 2),
                        child: InkWell(
                          onTap: _sendMessage,
                          borderRadius: BorderRadius.circular(28),
                          child: Container(
                            width: 50,
                            height: 50,
                            decoration: const BoxDecoration(
                                color: Color(0xFF128C7E),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
                                ]
                            ),
                            child: const Icon(Icons.send_rounded, color: Colors.white, size: 22),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          if (_showScrollDown)
            Positioned(
              right: 16,
              bottom: 90,
              child: FloatingActionButton(
                mini: true,
                backgroundColor: Colors.white,
                foregroundColor: accentBlue,
                elevation: 4,
                onPressed: _scrollToBottom,
                child: const Icon(Icons.keyboard_double_arrow_down_rounded, size: 24),
              ),
            ),
        ],
      ),
    );
  }
}