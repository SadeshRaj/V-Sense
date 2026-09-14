import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:file_picker/file_picker.dart';
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
  String? _stagedAttachmentUrl;
  String? _stagedFileName;
  Timer? _pollingTimer;

  static const Color navyDeep = Color(0xFF0A1930);
  static const Color accentBlue = Color(0xFF2563EB);
  static const Color backgroundLight = Color(0xFFF1F5F9);

  @override
  void initState() {
    super.initState();
    _fetchMessages();
    _pollingTimer = Timer.periodic(const Duration(milliseconds: 3500), (_) {
      _fetchMessages(isBackground: true);
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchMessages({bool isBackground = false}) async {
    try {
      final token = await _storage.read(key: 'jwt_token');
      if (token == null) return;

      final response = await http.get(
        Uri.parse('${EnvConfig.apiUrl}/support/my-messages'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        if (mounted) {
          final hadCountChanged = data.length != _messages.length;
          setState(() {
            _messages.clear();
            _messages.addAll(data);
            _isLoading = false;
          });
          if (hadCountChanged) {
            _scrollToBottom();
          }
        }
      }
    } catch (_) {
      if (mounted && !isBackground) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _pickAndUploadDocument() async {
    try {
      // v13 API: FilePicker.pickFile() is a static call (no `.platform`)
      // for single-file selection and returns PlatformFile? directly
      // (null means the user cancelled).
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
        // .bytes was removed in v13 — read lazily via readAsBytes() instead.
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
            const SnackBar(content: Text('Failed to upload attachment to Cloudinary')),
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
    final text = _messageController.text.trim();
    final attachmentUrl = _stagedAttachmentUrl;

    if ((text.isEmpty && attachmentUrl == null) || _isSending) return;

    _messageController.clear();
    setState(() {
      _isSending = true;
      _stagedAttachmentUrl = null;
      _stagedFileName = null;
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
        final newMsg = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _messages.add(newMsg);
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
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  bool _isImage(String url) {
    return url.contains('.jpg') ||
        url.contains('.jpeg') ||
        url.contains('.png') ||
        url.contains('.webp') ||
        url.contains('/image/upload/');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundLight,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 1,
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
                  width: 38,
                  height: 38,
                  decoration: const BoxDecoration(
                    color: navyDeep,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.headset_mic_rounded, color: Colors.white, size: 20),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 12),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'V-Sense Support',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: navyDeep),
                ),
                Text(
                  'Official Helpdesk • Online',
                  style: TextStyle(fontSize: 11, color: Color(0xFF10B981), fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Security Banner
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            color: const Color(0xFFEEF2F6),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.lock_outline, size: 14, color: Color(0xFF64748B)),
                SizedBox(width: 6),
                Text(
                  'End-to-end verified authority channel',
                  style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),

          // Messages
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _messages.isEmpty
                ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.chat_bubble_outline, size: 54, color: Colors.grey.shade400),
                  const SizedBox(height: 12),
                  const Text(
                    'How can we help you today?',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: navyDeep),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Send a message or attach documents for inspection.',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
            )
                : ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isUser = msg['senderType'] == 'Client';
                final attachmentUrl = msg['attachmentUrl'] as String?;

                // TIME FIX APPLIED HERE
                String timeStr = '';
                if (msg['createdAt'] != null && msg['createdAt'].toString().isNotEmpty) {
                  final rawTime = msg['createdAt'].toString();
                  final safeTimeStr = rawTime.endsWith('Z') ? rawTime : '${rawTime}Z';
                  final parsedDate = DateTime.tryParse(safeTimeStr);
                  if (parsedDate != null) {
                    timeStr = TimeOfDay.fromDateTime(parsedDate.toLocal()).format(context);
                  }
                }

                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isUser ? accentBlue : Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(18),
                        topRight: const Radius.circular(18),
                        bottomLeft: isUser ? const Radius.circular(18) : const Radius.circular(2),
                        bottomRight: isUser ? const Radius.circular(2) : const Radius.circular(18),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                      children: [
                        // Attachment View
                        if (attachmentUrl != null && attachmentUrl.isNotEmpty) ...[
                          if (_isImage(attachmentUrl))
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.network(
                                attachmentUrl,
                                fit: BoxFit.cover,
                                height: 180,
                                width: double.infinity,
                                loadingBuilder: (_, child, progress) {
                                  if (progress == null) return child;
                                  return const SizedBox(
                                    height: 180,
                                    child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                                  );
                                },
                              ),
                            )
                          else
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: isUser ? Colors.white.withOpacity(0.15) : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.description_rounded,
                                    color: isUser ? Colors.white : accentBlue,
                                    size: 24,
                                  ),
                                  const SizedBox(width: 8),
                                  Flexible(
                                    child: Text(
                                      'Attached Document',
                                      style: TextStyle(
                                        color: isUser ? Colors.white : navyDeep,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          const SizedBox(height: 6),
                        ],

                        // Text Content
                        if (msg['message'] != null && (msg['message'] as String).isNotEmpty)
                          Text(
                            msg['message'],
                            style: TextStyle(
                              color: isUser ? Colors.white : navyDeep,
                              fontSize: 14,
                              height: 1.35,
                            ),
                          ),
                        const SizedBox(height: 4),

                        // Footer
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              timeStr,
                              style: TextStyle(
                                fontSize: 10,
                                color: isUser ? Colors.white70 : Colors.grey.shade400,
                              ),
                            ),
                            if (isUser) ...[
                              const SizedBox(width: 4),
                              Icon(
                                Icons.done_all,
                                size: 13,
                                color: (msg['isReadByAdmin'] == true) ? Colors.lightBlueAccent : Colors.white60,
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Attachment Staging Preview
          if (_stagedAttachmentUrl != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Colors.blue.shade50,
              child: Row(
                children: [
                  const Icon(Icons.attach_file, size: 18, color: accentBlue),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _stagedFileName ?? 'File Ready',
                      style: const TextStyle(fontSize: 12, color: accentBlue, fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 18, color: Colors.redAccent),
                    onPressed: () => setState(() {
                      _stagedAttachmentUrl = null;
                      _stagedFileName = null;
                    }),
                  ),
                ],
              ),
            ),

          // Input Bar with Attachment Paperclip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -3),
                ),
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  // Attachment Paperclip
                  IconButton(
                    onPressed: _isUploadingAttachment ? null : _pickAndUploadDocument,
                    icon: _isUploadingAttachment
                        ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                        : const Icon(Icons.attach_file_rounded, color: Color(0xFF64748B)),
                    tooltip: 'Attach Document or Image',
                  ),

                  // Message Text Field
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: TextField(
                        controller: _messageController,
                        textCapitalization: TextCapitalization.sentences,
                        decoration: const InputDecoration(
                          hintText: 'Type your message...',
                          hintStyle: TextStyle(fontSize: 14, color: Color(0xFF94A3B8)),
                          border: InputBorder.none,
                        ),
                        onSubmitted: (_) => _sendMessage(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),

                  // Send Button
                  InkWell(
                    onTap: _sendMessage,
                    borderRadius: BorderRadius.circular(24),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(
                        color: accentBlue,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}