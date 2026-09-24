import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:signalr_netcore/signalr_client.dart'; // NEW: SignalR Client
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

  String? _stagedAttachmentUrl;
  String? _stagedFileName;
  Map<String, dynamic>? _replyingToMessage;

  HubConnection? _hubConnection;

  static const Color navyDeep = Color(0xFF0A1930);
  static const Color accentBlue = Color(0xFF2563EB);
  static const Color backgroundLight = Color(0xFFF8FAFC);

  @override
  void initState() {
    super.initState();
    _fetchMessages().then((_) {
      _initSignalR();
    });

    _scrollController.addListener(() {
      if (_scrollController.hasClients) {
        final isScrolledUp = _scrollController.position.pixels < _scrollController.position.maxScrollExtent - 150;
        if (isScrolledUp != _showScrollDown) {
          setState(() => _showScrollDown = isScrolledUp);
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

  Future<void> _initSignalR() async {
    final token = await _storage.read(key: 'jwt_token');
    if (token == null) return;

    // Convert API URL to Hub URL (e.g., http://localhost:5000/api -> http://localhost:5000/hubs/support)
    final hubUrl = EnvConfig.apiUrl.replaceAll('/api', '/hubs/support');

    _hubConnection = HubConnectionBuilder()
        .withUrl(hubUrl, options: HttpConnectionOptions(
      accessTokenFactory: () async => token,
    ))
        .withAutomaticReconnect()
        .build();

    _hubConnection?.on("ReceiveMessage", _handleNewMessage);

    try {
      await _hubConnection?.start();

      // Parse token to get UserId (Assuming standard JWT structure)
      final parts = token.split('.');
      if (parts.length == 3) {
        final payload = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))));
        final userId = payload['sub'] ?? payload['nameid'] ?? payload['id'];

        // Instruct the Hub we are opening the chat room
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

      // Prevent duplicates if REST API was slightly faster
      if (_messages.any((msg) => msg['id'] == newMsg['id'])) return;

      if (mounted) {
        setState(() {
          _messages.add(newMsg);
        });
        _scrollToBottom();
      }
    }
  }

  Future<void> _fetchMessages() async {
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
          setState(() {
            _messages.clear();
            _messages.addAll(data);
            _isLoading = false;
          });
          _scrollToBottom();
        }
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
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
    });

    try {
      final token = await _storage.read(key: 'jwt_token');
      if (token == null) return;

      await http.post(
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

      // SignalR handle appending the message to the list!
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(const Duration(milliseconds: 150), () {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 400),
            curve: Curves.easeOutCubic,
          );
        }
      });
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
                  width: 38,
                  height: 38,
                  decoration: const BoxDecoration(
                    color: navyDeep,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.headset_mic_rounded, color: Colors.white, size: 18),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    width: 12,
                    height: 12,
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
      body: Stack(
        children: [
          Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                color: const Color(0xFFEEF2F6),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.lock_outline, size: 14, color: Color(0xFF64748B)),
                    const SizedBox(width: 6),
                    Flexible(
                      child: const Text(
                        'End-to-end verified authority channel',
                        style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
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
                      Icon(Icons.mark_chat_read_rounded, size: 64, color: Colors.grey.shade300),
                      const SizedBox(height: 16),
                      const Text(
                        'How can we help you today?',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: navyDeep),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Send a message or attach documents.',
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
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

                    final replyData = _parseReply(msg['message'] ?? '');
                    final displayMessage = replyData != null ? replyData['content'] : msg['message'];
                    final quoteMessage = replyData?['quote'];

                    String timeStr = '';
                    if (msg['createdAt'] != null && msg['createdAt'].toString().isNotEmpty) {
                      final rawTime = msg['createdAt'].toString();
                      final safeTimeStr = rawTime.endsWith('Z') ? rawTime : '${rawTime}Z';
                      final parsedDate = DateTime.tryParse(safeTimeStr);
                      if (parsedDate != null) {
                        timeStr = TimeOfDay.fromDateTime(parsedDate.toLocal()).format(context);
                      }
                    }

                    final radius = BorderRadius.only(
                      topLeft: const Radius.circular(20),
                      topRight: const Radius.circular(20),
                      bottomLeft: isUser ? const Radius.circular(20) : const Radius.circular(4),
                      bottomRight: isUser ? const Radius.circular(4) : const Radius.circular(20),
                    );

                    return Align(
                      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: isUser ? accentBlue : Colors.white,
                          borderRadius: radius,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.04),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                          children: [
                            if (quoteMessage != null)
                              Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: isUser ? Colors.white.withOpacity(0.2) : Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border(left: BorderSide(color: isUser ? Colors.white54 : accentBlue, width: 3)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Replying to:',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: isUser ? Colors.white : accentBlue,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      quoteMessage,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontStyle: FontStyle.italic,
                                        color: isUser ? Colors.white.withOpacity(0.9) : Colors.black87,
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
                                      height: 180,
                                      width: double.infinity,
                                      loadingBuilder: (_, child, progress) {
                                        if (progress == null) return child;
                                        return const SizedBox(height: 180, child: Center(child: CircularProgressIndicator(strokeWidth: 2)));
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
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: isUser ? Colors.white.withOpacity(0.15) : const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.description_rounded, color: isUser ? Colors.white : accentBlue, size: 24),
                                        const SizedBox(width: 8),
                                        Flexible(
                                          child: Text(
                                            'View Document',
                                            style: TextStyle(color: isUser ? Colors.white : navyDeep, fontWeight: FontWeight.bold, fontSize: 12),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        Icon(Icons.open_in_new, color: isUser ? Colors.white : navyDeep, size: 12),
                                      ],
                                    ),
                                  ),
                                ),
                              const SizedBox(height: 6),
                            ],

                            if (displayMessage != null && (displayMessage as String).isNotEmpty)
                              Text(
                                displayMessage,
                                style: TextStyle(
                                  color: isUser ? Colors.white : navyDeep,
                                  fontSize: 14.5,
                                  height: 1.35,
                                ),
                              ),
                            const SizedBox(height: 4),

                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  timeStr,
                                  style: TextStyle(fontSize: 10, color: isUser ? Colors.white.withOpacity(0.8) : Colors.grey.shade500),
                                ),
                                if (isUser) ...[
                                  const SizedBox(width: 4),
                                  Icon(
                                    Icons.done_all,
                                    size: 14,
                                    color: (msg['isReadByAdmin'] == true) ? const Color(0xFF60A5FA) : Colors.white60,
                                  ),
                                ],
                                const SizedBox(width: 8),
                                GestureDetector(
                                  onTap: () => setState(() => _replyingToMessage = msg),
                                  child: Row(
                                    children: [
                                      Icon(Icons.reply_rounded, size: 12, color: isUser ? Colors.white70 : accentBlue),
                                      const SizedBox(width: 2),
                                      Text(
                                          'Reply',
                                          style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: isUser ? Colors.white70 : accentBlue
                                          )
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              if (_replyingToMessage != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border(top: BorderSide(color: Colors.grey.shade200)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.reply_rounded, color: accentBlue, size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Replying to message',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: accentBlue),
                            ),
                            Text(
                              _parseReply(_replyingToMessage!['message'] ?? '')?['content'] ?? _replyingToMessage!['message'] ?? 'Attached Document',
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 20, color: Colors.grey),
                        onPressed: () => setState(() => _replyingToMessage = null),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ),

              if (_stagedAttachmentUrl != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    border: Border(top: BorderSide(color: Colors.blue.shade100)),
                  ),
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
                      GestureDetector(
                        onTap: () => setState(() {
                          _stagedAttachmentUrl = null;
                          _stagedFileName = null;
                        }),
                        child: const Icon(Icons.close, size: 20, color: Colors.redAccent),
                      ),
                    ],
                  ),
                ),

              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 15,
                      offset: const Offset(0, -5),
                    ),
                  ],
                ),
                child: SafeArea(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        margin: const EdgeInsets.only(right: 8, bottom: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: IconButton(
                          onPressed: _isUploadingAttachment ? null : _pickAndUploadDocument,
                          icon: _isUploadingAttachment
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Icon(Icons.add_rounded, color: Color(0xFF64748B), size: 26),
                          tooltip: 'Attach Document',
                          constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                          padding: EdgeInsets.zero,
                        ),
                      ),

                      Expanded(
                        child: Container(
                          constraints: const BoxConstraints(maxHeight: 120),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: Colors.transparent),
                          ),
                          child: TextField(
                            controller: _messageController,
                            textCapitalization: TextCapitalization.sentences,
                            maxLines: null,
                            keyboardType: TextInputType.multiline,
                            decoration: const InputDecoration(
                              hintText: 'Type your message...',
                              hintStyle: TextStyle(fontSize: 15, color: Color(0xFF94A3B8)),
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      Container(
                        margin: const EdgeInsets.only(bottom: 2),
                        child: InkWell(
                          onTap: _sendMessage,
                          borderRadius: BorderRadius.circular(24),
                          child: Container(
                            width: 44,
                            height: 44,
                            decoration: const BoxDecoration(
                                gradient: LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF2563EB)]),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(color: Color(0xFF2563EB), blurRadius: 8, spreadRadius: -2, offset: Offset(0, 4)),
                                ]
                            ),
                            child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
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
                child: const Icon(Icons.keyboard_arrow_down_rounded, size: 28),
              ),
            ),
        ],
      ),
    );
  }
}